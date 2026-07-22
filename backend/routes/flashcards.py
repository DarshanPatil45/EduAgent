import uuid
from datetime import date, timedelta, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from database.connection import get_db
from core.auth import get_current_user
from core.srs import sm2_update
from core.vectorstore import get_chunks_by_source
from agents.flashcard_generator import generate_flashcards
from models.schemas import GenerateFlashcardsRequest, ReviewFlashcardRequest

router = APIRouter(prefix="/flashcards", tags=["flashcards"])

@router.post("/generate")
async def create_flashcards(
    request: GenerateFlashcardsRequest,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    document = await db.documents.find_one({
        "_id": request.document_id,
        "user_id": current_user["_id"],
    })
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    chunks = get_chunks_by_source(document["filename"])
    if not chunks:
        raise HTTPException(status_code=404, detail="No content found for this document.")

    raw_cards = await generate_flashcards("\n\n".join(chunks))
    if not raw_cards:
        raise HTTPException(status_code=422, detail="Could not generate flashcards.")

    today = date.today().isoformat()
    cards = [
        {
            "_id": str(uuid.uuid4()),
            "user_id": current_user["_id"],
            "document_id": document["_id"],
            "front": c["front"],
            "back": c["back"],
            "ease": 2.5,
            "interval": 1,
            "repetitions": 0,
            "next_review": today,
            "created_at": datetime.now(timezone.utc),
        }
        for c in raw_cards
    ]
    await db.flashcards.insert_many(cards)
    return [{"id": c["_id"], **{k: v for k, v in c.items() if k != "_id"}} for c in cards]

@router.get("/due")
async def due_flashcards(current_user: dict = Depends(get_current_user)):
    db = get_db()
    today = date.today().isoformat()
    cursor = db.flashcards.find({
        "user_id": current_user["_id"],
        "next_review": {"$lte": today},
    })
    cards = await cursor.to_list(length=200)
    return [{"id": c["_id"], **{k: v for k, v in c.items() if k != "_id"}} for c in cards]

@router.post("/review")
async def review_card(
    request: ReviewFlashcardRequest,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    card = await db.flashcards.find_one({
        "_id": request.card_id,
        "user_id": current_user["_id"],
    })
    if not card:
        raise HTTPException(status_code=404, detail="Flashcard not found.")

    updated = sm2_update(card["ease"], card["interval"], card["repetitions"], request.quality)
    new_review = (date.today() + timedelta(days=updated["interval"])).isoformat()

    await db.flashcards.update_one(
        {"_id": request.card_id},
        {"$set": {**updated, "next_review": new_review}}
    )
    return {**card, **updated, "next_review": new_review, "id": card["_id"]}