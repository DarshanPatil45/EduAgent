"""
LangGraph state machine for the adaptive quiz flow.

Nodes:
  generate_initial   → generates the first batch of questions
  evaluate_answer    → evaluates one submitted answer
  check_adaptive     → decides if adaptation is needed
  generate_adaptive  → generates easier remediation questions
  teach_concept      → generates teaching moment before adaptive questions
  track_progress     → writes attempt to MongoDB + updates weak_topics
  generate_report    → builds final performance report

Flow:
  generate_initial
       ↓
  [student answers loop]
       ↓
  evaluate_answer → check_adaptive → (if needed) teach_concept → generate_adaptive
       ↓                                     ↓
  track_progress ←──────────────────────────←┘
       ↓
  (more questions?) → generate_report
"""

from typing import TypedDict, List, Optional
from langgraph.graph import StateGraph, END
from datetime import datetime, timezone
from database.connection import get_db
from agents.quiz_engine.generator import generate_questions, get_context_for_documents
from agents.quiz_engine.evaluator import evaluate_answer, calculate_confidence
from agents.quiz_engine.adaptive import (
    analyze_performance,
    should_trigger_adaptive,
    generate_adaptive_questions,
    generate_teaching_moment,
    is_concept_mastered,
)
from agents.quiz_engine.report import generate_report
from core.logger import get_logger
import uuid

logger = get_logger(__name__)

class QuizState(TypedDict):
    # Session context
    session_id: str
    user_id: str
    document_filenames: List[str]
    difficulty: str
    question_types: List[str]
    total_questions_requested: int
    context: str

    # Question bank
    questions: List[dict]           # all questions for this session
    current_question_index: int
    adaptive_questions: List[dict]  # remediation questions injected mid-session
    teaching_moment: Optional[str]

    # Current answer being processed
    current_question_id: Optional[str]
    current_answer: Optional[str]
    current_time_taken: int

    # Attempts history
    attempts: List[dict]

    # Adaptive state
    adaptive_triggered: bool
    weak_topics: List[str]
    adaptive_complete: bool

    # Output
    current_feedback: Optional[dict]
    next_action: str                # next_question | adaptive_triggered | quiz_complete
    report: Optional[dict]
    error: Optional[str]

# ─── Node: Generate Initial Questions ─────────────────────────────────────────

async def generate_initial_node(state: QuizState) -> QuizState:
    logger.info("Generating initial questions — session=%s", state["session_id"])
    context = await get_context_for_documents(state["document_filenames"])
    state["context"] = context

    questions = await generate_questions(
        context=context,
        count=state["total_questions_requested"],
        difficulty=state["difficulty"],
        question_types=state["question_types"],
    )

    for i, q in enumerate(questions):
        q["_id"] = str(uuid.uuid4())
        q["session_id"] = state["session_id"]
        q["user_id"] = state["user_id"]
        q["is_adaptive"] = False
        q["order"] = i
        q.setdefault("options", None)
        q.setdefault("page_reference", None)

    # Persist questions to MongoDB
    db = get_db()
    if questions:
        await db.quiz_questions.insert_many(questions)

    state["questions"] = questions
    state["current_question_index"] = 0
    logger.info("Stored %d questions", len(questions))
    return state

# ─── Node: Evaluate Answer ─────────────────────────────────────────────────────

async def evaluate_answer_node(state: QuizState) -> QuizState:
    question_id = state["current_question_id"]
    user_answer = state["current_answer"]
    time_taken = state["current_time_taken"]

    # First try to find the question in the in-memory state
    all_questions = state["questions"] + state.get("adaptive_questions", [])
    question = next((q for q in all_questions if q["_id"] == question_id), None)

    # Fall back to loading from MongoDB — this is the common case when answer
    # submission happens in a separate graph invocation from question generation
    if not question:
        db = get_db()
        question = await db.quiz_questions.find_one({"_id": question_id})

    if not question:
        logger.error("Question %s not found in state or DB", question_id)
        state["error"] = "Question not found"
        return state

    # Populate context from DB if empty (cross-invocation case)
    context = state.get("context", "")
    if not context and state.get("document_filenames"):
        from agents.quiz_engine.generator import get_context_for_documents
        context = await get_context_for_documents(state["document_filenames"])
        state["context"] = context

    feedback = await evaluate_answer(
        question_text=question["question_text"],
        question_type=question["question_type"],
        correct_answer=question["correct_answer"],
        user_answer=user_answer,
        context=context[:3000],
        topic=question.get("topic", "General"),
        concept=question.get("concept", ""),
    )

    confidence = calculate_confidence(
        is_correct=feedback["is_correct"],
        time_taken_seconds=time_taken,
        difficulty=question.get("difficulty", "medium"),
        question_type=question["question_type"],
    )

    attempt = {
        "_id": str(uuid.uuid4()),
        "session_id": state["session_id"],
        "question_id": question_id,
        "user_id": state["user_id"],
        "user_answer": user_answer,
        "is_correct": feedback["is_correct"],
        "confidence": confidence,
        "time_taken_seconds": time_taken,
        "difficulty": question.get("difficulty", "medium"),
        "topic": feedback.get("topic", question.get("topic", "General")),
        "concept": feedback.get("concept", question.get("concept", "")),
        "feedback": {
            "correct_answer": feedback["correct_answer"],
            "explanation": feedback["explanation"],
            "why_wrong": feedback.get("why_wrong"),
            "real_world_example": feedback.get("real_world_example", ""),
            "memory_trick": feedback.get("memory_trick", ""),
            "related_concepts": feedback.get("related_concepts", []),
            "page_reference": question.get("page_reference"),
        },
        "created_at": datetime.now(timezone.utc),
    }

    db = get_db()
    await db.quiz_attempts.insert_one(attempt)

    state["attempts"] = state.get("attempts", []) + [attempt]
    state["current_feedback"] = feedback
    state["current_feedback"]["confidence"] = confidence
    state["current_feedback"]["attempt_id"] = attempt["_id"]
    return state


# ─── Node: Check Adaptive ─────────────────────────────────────────────────────

async def check_adaptive_node(state: QuizState) -> QuizState:
    triggered, weak_topics = should_trigger_adaptive(state.get("attempts", []))

    if triggered and not state.get("adaptive_triggered", False):
        logger.info("Adaptive triggered — weak topics: %s", weak_topics)
        state["adaptive_triggered"] = True
        state["weak_topics"] = weak_topics
        state["next_action"] = "adaptive_triggered"
    else:
        # Check if quiz is complete
        total_answered = len(state.get("attempts", []))
        total_available = len(state["questions"]) + len(state.get("adaptive_questions", []))

        if total_answered >= total_available:
            state["next_action"] = "quiz_complete"
        else:
            state["next_action"] = "next_question"
            state["current_question_index"] = state.get("current_question_index", 0) + 1

    return state

# ─── Node: Teach Concept ──────────────────────────────────────────────────────

async def teach_concept_node(state: QuizState) -> QuizState:
    weak_topics = state.get("weak_topics", [])
    if not weak_topics:
        return state

    # Get wrong concepts from recent attempts
    recent_attempts = state.get("attempts", [])[-6:]
    wrong_concepts = [
        a["concept"] for a in recent_attempts
        if not a.get("is_correct") and a.get("topic") in weak_topics
    ]

    teaching_moment = await generate_teaching_moment(
        topic=weak_topics[0],
        wrong_concepts=wrong_concepts,
    )
    state["teaching_moment"] = teaching_moment
    logger.info("Teaching moment generated for topic: %s", weak_topics[0])
    return state

# ─── Node: Generate Adaptive ──────────────────────────────────────────────────

async def generate_adaptive_node(state: QuizState) -> QuizState:
    weak_topics = state.get("weak_topics", [])
    recent_attempts = state.get("attempts", [])[-9:]
    wrong_concepts = list({
        a["concept"] for a in recent_attempts
        if not a.get("is_correct") and a.get("topic") in weak_topics
    })

    questions = await generate_adaptive_questions(
        context=state["context"],
        weak_topics=weak_topics,
        current_difficulty=state["difficulty"],
        wrong_concepts=wrong_concepts,
    )

    # Query DB for the actual highest order value to ensure contiguous ordering
    db = get_db()
    existing = await db.quiz_questions.find(
        {"session_id": state["session_id"]},
        projection={"order": 1},
    ).sort("order", -1).limit(1).to_list(length=1)
    next_order = (existing[0]["order"] + 1) if existing else 0

    for i, q in enumerate(questions):
        q["_id"] = str(uuid.uuid4())
        q["session_id"] = state["session_id"]
        q["user_id"] = state["user_id"]
        q.setdefault("options", None)
        q.setdefault("page_reference", None)
        q["order"] = next_order + i

    if questions:
        await db.quiz_questions.insert_many(questions)

    state["adaptive_questions"] = state.get("adaptive_questions", []) + questions
    logger.info("Generated %d adaptive questions (starting order=%d)", len(questions), next_order)
    return state

# ─── Node: Track Progress ─────────────────────────────────────────────────────

async def track_progress_node(state: QuizState) -> QuizState:
    attempts = state.get("attempts", [])
    if not attempts:
        return state

    db = get_db()
    now = datetime.now(timezone.utc)

    # Update weak_topics collection
    from agents.quiz_engine.adaptive import analyze_performance
    topic_performance = analyze_performance(attempts)

    for topic, data in topic_performance.items():
        await db.weak_topics.update_one(
            {"user_id": state["user_id"], "topic": topic},
            {
                "$set": {
                    "topic": topic,       # always keep consistent
                    "concept": topic,     # mirror for progress.py fallback
                    "accuracy": data["accuracy"],
                    "last_seen": now,
                    "mastered": is_concept_mastered(data),
                },
                "$inc": {
                    "wrong_count": data["total"] - data["correct"],
                    "total_attempts": data["total"],
                },
                "$setOnInsert": {"_id": str(uuid.uuid4())},
            },
            upsert=True,
        )

    # Log to study_history
    await db.study_history.insert_one({
        "_id": str(uuid.uuid4()),
        "user_id": state["user_id"],
        "session_id": state["session_id"],
        "event": "adaptive_triggered" if state.get("adaptive_triggered") else "answer_submitted",
        "metadata": {"weak_topics": state.get("weak_topics", [])},
        "created_at": now,
    })

    return state

# ─── Node: Generate Report ────────────────────────────────────────────────────

async def generate_report_node(state: QuizState) -> QuizState:
    db = get_db()
    now = datetime.now(timezone.utc)

    session = await db.quiz_sessions.find_one({"_id": state["session_id"]})
    time_started = session.get("time_started", now) if session else now

    report = await generate_report(
        session_id=state["session_id"],
        attempts=state.get("attempts", []),
        time_started=time_started,
        time_completed=now,
    )

    # Persist report + close session
    await db.quiz_sessions.update_one(
        {"_id": state["session_id"]},
        {"$set": {"status": "completed", "time_completed": now, "report": report, "score": report["overall_score"]}},
    )

    # Log study_history
    await db.study_history.insert_one({
        "_id": str(uuid.uuid4()),
        "user_id": state["user_id"],
        "session_id": state["session_id"],
        "event": "quiz_completed",
        "metadata": {"score": report["overall_score"]},
        "created_at": now,
    })

    state["report"] = report
    state["next_action"] = "quiz_complete"
    logger.info("Quiz completed — session=%s score=%s", state["session_id"], report["overall_score"])
    return state

# ─── Routing ──────────────────────────────────────────────────────────────────

def route_after_check(state: QuizState) -> str:
    action = state.get("next_action", "next_question")
    if action == "quiz_complete":
        return "generate_report"
    if action == "adaptive_triggered":
        return "teach_concept"
    return "track_progress"

def route_entry(state: QuizState) -> str:
    if state.get("current_question_id"):
        return "evaluate_answer"
    return "generate_initial"


# ─── Build Graph ──────────────────────────────────────────────────────────────

def build_quiz_graph():
    graph = StateGraph(QuizState)

    graph.add_node("generate_initial", generate_initial_node)
    graph.add_node("evaluate_answer", evaluate_answer_node)
    graph.add_node("check_adaptive", check_adaptive_node)
    graph.add_node("teach_concept", teach_concept_node)
    graph.add_node("generate_adaptive", generate_adaptive_node)
    graph.add_node("track_progress", track_progress_node)
    graph.add_node("generate_report", generate_report_node)

    graph.set_conditional_entry_point(
        route_entry,
        {
            "generate_initial": "generate_initial",
            "evaluate_answer": "evaluate_answer",
        }
    )
    graph.add_edge("generate_initial", END)

    # Answer submission subgraph
    graph.add_edge("evaluate_answer", "check_adaptive")
    graph.add_conditional_edges(
        "check_adaptive",
        route_after_check,
        {
            "teach_concept": "teach_concept",
            "track_progress": "track_progress",
            "generate_report": "generate_report",
        },
    )
    graph.add_edge("teach_concept", "generate_adaptive")
    graph.add_edge("generate_adaptive", "track_progress")
    graph.add_edge("track_progress", END)
    graph.add_edge("generate_report", END)

    return graph.compile()


quiz_graph = build_quiz_graph()