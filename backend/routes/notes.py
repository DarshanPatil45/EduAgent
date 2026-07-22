from fastapi import APIRouter, HTTPException, Depends
from database.connection import get_db
from core.auth import get_current_user
from core.vectorstore import get_chunks_by_source
from agents.notes_generator import generate_notes
from models.schemas import NotesResponse
from datetime import datetime, timezone

router = APIRouter(tags=["notes"])

@router.get("/notes/{document_id}", response_model=NotesResponse)
async def get_notes(
    document_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()

    # Check if document belongs to user
    document = await db.documents.find_one({
        "_id": document_id,
        "user_id": current_user["_id"],
    })
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Return cached notes if they exist
    cached = await db.notes.find_one({"document_id": document_id})
    if cached:
        return NotesResponse(**{k: v for k, v in cached.items() if k not in ("_id", "document_id", "created_at")}, source=document["filename"])

    # Generate fresh notes
    chunks = get_chunks_by_source(document["filename"])
    if not chunks:
        raise HTTPException(status_code=404, detail="No content found for this document.")

    notes = await generate_notes("\n\n".join(chunks))

    # Cache in MongoDB
    await db.notes.insert_one({
        "document_id": document_id,
        "user_id": current_user["_id"],
        "created_at": datetime.now(timezone.utc),
        **notes,
    })

    return NotesResponse(source=document["filename"], **notes)