import json
from typing import List
from core.llm import json_llm
from core.logger import get_logger
from core.vectorstore import get_collection
from core.config import TOP_K

logger = get_logger(__name__)

GENERATOR_PROMPT = """You are an expert educational assessment designer.
Generate {count} quiz questions from the study material below.

Difficulty: {difficulty}
Allowed question types to include: {types}
Topic focus: {topic_focus}

Study material:
{context}

Rules:
- Each question must test a specific, important concept
- You MUST ONLY generate questions of the requested types: {types}. Do not generate any other question type under any circumstances.
- If "mcq" is requested: must have exactly 4 options with only one correct
- If "true_false" is requested: must have "True" or "False" as correct_answer
- If "fill_blank" is requested: use ___ for the blank in question_text
- If "short_answer" is requested: 1-2 sentence answer expected
- If "long_answer" is requested: detailed explanation expected
- Extract the page_reference number if visible in the material
- Make questions progressively harder within each topic

Respond ONLY as JSON:
{{
  "questions": [
    {{
      "question_text": "...",
      "question_type": "must be exactly one of: {types}",
      "difficulty": "easy | medium | hard",
      "topic": "main topic name",
      "concept": "specific concept being tested",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct_answer": "...",
      "explanation": "detailed explanation of why this is correct",
      "page_reference": null
    }}
  ]
}}

For non-MCQ questions, set options to null."""

async def generate_questions(
    context: str,
    count: int,
    difficulty: str,
    question_types: List[str],
    topic_focus: str = "all topics equally",
) -> List[dict]:
    prompt = GENERATOR_PROMPT.format(
        count=count,
        difficulty=difficulty,
        types=", ".join(question_types),
        topic_focus=topic_focus,
        context=context[:14000],
    )

    try:
        result = await json_llm.ainvoke(prompt)
        parsed = json.loads(result.content)
        questions = parsed.get("questions", [])
        logger.info("Generated %d questions at difficulty=%s", len(questions), difficulty)
        return questions
    except (json.JSONDecodeError, TypeError) as e:
        logger.error("Question generation failed: %s", e)
        return []

async def get_context_for_documents(document_filenames: List[str]) -> str:
    """Pull chunks from ChromaDB for the given document filenames."""
    collection = get_collection()
    all_chunks = []
    for filename in document_filenames:
        results = collection.get(where={"source": filename})
        chunks = results.get("documents") or []
        all_chunks.extend(chunks)
    return "\n\n".join(all_chunks)