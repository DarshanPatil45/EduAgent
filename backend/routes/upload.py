import os
import uuid
import shutil
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from starlette.concurrency import run_in_threadpool
from database.connection import get_db
from core.auth import get_current_user
from core.config import UPLOADS_PATH
from core.logger import get_logger
from ingestion.parse_and_embed import ingest_pdf

router = APIRouter(tags=["documents"])
logger = get_logger(__name__)

@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    db = get_db()
    os.makedirs(UPLOADS_PATH, exist_ok=True)
    safe_filename = f"{current_user['_id']}_{file.filename}"
    filepath = os.path.join(UPLOADS_PATH, safe_filename)

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        num_chunks, extracted_text = await run_in_threadpool(ingest_pdf, filepath)
    except Exception as e:
        logger.error("Ingestion failed: %s", e)
        raise HTTPException(status_code=422, detail=f"Could not process this PDF: {e}")

    if num_chunks == 0:
        raise HTTPException(status_code=422, detail="No readable text found in this PDF.")

    doc_id = str(uuid.uuid4())
    document = {
        "_id": doc_id,
        "user_id": current_user["_id"],
        "filename": safe_filename,
        "original_name": file.filename,
        "text": extracted_text,
        "chunk_count": num_chunks,
        "created_at": datetime.now(timezone.utc),
    }
    await db.documents.insert_one(document)

    return {"status": "ingested", "document": {**document, "id": doc_id}}

@router.get("/documents")
async def list_documents(current_user: dict = Depends(get_current_user)):
    db = get_db()
    cursor = db.documents.find(
        {"user_id": current_user["_id"]},
        sort=[("created_at", -1)]
    )
    docs = await cursor.to_list(length=100)
    return [{"id": d["_id"], **{k: v for k, v in d.items() if k != "_id"}} for d in docs]