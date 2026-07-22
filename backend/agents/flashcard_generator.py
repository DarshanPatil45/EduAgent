import json
from core.llm import json_llm
from core.logger import get_logger

logger = get_logger(__name__)

FLASHCARD_PROMPT = """Generate flashcards from the document content below. Each card should test one specific fact or concept.

Document content:
{content}

Respond ONLY as JSON with this exact shape:
{{"cards": [{{"front": "a question or term", "back": "the answer or definition"}}]}}

Generate 8-12 cards covering the most important, testable facts."""

async def generate_flashcards(content: str) -> list:
    prompt = FLASHCARD_PROMPT.format(content=content[:12000])
    result = await json_llm.ainvoke(prompt)
    try:
        parsed = json.loads(result.content)
        return parsed.get("cards", [])
    except (json.JSONDecodeError, TypeError):
        logger.error("Flashcard generator returned non-JSON: %s", result.content)
        return []