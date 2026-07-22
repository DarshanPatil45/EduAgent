🎓 EduAgent-360 — AI-Powered Personalized Learning Platform

EduAgent-360 is a next-generation AI-powered learning platform that transforms static study materials into personalized, interactive learning experiences. Built with a multi-agent AI architecture, it combines Retrieval-Augmented Generation (RAG), adaptive learning, intelligent tutoring, AI-generated notes, flashcards, and progress analytics to help students learn more effectively.

✨ Features
🤖 Multi-Agent AI Architecture

A collaborative AI system powered by specialized agents including:

Orchestrator Agent
AI Tutor
Notes Generator
Flashcard Generator
Quiz Generator
Evaluation Agent

Each agent performs a dedicated task while working together through LangGraph workflows.

📄 Intelligent Document Processing
Upload PDF notes, textbooks, or study materials.
Automatically extract, chunk, and embed content.
Build a searchable knowledge base using ChromaDB.

💬 AI Study Assistant
Context-aware conversational tutor.
Answers only from uploaded study materials.
Provides source-grounded responses to reduce hallucinations.

📝 AI-Generated Study Notes
Chapter-wise summaries
Key concepts
Important definitions
Exam-focused notes
Quick revision material

🧠 Adaptive Quiz Engine
AI-generated quizzes based on uploaded documents.
Automatic evaluation and scoring.
Personalized difficulty adjustment based on performance.
Instant explanations for incorrect answers.

🃏 Smart Flashcards
Automatic flashcard generation.
Active recall learning.
Spaced repetition (SM-2 algorithm).
Daily review sessions.

📈 Learning Analytics
Track study progress.
Identify weak concepts.
Quiz performance dashboard.
Learning history and statistics.

🔒 Authentication & Cloud Storage
JWT-based authentication.
MongoDB Atlas for user profiles, progress, and study history.
Secure cloud-based storage.

🛠️ Tech Stack
Frontend
Next.js 15 (App Router)
React 19
TypeScript
Tailwind CSS
Framer Motion
React Flow
Zustand
Backend
FastAPI
Python 3.10+
LangGraph
LangChain
Mistral AI (or your chosen LLM provider)
Databases
MongoDB Atlas (User data)
ChromaDB (Vector database)
AI & RAG
Retrieval-Augmented Generation (RAG)
Multi-Agent AI Workflow
Semantic Search
Document Embeddings

🚀 Getting Started
Prerequisites
Node.js 18+
Python 3.10+
MongoDB Atlas Cluster
AI API Key
Git
Backend
cd backend

python -m venv venv

source venv/bin/activate
# Windows
venv\Scripts\activate

pip install -r requirements.txt

uvicorn main:app --reload
Frontend
cd frontend

npm install

npm run dev


📂 Project Architecture
Frontend (Next.js)
        │
        ▼
FastAPI Backend
        │
        ▼
LangGraph Multi-Agent System
        │
 ┌──────┼────────┐
 │      │        │
Tutor  Notes  Flashcards
 │      │        │
 └──────┼────────┘
        ▼
   ChromaDB (RAG)
        │
        ▼
MongoDB Atlas
