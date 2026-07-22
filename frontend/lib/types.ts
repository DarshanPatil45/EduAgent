// ─── Auth ────────────────────────────────────────────────────────────────────

export interface SignupRequest {
  email: string;
  full_name: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  full_name: string;
  email: string;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

// ─── Documents ───────────────────────────────────────────────────────────────

export interface DocumentResponse {
  id: string;
  filename: string;
  original_name: string;
  chunk_count: number;
  created_at: string;
  user_id?: string;
}

export interface UploadResponse {
  status: string;
  document: DocumentResponse;
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export interface ChatRequest {
  query: string;
  session_id?: string;
  document_id?: string;
}

export interface ChatSource {
  source?: string;
  page?: number;
  text?: string;
  [key: string]: unknown;
}

export interface ChatResponse {
  answer: string;
  intent: string;
  session_id: string;
  weak_concepts: string[];
  sources: ChatSource[];
  grounded: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  sources?: ChatSource[];
  weak_concepts?: string[];
  grounded?: boolean;
  timestamp?: string;
}

// ─── Notes ───────────────────────────────────────────────────────────────────

export interface KeyTerm {
  term: string;
  definition: string;
}

export interface NotesSection {
  heading: string;
  points: string[];
}

export interface NotesResponse {
  source: string;
  title: string;
  summary: string;
  key_terms: KeyTerm[];
  sections: NotesSection[];
  exam_focus: string[];
}

// ─── Flashcards ──────────────────────────────────────────────────────────────

export interface FlashcardResponse {
  id: string;
  front: string;
  back: string;
  ease: number;
  interval: number;
  repetitions: number;
  next_review: string;
  document_id?: string;
}

export interface GenerateFlashcardsRequest {
  document_id: string;
}

export interface ReviewFlashcardRequest {
  card_id: string;
  quality: number; // 0–5
}

// ─── Progress ────────────────────────────────────────────────────────────────

export interface WeakConcept {
  concept: string;
  count: number;
}

export interface ProgressSummary {
  weak_concepts: WeakConcept[];
  total_flashcards: number;
  total_sessions: number;
}

// ─── Quiz ────────────────────────────────────────────────────────────────────

export type QuestionType = 'mcq' | 'true_false' | 'fill_blank' | 'short_answer' | 'long_answer';
export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'mixed';
export type QuizStatus = 'active' | 'completed' | 'abandoned';
export type QuizPhase = 'initial' | 'adaptive' | 'practice' | 'final';

export interface StartQuizRequest {
  document_ids: string[];
  difficulty: DifficultyLevel;
  question_types: QuestionType[];
  total_questions: number;
}

export interface QuizSessionResponse {
  session_id: string;
  status: QuizStatus;
  current_phase: QuizPhase;
  total_questions: number;
  difficulty: string;
  created_at: string;
}

export interface QuizQuestionResponse {
  question_id: string;
  question_text: string;
  question_type: QuestionType;
  difficulty: string;
  topic: string;
  options?: string[];
  order: number;
  total_in_session: number;
}

export interface SubmitAnswerRequest {
  session_id: string;
  question_id: string;
  user_answer: string;
  time_taken_seconds: number;
}

export interface AnswerFeedback {
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
  why_wrong?: string;
  real_world_example: string;
  memory_trick: string;
  related_concepts: string[];
  page_reference?: number;
  topic: string;
  concept: string;
}

export interface SubmitAnswerResponse {
  attempt_id: string;
  feedback: AnswerFeedback;
  session_status: QuizStatus;
  next_action: 'next_question' | 'adaptive_triggered' | 'quiz_complete';
  adaptive_message?: string;
}

export interface NextQuestionResponse {
  question?: QuizQuestionResponse;
  session_complete: boolean;
  adaptive_triggered: boolean;
  message?: string;
}

export interface TopicPerformance {
  topic: string;
  accuracy: number;
  total_questions: number;
  correct: number;
}

export interface PerformanceReport {
  session_id: string;
  overall_score: number;
  total_questions: number;
  correct_answers: number;
  avg_confidence: number;
  time_taken_minutes: number;
  strong_topics: TopicPerformance[];
  weak_topics: TopicPerformance[];
  recommended_study_minutes: number;
  next_recommendations: string[];
  phase_summary: string;
}

export interface QuizReportResponse {
  report: PerformanceReport;
  status: string;
}

export interface QuizHistoryItem {
  session_id: string;
  status: QuizStatus;
  score: number;
  difficulty: string;
  total_questions: number;
  created_at: string;
}
