"""Configuration module — loads all environment variables and validates them."""

import os
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the backend directory, regardless of where the server is started from
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)

logger = logging.getLogger(__name__)

# ── Supabase (Database) ──────────────────────────────────────────────
SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# ── Google Gemini ─────────────────────────────────────────────────────
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_FALLBACK_MODELS: list[str] = [
    m.strip()
    for m in os.getenv("GEMINI_FALLBACK_MODELS", "gemini-2.0-flash,gemini-2.0-flash-lite").split(",")
    if m.strip()
]

# ── Firebase (Authentication) ─────────────────────────────────────────
_default_creds = str(Path(__file__).resolve().parent.parent / "firebase-service-account.json")
FIREBASE_CREDENTIALS_PATH: str = os.getenv("FIREBASE_CREDENTIALS_PATH", _default_creds)

# ── FAISS ─────────────────────────────────────────────────────────────
_default_faiss = str(Path(__file__).resolve().parent.parent / "faiss_index")
FAISS_INDEX_PATH: str = os.getenv("FAISS_INDEX_PATH", _default_faiss)

# ── Embedding / Reranker models ───────────────────────────────────────
EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
RERANKER_MODEL: str = os.getenv("RERANKER_MODEL", "BAAI/bge-reranker-base")

# ── Admin ─────────────────────────────────────────────────────────────
ADMIN_EMAILS: list[str] = [
    e.strip() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()
]

# ── CORS ──────────────────────────────────────────────────────────────
CORS_ORIGINS: list[str] = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
    if o.strip()
]

# ── Upload / Rate limit ───────────────────────────────────────────────
MAX_UPLOAD_MB: int = int(os.getenv("MAX_UPLOAD_MB", "20"))
MAX_UPLOAD_BYTES: int = MAX_UPLOAD_MB * 1024 * 1024
QUERY_RATE_LIMIT: str = os.getenv("QUERY_RATE_LIMIT", "20/minute")

# ── Cache ─────────────────────────────────────────────────────────────
QUERY_CACHE_SIZE: int = int(os.getenv("QUERY_CACHE_SIZE", "256"))
QUERY_CACHE_TTL_SECONDS: int = int(os.getenv("QUERY_CACHE_TTL_SECONDS", "600"))


def validate_env() -> list[str]:
    """Validate required environment variables on startup."""
    issues: list[str] = []

    if not SUPABASE_URL:
        issues.append("[ERROR] SUPABASE_URL is not set - database operations will fail")
    if not SUPABASE_SERVICE_ROLE_KEY:
        issues.append("[ERROR] SUPABASE_SERVICE_ROLE_KEY is not set - database operations will fail")
    if SUPABASE_ANON_KEY and SUPABASE_ANON_KEY == SUPABASE_SERVICE_ROLE_KEY:
        issues.append("[WARN] SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are identical - verify keys")

    if not GEMINI_API_KEY:
        issues.append("[WARN] GEMINI_API_KEY is not set - LLM generation will return placeholder text")
    if not os.path.exists(FIREBASE_CREDENTIALS_PATH):
        issues.append(f"[WARN] Firebase credentials not found at '{FIREBASE_CREDENTIALS_PATH}' - auth will fail")
    if not ADMIN_EMAILS:
        issues.append("[WARN] ADMIN_EMAILS is empty - no users will have admin access")
    else:
        logger.info(f"[OK] Admin emails loaded: {ADMIN_EMAILS}")

    for issue in issues:
        if issue.startswith("[ERROR]"):
            logger.error(issue)
        else:
            logger.warning(issue)

    return issues
