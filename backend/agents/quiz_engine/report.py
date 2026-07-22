import json
from typing import List
from datetime import datetime
from core.llm import json_llm
from core.logger import get_logger
from agents.quiz_engine.adaptive import analyze_performance

logger = get_logger(__name__)

REPORT_PROMPT = """You are an educational performance analyst.

Quiz Performance Data:
- Overall Score: {score}%
- Total Questions: {total}
- Correct: {correct}
- Average Confidence: {confidence}%
- Time Taken: {time_minutes} minutes
- Strong Topics: {strong}
- Weak Topics: {weak}

Generate a personalized performance report. Respond ONLY as JSON:
{{
  "phase_summary": "2-3 sentence personalized summary of this student's performance",
  "recommended_study_minutes": 30,
  "next_recommendations": [
    "specific action 1",
    "specific action 2",
    "specific action 3",
    "specific action 4"
  ]
}}

Make recommendations specific to their weak topics. Be encouraging but honest."""

async def generate_report(
    session_id: str,
    attempts: List[dict],
    time_started: datetime,
    time_completed: datetime,
) -> dict:
    if not attempts:
        return _empty_report(session_id)

    # Filter attempts to keep only the latest attempt for each unique question
    unique_attempts = {}
    for a in attempts:
        q_id = a.get("question_id")
        if q_id:
            unique_attempts[q_id] = a
    attempts = list(unique_attempts.values())

    topic_performance = analyze_performance(attempts)
    total = len(attempts)
    correct = sum(1 for a in attempts if a.get("is_correct", False))
    score = round((correct / total) * 100, 1) if total > 0 else 0
    avg_confidence = round(
        sum(a.get("confidence", 0.5) for a in attempts) / total * 100, 1
    ) if total > 0 else 0

    # Calculate active time spent answering questions rather than wall-clock time
    active_seconds = sum(a.get("time_taken_seconds", 0) for a in attempts)
    if active_seconds > 0:
        time_minutes = round(active_seconds / 60, 1)
    else:
        # Fallback to wall-clock time if active timers are not recorded
        ts = time_started.replace(tzinfo=None) if time_started else datetime.utcnow()
        tc = time_completed.replace(tzinfo=None) if time_completed else datetime.utcnow()
        time_minutes = round(
            (tc - ts).total_seconds() / 60, 1
        )

    strong_topics = [
        {"topic": t, "accuracy": d["accuracy"], "total_questions": d["total"], "correct": d["correct"]}
        for t, d in topic_performance.items()
        if d["accuracy"] >= 0.7
    ]
    weak_topics = [
        {"topic": t, "accuracy": d["accuracy"], "total_questions": d["total"], "correct": d["correct"]}
        for t, d in topic_performance.items()
        if d["accuracy"] < 0.7
    ]

    # Generate AI narrative
    prompt = REPORT_PROMPT.format(
        score=score,
        total=total,
        correct=correct,
        confidence=avg_confidence,
        time_minutes=time_minutes,
        strong=[t["topic"] for t in strong_topics],
        weak=[t["topic"] for t in weak_topics],
    )

    try:
        result = await json_llm.ainvoke(prompt)
        ai_insights = json.loads(result.content)
    except Exception as e:
        logger.error("Report AI generation failed: %s", e)
        ai_insights = {
            "phase_summary": f"You scored {score}% on this quiz.",
            "recommended_study_minutes": 30,
            "next_recommendations": ["Review weak topics", "Retake quiz", "Generate flashcards"],
        }

    return {
        "session_id": session_id,
        "overall_score": score,
        "total_questions": total,
        "correct_answers": correct,
        "avg_confidence": avg_confidence,
        "time_taken_minutes": time_minutes,
        "strong_topics": strong_topics,
        "weak_topics": weak_topics,
        "recommended_study_minutes": ai_insights.get("recommended_study_minutes", 30),
        "next_recommendations": ai_insights.get("next_recommendations", []),
        "phase_summary": ai_insights.get("phase_summary", ""),
    }

def _empty_report(session_id: str) -> dict:
    return {
        "session_id": session_id,
        "overall_score": 0,
        "total_questions": 0,
        "correct_answers": 0,
        "avg_confidence": 0,
        "time_taken_minutes": 0,
        "strong_topics": [],
        "weak_topics": [],
        "recommended_study_minutes": 30,
        "next_recommendations": ["Upload a document and start a quiz"],
        "phase_summary": "No quiz data available yet.",
    }