from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from database.connection import connect_db, close_db
from routes import upload, chat, notes,  flashcards, progress
from routes.auth import router as auth_router
from core.logger import get_logger
from routes.quiz import router as quiz_router
from core.config import CORS_ORIGINS

logger = get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Connecting to MongoDB Atlas...")
    await connect_db()
    logger.info("MongoDB connected.")
    yield
    await close_db()
    logger.info("MongoDB connection closed.")

app = FastAPI(title="EduAgent-360", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(upload.router)
app.include_router(chat.router)
app.include_router(notes.router)
app.include_router(flashcards.router)
app.include_router(progress.router)
app.include_router(quiz_router)

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled error on %s: %s", request.url.path, exc)
    return JSONResponse(status_code=500, content={"error": "Something went wrong."})

@app.get("/health")
def health():
    return {"status": "ok"}