import axios from 'axios';
import type {
  SignupRequest, LoginRequest, TokenResponse,
  ChatRequest, ChatResponse,
  GenerateFlashcardsRequest, ReviewFlashcardRequest, FlashcardResponse,
  NotesResponse, ProgressSummary,
  StartQuizRequest, QuizSessionResponse, NextQuestionResponse,
  SubmitAnswerRequest, SubmitAnswerResponse, QuizReportResponse, QuizHistoryItem,
  DocumentResponse,
} from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Auth Interceptor ─────────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Read from Zustand persisted store (key: 'edu-auth')
    try {
      const stored = localStorage.getItem('edu-auth');
      const parsed = stored ? JSON.parse(stored) : null;
      const token = parsed?.state?.token;
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch {
      // Ignore parse errors
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('edu-auth');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  signup: (data: SignupRequest) =>
    api.post<TokenResponse>('/auth/signup', data).then((r) => r.data),
  login: (data: LoginRequest) =>
    api.post<TokenResponse>('/auth/login', data).then((r) => r.data),
  me: () =>
    api.get('/auth/me').then((r) => r.data),
};

// ─── Documents ────────────────────────────────────────────────────────────────
export const documentsApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  list: (): Promise<DocumentResponse[]> =>
    api.get('/documents').then((r) => r.data),
};

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const chatApi = {
  send: (data: ChatRequest): Promise<ChatResponse> =>
    api.post('/chat', data).then((r) => r.data),
};

// ─── Notes ───────────────────────────────────────────────────────────────────
export const notesApi = {
  get: (documentId: string): Promise<NotesResponse> =>
    api.get(`/notes/${documentId}`).then((r) => r.data),
};

// ─── Flashcards ───────────────────────────────────────────────────────────────
export const flashcardsApi = {
  generate: (data: GenerateFlashcardsRequest): Promise<FlashcardResponse[]> =>
    api.post('/flashcards/generate', data).then((r) => r.data),
  due: (): Promise<FlashcardResponse[]> =>
    api.get('/flashcards/due').then((r) => r.data),
  review: (data: ReviewFlashcardRequest): Promise<FlashcardResponse> =>
    api.post('/flashcards/review', data).then((r) => r.data),
};

// ─── Progress ─────────────────────────────────────────────────────────────────
export const progressApi = {
  summary: (): Promise<ProgressSummary> =>
    api.get('/progress/summary').then((r) => r.data),
};

// ─── Quiz ─────────────────────────────────────────────────────────────────────
export const quizApi = {
  start: (data: StartQuizRequest): Promise<QuizSessionResponse> =>
    api.post('/quiz/start', data).then((r) => r.data),
  nextQuestion: (sessionId: string): Promise<NextQuestionResponse> =>
    api.get(`/quiz/question/${sessionId}`).then((r) => r.data),
  submitAnswer: (data: SubmitAnswerRequest): Promise<SubmitAnswerResponse> =>
    api.post('/quiz/answer', data).then((r) => r.data),
  complete: (sessionId: string): Promise<QuizReportResponse> =>
    api.post(`/quiz/complete/${sessionId}`).then((r) => r.data),
  history: (): Promise<QuizHistoryItem[]> =>
    api.get('/quiz/history').then((r) => r.data),
};
