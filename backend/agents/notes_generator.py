import json
from core.llm import json_llm
from core.logger import get_logger

logger = get_logger(__name__)

NOTES_PROMPT = """You are generating comprehensive, highly detailed study notes from the document content below.

Document content:
{content}

Respond ONLY as JSON with this exact shape:
{{
  "title": "a short descriptive title for this document",
  "summary": "a thorough 3-4 sentence overview summarizing the main themes and significance",
  "key_terms": [{{"term": "...", "definition": "detailed, clear one-sentence definition of the term or concept"}}],
  "sections": [{{"heading": "...", "points": ["comprehensive and detailed bullet point explaining a concept thoroughly", "..."]}}],
  "exam_focus": ["a specific point or potential question likely to appear on an exam", "..."]
}}

Include 10-15 key_terms, 6-10 sections with 5-8 detailed, highly informative points each, and 5-8 exam_focus items.
Ensure the points are explanatory and rich in detail, not brief or basic."""

async def generate_notes(content: str) -> dict:
    # Use up to 40k characters to capture the full scope of the document
    prompt = NOTES_PROMPT.format(content=content[:40000])
    result = await json_llm.ainvoke(prompt)
    try:
        return json.loads(result.content)
    except (json.JSONDecodeError, TypeError):
        logger.error("Notes generator returned non-JSON: %s", result.content)
        return {"title": "Notes", "summary": result.content, "key_terms": [], "sections": [], "exam_focus": []}