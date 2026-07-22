import json
from core.llm import json_llm
from core.logger import get_logger

logger = get_logger(__name__)

EVALUATOR_PROMPT = """You are an expert educational evaluator.

Question: {question_text}
Question Type: {question_type}
Correct Answer: {correct_answer}
Student's Answer: {user_answer}
Context from study material: {context}

Evaluate the student's answer and respond ONLY as JSON:
{{
  "is_correct": true or false,
  "partial_credit": false,
  "correct_answer": "the full correct answer",
  "explanation": "detailed explanation of the correct answer (3-4 sentences)",
  "why_wrong": "specific reason why student's answer is wrong (null if correct)",
  "real_world_example": "a concrete real-world example illustrating this concept",
  "memory_trick": "a mnemonic or memory trick to remember this",
  "related_concepts": ["concept1", "concept2", "concept3"],
  "page_reference": null,
  "topic": "main topic",
  "concept": "specific concept tested"
}}

For short/long answer questions, be lenient — check for conceptual understanding,
not exact wording. Set is_correct=true if core concept is correct."""

async def evaluate_answer(
    question_text: str,
    question_type: str,
    correct_answer: str,
    user_answer: str,
    context: str,
    topic: str,
    concept: str,
) -> dict:
    prompt = EVALUATOR_PROMPT.format(
        question_text=question_text,
        question_type=question_type,
        correct_answer=correct_answer,
        user_answer=user_answer,
        context=context[:3000],
        topic=topic,
        concept=concept,
    )

    try:
        result = await json_llm.ainvoke(prompt)
        parsed = json.loads(result.content)
        # Normalize LLM responses which might use "correct" instead of "is_correct"
        is_cor = parsed.get("is_correct")
        if is_cor is None:
            is_cor = parsed.get("correct", False)
        parsed["is_correct"] = is_cor
        logger.info("Evaluated answer — correct=%s topic=%s", is_cor, topic)
        return parsed
    except (json.JSONDecodeError, TypeError) as e:
        logger.error("Evaluation failed: %s", e)
        # Safe fallback — don't crash the quiz
        is_correct = user_answer.strip().lower() == correct_answer.strip().lower()
        return {
            "is_correct": is_correct,
            "correct_answer": correct_answer,
            "explanation": "Please review this concept in your study material.",
            "why_wrong": None if is_correct else "Your answer did not match the expected response.",
            "real_world_example": "See your uploaded document for examples.",
            "memory_trick": "Review and re-read this section.",
            "related_concepts": [],
            "page_reference": None,
            "topic": topic,
            "concept": concept,
        }

def calculate_confidence(
    is_correct: bool,
    time_taken_seconds: int,
    difficulty: str,
    question_type: str,
) -> float:
    """
    Confidence score (0-1) based on correctness + speed + difficulty.
    Fast + correct = high confidence.
    Slow + correct = medium confidence (maybe guessing).
    Wrong = low confidence regardless of speed.
    """
    if not is_correct:
        return round(max(0.1, 0.4 - (time_taken_seconds / 300)), 2)

    difficulty_multiplier = {"easy": 0.7, "medium": 0.85, "hard": 1.0}.get(difficulty, 0.85)
    speed_bonus = max(0, 1 - (time_taken_seconds / 120))
    base = 0.6 + (speed_bonus * 0.4)
    return round(min(1.0, base * difficulty_multiplier), 2)