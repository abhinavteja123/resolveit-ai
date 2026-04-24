"""ResolveIT AI — FastAPI Application Entry Point."""

import logging
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from core.config import FAISS_INDEX_PATH, CORS_ORIGINS, validate_env
from core.rate_limit import limiter
from retrieval.faiss_store import load_index
from retrieval.embedder import warmup as embedder_warmup
from retrieval.reranker import warmup as reranker_warmup
from retrieval.bm25_store import rebuild_from_metadata

from routes.auth import router as auth_router
from routes.query import router as query_router
from routes.admin import router as admin_router
from routes.feedback import router as feedback_router
from routes.history import router as history_router
from routes.runbooks import router as runbooks_router
from routes.bookmarks import router as bookmarks_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("resolveit")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Validate env, load FAISS, preload ML models at startup."""
    logger.info("Validating environment configuration...")
    issues = validate_env()
    if not issues:
        logger.info("[OK] All environment variables validated")

    loaded = load_index(FAISS_INDEX_PATH)
    if loaded:
        logger.info(f"[OK] FAISS index loaded from {FAISS_INDEX_PATH}")
    else:
        logger.info(f"[WARN] No FAISS index found at {FAISS_INDEX_PATH} - starting fresh")

    # Preload heavy models so first request is fast
    logger.info("Preloading embedding + reranker models...")
    embedder_warmup()
    reranker_warmup()
    rebuild_from_metadata()
    logger.info("[OK] Models warm, BM25 built")
    yield


app = FastAPI(
    title="ResolveIT AI",
    description="Smart Runbook Resolution Assistant — RAG-powered IT support",
    version="1.1.0",
    lifespan=lifespan,
)

# ── Rate limiter ──────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS — restricted methods/headers ─────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
logger.info(f"CORS origins: {CORS_ORIGINS}")

app.include_router(auth_router)
app.include_router(query_router)
app.include_router(admin_router)
app.include_router(feedback_router)
app.include_router(history_router)
app.include_router(runbooks_router)
app.include_router(bookmarks_router)


@app.get("/")
async def root():
    return {
        "app": "ResolveIT AI",
        "version": "1.1.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    from retrieval.faiss_store import get_index, get_metadata

    faiss_idx = get_index()
    return {
        "status": "healthy",
        "faiss_vectors": faiss_idx.ntotal if faiss_idx else 0,
        "faiss_metadata_entries": len(get_metadata()),
    }
