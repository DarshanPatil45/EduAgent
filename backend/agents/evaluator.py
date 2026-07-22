import json
from core.llm import json_llm
from core.logger import get_logger

logger = get_logger(__name__)

async def evaluator_node(state: dict) -> dict:
    last_quiz = state.get("last_quiz_question", "")
    quiz_context = state.get("last_quiz_context") or state.get("context", "")

    if not last_quiz:
        state["answer"] = "I don't have a quiz question on record yet — ask me to quiz you first!"
        return state

    prompt = f"""The student was asked these quiz questions:
{last_quiz}

The student answered: {state['query']}

Reference context: {quiz_context}

Judge the answer. Respond ONLY as JSON: {{"correct": true/false, "concept": "short 2-4 word topic name if incorrect, else null", "feedback": "one encouraging sentence"}}"""

    result = await json_llm.ainvoke(prompt)

    try:
        parsed = json.loads(result.content)
    except (json.JSONDecodeError, TypeError):
        logger.error("Evaluator returned non-JSON: %s", result.content)
        parsed = {"correct": True, "concept": None, "feedback": result.content}

    state["answer"] = parsed.get("feedback", "Good attempt!")
    if not parsed.get("correct", True) and parsed.get("concept"):
        state["weak_concepts"] = state.get("weak_concepts", []) + [parsed["concept"]]

    return state