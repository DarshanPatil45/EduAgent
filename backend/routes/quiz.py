import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from database.connection import get_db
from core.auth import get_current_user
from core.logger import get_logger
from agents.quiz_engine.graph import quiz_graph
from models.quiz_schemas import (
    StartQuizRequest, QuizSessionResponse,
    QuizQuestionResponse, SubmitAnswerRequest,
    SubmitAnswerResponse, AnswerFeedback,
    NextQuestionResponse, QuizReportResponse, PerformanceReport,
)

router = APIRouter(prefix="/quiz", tags=["quiz"])
logger = get_logger(__name__)

# ─── Start Quiz ────────────────────────────────────────────────────────────────

@router.post("/start", response_model=QuizSessionResponse)
async def start_quiz(
    request: StartQuizRequest,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()

    # Verify documents belong to user
    for doc_id in request.document_ids:
        doc = await db.documents.find_one({
            "_id": doc_id,
            "user_id": current_user["_id"],
        })
        if not doc:
            raise HTTPException(status_code=404, detail=f"Document {doc_id} not found.")

    # Get filenames for ChromaDB lookup
    doc_cursor = db.documents.find({"_id": {"$in": request.document_ids}})
    documents = await doc_cursor.to_list(length=20)
    filenames = [d["filename"] for d in documents]

    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    session = {
        "_id": session_id,
        "user_id": current_user["_id"],
        "document_ids": request.document_ids,
        "document_filenames": filenames,
        "difficulty": request.difficulty,
        "question_types": request.question_types,
        "total_questions_requested": request.total_questions,
        "status": "active",
        "current_phase": "initial",
        "score": 0,
        "avg_confidence": 0,
        "time_started": now,
        "time_completed": None,
        "report": None,
        "created_at": now,
    }
    await db.quiz_sessions.insert_one(session)

    # Run graph to generate initial questions
    try:
        await quiz_graph.ainvoke({
            "session_id": session_id,
            "user_id": current_user["_id"],
            "document_filenames": filenames,
            "difficulty": request.difficulty,
            "question_types": request.question_types,
            "total_questions_requested": request.total_questions,
            "context": "",
            "questions": [],
            "current_question_index": 0,
            "adaptive_questions": [],
            "teaching_moment": None,
            "current_question_id": None,
            "current_answer": None,
            "current_time_taken": 0,
            "attempts": [],
            "adaptive_triggered": False,
            "weak_topics": [],
            "adaptive_complete": False,
            "current_feedback": None,
            "next_action": "next_question",
            "report": None,
            "error": None,
        })
    except Exception as e:
        logger.error("Quiz graph failed: %s", e)
        await db.quiz_sessions.update_one(
            {"_id": session_id},
            {"$set": {"status": "abandoned"}}
        )
        raise HTTPException(status_code=503, detail="Failed to generate quiz questions.")

    return QuizSessionResponse(
        session_id=session_id,
        status="active",
        current_phase="initial",
        total_questions=request.total_questions,
        difficulty=request.difficulty,
        created_at=now,
    )

# ─── Get Next Question ────────────────────────────────────────────────────────

@router.get("/question/{session_id}", response_model=NextQuestionResponse)
async def get_next_question(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()

    session = await db.quiz_sessions.find_one({
        "_id": session_id,
        "user_id": current_user["_id"],
    })
    if not session:
        raise HTTPException(status_code=404, detail="Quiz session not found.")
    if session["status"] == "completed":
        return NextQuestionResponse(session_complete=True, message="Quiz already completed.")

    # Count answered questions
    answered_count = await db.quiz_attempts.count_documents({"session_id": session_id})

    # Get all questions for this session ordered by `order`
    q_cursor = db.quiz_questions.find(
        {"session_id": session_id},
        sort=[("order", 1)],
    )
    all_questions = await q_cursor.to_list(length=100)

    if answered_count >= len(all_questions):
        return NextQuestionResponse(
            session_complete=True,
            message="All questions answered. Fetch your report.",
        )

    q = all_questions[answered_count]
    return NextQuestionResponse(
        question=QuizQuestionResponse(
            question_id=q["_id"],
            question_text=q["question_text"],
            question_type=q["question_type"],
            difficulty=q["difficulty"],
            topic=q.get("topic", "General"),
            options=q.get("options"),
            order=answered_count,
            total_in_session=len(all_questions),
        ),
        adaptive_triggered=q.get("is_adaptive", False),
        message=session.get("teaching_moment") if q.get("is_adaptive") else None,
    )

# ─── Submit Answer ────────────────────────────────────────────────────────────

@router.post("/answer", response_model=SubmitAnswerResponse)
async def submit_answer(
    request: SubmitAnswerRequest,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()

    session = await db.quiz_sessions.find_one({
        "_id": request.session_id,
        "user_id": current_user["_id"],
    })
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if session["status"] == "completed":
        raise HTTPException(status_code=400, detail="Quiz already completed.")

    question = await db.quiz_questions.find_one({
        "_id": request.question_id,
        "session_id": request.session_id,
    })
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")

    # Load previous attempts for adaptive check
    attempts_cursor = db.quiz_attempts.find({"session_id": request.session_id})
    existing_attempts = await attempts_cursor.to_list(length=100)

    # Load all questions for this session to pass to the evaluation state machine
    questions_cursor = db.quiz_questions.find({"session_id": request.session_id})
    all_session_questions = await questions_cursor.to_list(length=100)
    initial_questions = [q for q in all_session_questions if not q.get("is_adaptive")]
    adaptive_questions = [q for q in all_session_questions if q.get("is_adaptive")]

    # Run evaluate + adaptive check via graph
    try:
        result = await quiz_graph.ainvoke({
            "session_id": request.session_id,
            "user_id": current_user["_id"],
            "document_filenames": session.get("document_filenames", []),
            "difficulty": session["difficulty"],
            "question_types": session["question_types"],
            "total_questions_requested": session["total_questions_requested"],
            "context": "",
            "questions": initial_questions,
            "current_question_index": len(existing_attempts),
            "adaptive_questions": adaptive_questions,
            "teaching_moment": session.get("teaching_moment"),
            "current_question_id": request.question_id,
            "current_answer": request.user_answer,
            "current_time_taken": request.time_taken_seconds,
            "attempts": existing_attempts,
            "adaptive_triggered": session.get("adaptive_triggered", False),
            "weak_topics": session.get("weak_topics", []),
            "adaptive_complete": False,
            "current_feedback": None,
            "next_action": "next_question",
            "report": None,
            "error": None,
        }, config={"recursion_limit": 5})
    except Exception as e:
        logger.error("Answer evaluation failed: %s", e)
        raise HTTPException(status_code=503, detail="Evaluation failed. Please try again.")

    feedback_data = result.get("current_feedback", {})
    next_action = result.get("next_action", "next_question")
    adaptive_triggered = result.get("adaptive_triggered", False)

    # Persist adaptive state to session
    if adaptive_triggered:
        teaching_moment = result.get("teaching_moment")
        await db.quiz_sessions.update_one(
            {"_id": request.session_id},
            {"$set": {
                "adaptive_triggered": True,
                "weak_topics": result.get("weak_topics", []),
                "current_phase": "adaptive",
                "teaching_moment": teaching_moment,
            }}
        )

    return SubmitAnswerResponse(
        attempt_id=feedback_data.get("attempt_id", ""),
        feedback=AnswerFeedback(
            is_correct=feedback_data.get("is_correct", False),
            correct_answer=feedback_data.get("correct_answer", ""),
            explanation=feedback_data.get("explanation", ""),
            why_wrong=feedback_data.get("why_wrong"),
            real_world_example=feedback_data.get("real_world_example", ""),
            memory_trick=feedback_data.get("memory_trick", ""),
            related_concepts=feedback_data.get("related_concepts", []),
            page_reference=feedback_data.get("page_reference"),
            topic=feedback_data.get("topic", "General"),
            concept=feedback_data.get("concept", ""),
        ),
        session_status="active",
        next_action=next_action,
        adaptive_message=result.get("teaching_moment") if adaptive_triggered else None,
    )

# ─── Complete Quiz + Report ───────────────────────────────────────────────────

@router.post("/complete/{session_id}", response_model=QuizReportResponse)
async def complete_quiz(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    session = await db.quiz_sessions.find_one({
        "_id": session_id,
        "user_id": current_user["_id"],
    })
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    # Return cached report if already completed
    if session.get("report"):
        return QuizReportResponse(report=PerformanceReport(**session["report"]))

    attempts_cursor = db.quiz_attempts.find({"session_id": session_id})
    attempts = await attempts_cursor.to_list(length=200)

    try:
        from agents.quiz_engine.report import generate_report
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        time_started = session.get("time_started", now)

        report = await generate_report(
            session_id=session_id,
            attempts=attempts,
            time_started=time_started,
            time_completed=now,
        )
    except Exception as e:
        logger.error("Report generation failed: %s", e)
        raise HTTPException(status_code=503, detail="Failed to generate report.")

    # Persist report + close session
    await db.quiz_sessions.update_one(
        {"_id": session_id},
        {"$set": {
            "status": "completed",
            "time_completed": now,
            "report": report,
            "score": report["overall_score"],
        }},
    )

    return QuizReportResponse(report=PerformanceReport(**report))

# ─── Session History ──────────────────────────────────────────────────────────

@router.get("/history")
async def quiz_history(current_user: dict = Depends(get_current_user)):
    db = get_db()
    cursor = db.quiz_sessions.find(
        {"user_id": current_user["_id"]},
        sort=[("created_at", -1)],
        limit=20,
    )
    sessions = await cursor.to_list(length=20)
    return [
        {
            "session_id": s["_id"],
            "status": s["status"],
            "score": s.get("score", 0),
            "difficulty": s["difficulty"],
            "total_questions": s["total_questions_requested"],
            "created_at": s["created_at"],
        }
        for s in sessions
    ]