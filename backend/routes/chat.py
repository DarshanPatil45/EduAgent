import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from database.connection import get_db
from core.auth import get_current_user
from core.logger import get_logger
from agents.graph import app_graph
from models.schemas import ChatRequest, ChatResponse

router = APIRouter(tags=["chat"])
logger = get_logger(__name__)

@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()

    # Get or create session
    if request.session_id:
        session = await db.sessions.find_one({
            "_id": request.session_id,
            "user_id": current_user["_id"],
        })
        if not session:
            raise HTTPException(status_code=404, detail="Session not found.")
    else:
        session_id = str(uuid.uuid4())
        session = {
            "_id": session_id,
            "user_id": current_user["_id"],
            "document_id": request.document_id,
            "last_quiz_question": "",
            "last_quiz_context": "",
            "created_at": datetime.now(timezone.utc),
        }
        await db.sessions.insert_one(session)

    # Load recent chat history
    turns_cursor = db.chat_turns.find(
        {"session_id": session["_id"]},
        sort=[("created_at", -1)],
        limit=20,
    )
    turns = list(reversed(await turns_cursor.to_list(length=20)))
    chat_history = [{"role": t["role"], "content": t["content"], "intent": t.get("intent", "")} for t in turns]

    # Load weak concepts
    wc_cursor = db.weak_concepts.find({"user_id": current_user["_id"]})
    weak_concepts = [wc["concept"] for wc in await wc_cursor.to_list(length=100)]

    # Resolve document filename for scoped RAG retrieval
    document_filename = None
    doc_id = request.document_id or session.get("document_id")
    if doc_id:
        doc = await db.documents.find_one({"_id": doc_id, "user_id": current_user["_id"]})
        if doc:
            document_filename = doc.get("filename")

    # Run agent graph
    try:
        result = await app_graph.ainvoke({
            "query": request.query,
            "intent": "",
            "context": "",
            "answer": "",
            "session_id": session["_id"],
            "document_id": doc_id,
            "document_filename": document_filename,
            "chat_history": chat_history,
            "weak_concepts": weak_concepts,
            "last_quiz_question": session.get("last_quiz_question", ""),
            "last_quiz_context": session.get("last_quiz_context", ""),
            "sources": [],
            "grounded": True,
        })
    except Exception as e:
        logger.error("Graph execution failed: %s", e)
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable.")

    now = datetime.now(timezone.utc)

    # Save chat turns
    await db.chat_turns.insert_many([
        {"_id": str(uuid.uuid4()), "session_id": session["_id"], "role": "user",
         "content": request.query, "intent": result["intent"], "created_at": now},
        {"_id": str(uuid.uuid4()), "session_id": session["_id"], "role": "assistant",
         "content": result["answer"], "intent": result["intent"], "created_at": now},
    ])

    # Update weak concepts
    for concept in result.get("weak_concepts", []):
        await db.weak_concepts.update_one(
            {"user_id": current_user["_id"], "concept": concept},
            {"$inc": {"count": 1}, "$setOnInsert": {"_id": str(uuid.uuid4()), "created_at": now}},
            upsert=True,
        )

    # Update session quiz state
    if result.get("last_quiz_question"):
        await db.sessions.update_one(
            {"_id": session["_id"]},
            {"$set": {
                "last_quiz_question": result["last_quiz_question"],
                "last_quiz_context": result.get("last_quiz_context", ""),
                "updated_at": now,
            }}
        )

    return ChatResponse(
        answer=result["answer"],
        intent=result["intent"],
        session_id=session["_id"],
        weak_concepts=weak_concepts,
        sources=result.get("sources", []),
        grounded=result.get("grounded", True),
    )