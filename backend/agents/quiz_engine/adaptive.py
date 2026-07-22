import json
from typing import List, Dict
from core.llm import json_llm, llm
from core.logger import get_logger
from agents.quiz_engine.generator import generate_questions

logger = get_logger(__name__)

WRONG_THRESHOLD = 3        # wrong answers on one topic before adaptation triggers
MASTERY_THRESHOLD = 0.80   # 80% accuracy = mastered

DIFFICULTY_PROGRESSION = {
    "hard": "medium",
    "medium": "easy",
    "easy": "easy",
}

def analyze_performance(attempts: List[dict]) -> Dict[str, dict]:
    """
    Group attempts by topic and compute per-topic accuracy.
    Returns: { topic: { correct, total, accuracy, concepts, wrong_concepts } }
    """
    topics = {}
    for attempt in attempts:
        topic = attempt.get("topic", "General")
        concept = attempt.get("concept", "")
        is_correct = attempt.get("is_correct", False)

        if topic not in topics:
            topics[topic] = {
                "correct": 0,
                "total": 0,
                "concepts": set(),
                "wrong_concepts": [],
            }

        topics[topic]["total"] += 1
        topics[topic]["concepts"].add(concept)
        if is_correct:
            topics[topic]["correct"] += 1
        else:
            topics[topic]["wrong_concepts"].append(concept)

    for topic, data in topics.items():
        data["accuracy"] = round(data["correct"] / data["total"], 2) if data["total"] > 0 else 0
        data["concepts"] = list(data["concepts"])

    return topics

def should_trigger_adaptive(attempts: List[dict]) -> tuple[bool, List[str]]:
    """
    Check if any topic has 3+ wrong answers in a row.
    Returns (should_trigger, list_of_weak_topics)
    """
    topic_wrong_streak = {}
    weak_topics = []

    for attempt in attempts:
        topic = attempt.get("topic", "General")
        if not attempt.get("is_correct", False):
            topic_wrong_streak[topic] = topic_wrong_streak.get(topic, 0) + 1
        else:
            topic_wrong_streak[topic] = 0

    for topic, streak in topic_wrong_streak.items():
        if streak >= WRONG_THRESHOLD:
            weak_topics.append(topic)

    return len(weak_topics) > 0, weak_topics

async def generate_adaptive_questions(
    context: str,
    weak_topics: List[str],
    current_difficulty: str,
    wrong_concepts: List[str],
) -> List[dict]:
    """
    Generate easier questions targeting exactly the weak concepts.
    Difficulty steps down one level automatically.
    """
    easier_difficulty = DIFFICULTY_PROGRESSION.get(current_difficulty, "easy")
    topic_focus = f"Focus ONLY on: {', '.join(weak_topics)}. Specifically test: {', '.join(wrong_concepts[:5])}"

    logger.info(
        "Generating adaptive questions — topics=%s difficulty=%s→%s",
        weak_topics, current_difficulty, easier_difficulty,
    )

    questions = await generate_questions(
        context=context,
        count=3,
        difficulty=easier_difficulty,
        question_types=["mcq", "true_false"],  # simpler types for remediation
        topic_focus=topic_focus,
    )
    for q in questions:
        q["is_adaptive"] = True
        q["adaptive_reason"] = f"Remediation for weak topics: {', '.join(weak_topics)}"

    return questions

TEACH_PROMPT = """You are a patient, expert tutor.

The student is struggling with these concepts: {concepts}
Topic: {topic}

Provide a clear, concise teaching moment (3-5 sentences) that:
1. Explains the core concept simply
2. Gives one concrete real-world analogy
3. Highlights the most common mistake students make
4. Ends with one key thing to remember

Keep it encouraging and clear. No bullet points — write as a natural tutor would speak."""

async def generate_teaching_moment(topic: str, wrong_concepts: List[str]) -> str:
    """Generate a short teaching intervention before adaptive questions."""
    prompt = TEACH_PROMPT.format(
        concepts=", ".join(wrong_concepts[:3]) if wrong_concepts else topic,
        topic=topic,
    )
    try:
        # Use the plain LLM (not json_llm) — we want natural prose, not JSON
        result = await llm.ainvoke(prompt)
        return result.content.strip()
    except Exception as e:
        logger.error("Teaching moment failed: %s", e)
        return f"Let's review {topic} together. Focus on the core concepts before continuing."

def is_concept_mastered(topic_performance: dict) -> bool:
    return topic_performance.get("accuracy", 0) >= MASTERY_THRESHOLD