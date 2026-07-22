# 🎓 EduAgent-360 — AI-Powered Personalized Learning Platform

EduAgent-360 is an intelligent, full-stack educational platform powered by a multi-agent AI architecture. It transforms static study materials into interactive learning experiences using Retrieval-Augmented Generation (RAG), automated flashcard generation, smart study notes, and adaptive quiz engines.

---

## ✨ Features

- 🤖 **Multi-Agent AI Ecosystem**: Uses specialized LLM agents (Orchestrator, AI Tutor, Note Generator, Flashcard Creator, and Evaluator) built on LangGraph.
- 📚 **RAG-Powered Document Analysis**: Upload PDFs or study guides and ask context-aware questions backed by ChromaDB vector storage.
- 💬 **Interactive AI Tutor**: Chat with a contextual AI tutor that adapts to your learning pace and targets your knowledge gaps.
- 📝 **Automated Smart Notes & Flashcards**: Generate structured summary notes and active recall flashcards instantly from your materials.
- 🧠 **Adaptive Quiz Engine & Progress Tracking**: Practice with AI-generated quizzes and receive evaluation feedback to track your learning journey over time.
- 🔒 **User Authentication & Cloud Database**: Secure user state, progress history, and saved content powered by MongoDB Atlas.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand / React Hooks

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **AI / LLM Framework**: LangGraph, LangChain, OpenAI / Gemini APIs
- **Vector Database**: ChromaDB (RAG embeddings)
- **Database**: MongoDB Atlas (User data & auth)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ & npm
- Python 3.10+
- MongoDB Atlas connection URI
- AI API keys (OpenAI / Gemini)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the app in your browser.
