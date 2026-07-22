from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# ─── Auth ────────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2)
    password: str = Field(..., min_length=8)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    full_name: str
    email: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    created_at: datetime

# ─── Documents ───────────────────────────────────────────────────────────────

class DocumentResponse(BaseModel):
    id: str
    filename: str
    original_name: str
    chunk_count: int
    created_at: datetime

class UploadResponse(BaseModel):
    status: str
    document: DocumentResponse

# ─── Chat ────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1)
    session_id: Optional[str] = None
    document_id: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    intent: str
    session_id: str
    weak_concepts: List[str] = []
    sources: List[dict] = []
    grounded: bool = True

# ─── Notes ───────────────────────────────────────────────────────────────────

class KeyTerm(BaseModel):
    term: str
    definition: str

class NotesSection(BaseModel):
    heading: str
    points: List[str]

class NotesResponse(BaseModel):
    source: str
    title: str
    summary: str
    key_terms: List[KeyTerm] = []
    sections: List[NotesSection] = []
    exam_focus: List[str] = []

# ─── Flashcards ──────────────────────────────────────────────────────────────

class FlashcardResponse(BaseModel):
    id: str
    front: str
    back: str
    ease: float
    interval: int
    repetitions: int
    next_review: str

class GenerateFlashcardsRequest(BaseModel):
    document_id: str

class ReviewFlashcardRequest(BaseModel):
    card_id: str
    quality: int = Field(..., ge=0, le=5)

# ─── Progress ────────────────────────────────────────────────────────────────

class WeakConceptResponse(BaseModel):
    concept: str
    count: int