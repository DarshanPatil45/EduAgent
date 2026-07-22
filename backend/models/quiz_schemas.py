from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime

QuestionType = Literal["mcq", "true_false", "fill_blank", "short_answer", "long_answer"]
DifficultyLevel = Literal["easy", "medium", "hard", "mixed"]
QuizStatus = Literal["active", "completed", "abandoned"]
QuizPhase = Literal["initial", "adaptive", "practice", "final"]

# ─── Quiz Session ─────────────────────────────────────────────────────────────

class StartQuizRequest(BaseModel):
    document_ids: List[str] = Field(..., min_length=1)
    difficulty: DifficultyLevel = "mixed"
    question_types: List[QuestionType] = ["mcq", "true_false", "fill_blank"]
    total_questions: int = Field(10, ge=5, le=50)

class QuizSessionResponse(BaseModel):
    session_id: str
    status: QuizStatus
    current_phase: QuizPhase
    total_questions: int
    difficulty: str
    created_at: datetime

# ─── Questions ────────────────────────────────────────────────────────────────

class QuizQuestionResponse(BaseModel):
    question_id: str
    question_text: str
    question_type: QuestionType
    difficulty: str
    topic: str
    options: Optional[List[str]] = None   # MCQ / T-F only
    order: int
    total_in_session: int

# ─── Answers ──────────────────────────────────────────────────────────────────

class SubmitAnswerRequest(BaseModel):
    session_id: str
    question_id: str
    user_answer: str
    time_taken_seconds: int = Field(..., ge=0)

class AnswerFeedback(BaseModel):
    is_correct: bool
    correct_answer: str
    explanation: str
    why_wrong: Optional[str] = None
    real_world_example: str
    memory_trick: str
    related_concepts: List[str] = []
    page_reference: Optional[int] = None
    topic: str
    concept: str

class SubmitAnswerResponse(BaseModel):
    attempt_id: str
    feedback: AnswerFeedback
    session_status: QuizStatus
    next_action: Literal["next_question", "adaptive_triggered", "quiz_complete"]
    adaptive_message: Optional[str] = None

# ─── Next Question ────────────────────────────────────────────────────────────

class NextQuestionResponse(BaseModel):
    question: Optional[QuizQuestionResponse] = None
    session_complete: bool = False
    adaptive_triggered: bool = False
    message: Optional[str] = None

# ─── Performance Report ───────────────────────────────────────────────────────

class TopicPerformance(BaseModel):
    topic: str
    accuracy: float
    total_questions: int
    correct: int

class PerformanceReport(BaseModel):
    session_id: str
    overall_score: float
    total_questions: int
    correct_answers: int
    avg_confidence: float
    time_taken_minutes: float
    strong_topics: List[TopicPerformance]
    weak_topics: List[TopicPerformance]
    recommended_study_minutes: int
    next_recommendations: List[str]
    phase_summary: str

class QuizReportResponse(BaseModel):
    report: PerformanceReport
    status: str = "completed"