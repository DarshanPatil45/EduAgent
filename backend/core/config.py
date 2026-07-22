import os
from dotenv import load_dotenv

load_dotenv()

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
if not MISTRAL_API_KEY:
    raise RuntimeError("MISTRAL_API_KEY is missing.")

MONGODB_URL = os.getenv("MONGODB_URL")
if not MONGODB_URL:
    raise RuntimeError("MONGODB_URL is missing.")

MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "eduagent")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-this-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", 10080))

COLLECTION_NAME = "study_docs"
TOP_K = int(os.getenv("TOP_K", 5))

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROMA_PATH = os.path.join(BASE_DIR, "chroma_storage")
UPLOADS_PATH = os.path.join(BASE_DIR, "uploads")

# CORS — comma-separated list of allowed origins, e.g. "https://app.example.com,https://www.example.com"
_cors_env = os.getenv("CORS_ORIGINS", "http://localhost:3000")
CORS_ORIGINS = [origin.strip() for origin in _cors_env.split(",") if origin.strip()]