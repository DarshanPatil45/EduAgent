from fastapi import APIRouter, Depends
from database.connection import get_db
from core.auth import get_current_user

router = APIRouter(prefix="/progress", tags=["progress"])

@router.get("/summary")
async def get_progress(current_user: dict = Depends(get_current_user)):
    db = get_db()

    # Load weak concepts from chat interactions
    wc_cursor = db.weak_concepts.find(
        {"user_id": current_user["_id"]},
        sort=[("count", -1)],
        limit=15,
    )
    weak_concepts = await wc_cursor.to_list(length=15)

    # Load weak topics from quiz evaluations
    wt_cursor = db.weak_topics.find(
        {"user_id": current_user["_id"], "accuracy": {"$lt": 0.7}},
        sort=[("wrong_count", -1)],
        limit=15,
    )
    weak_topics = await wt_cursor.to_list(length=15)

    # Merge chat concepts and quiz topics
    merged = {}
    for wc in weak_concepts:
        concept_name = wc.get("concept")
        if concept_name:
            merged[concept_name] = wc.get("count", 0)

    for wt in weak_topics:
        concept_name = wt.get("concept") or wt.get("topic")
        if concept_name:
            # Keep the maximum count of errors identified
            merged[concept_name] = max(merged.get(concept_name, 0), wt.get("wrong_count", 0))

    # Sort merged concepts by count descending and limit to top 15
    sorted_concepts = sorted(merged.items(), key=lambda x: x[1], reverse=True)[:15]
    weak_concepts_list = [{"concept": k, "count": v} for k, v in sorted_concepts]

    total_cards = await db.flashcards.count_documents({"user_id": current_user["_id"]})
    # Count sessions in both sessions and quiz_sessions to get the total
    chat_sessions = await db.sessions.count_documents({"user_id": current_user["_id"]})
    quiz_sessions = await db.quiz_sessions.count_documents({"user_id": current_user["_id"]})
    total_sessions = chat_sessions + quiz_sessions

    return {
        "weak_concepts": weak_concepts_list,
        "total_flashcards": total_cards,
        "total_sessions": total_sessions,
    }