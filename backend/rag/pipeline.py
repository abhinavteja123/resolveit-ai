"""Full RAG pipeline — HyDE → hybrid retrieve → rerank → generate → log.

Exposes both a blocking `run_rag_pipeline` and a streaming `stream_rag_pipeline`.
"""

from __future__ import annotations

import hashlib
import logging
from typing import Dict, Iterator, List, Tuple

from cachetools import TTLCache

from core.gemini_client import generate_resolution, hyde_expand, stream_resolution
from core.supabase_client import get_supabase
from core.config import QUERY_CACHE_SIZE, QUERY_CACHE_TTL_SECONDS
from retrieval.embedder import embed_query
from retrieval.hybrid import hybrid_search
from retrieval.reranker import rerank

logger = logging.getLogger(__name__)

# ── Query result cache (in-process, TTL) ──────────────────────────────
_cache: TTLCache = TTLCache(maxsize=QUERY_CACHE_SIZE, ttl=QUERY_CACHE_TTL_SECONDS)


def _cache_key(query: str, scope: str, user_uid: str) -> str:
    raw = f"{scope}:{user_uid}:{query.strip().lower()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _build_filter(scope: str, user_uid: str):
    """Return a filter function for chunk metadata based on the requested scope."""
    if scope == "admin":
        # Legacy chunks without is_admin_runbook are treated as admin-owned.
        return lambda c: c.get("is_admin_runbook", True)
    if scope == "mine":
        return lambda c: c.get("uploaded_by") == user_uid
    if scope == "both":
        return lambda c: c.get("is_admin_runbook", True) or c.get("uploaded_by") == user_uid
    return None  # "all" — no filter


# ── Shared retrieval stage ────────────────────────────────────────────
def _retrieve(query: str, scope: str = "admin", user_uid: str = "") -> Tuple[List[Dict], float]:
    """HyDE → embed → hybrid → rerank. Returns (top_chunks, top_confidence)."""
    expanded = hyde_expand(query)
    query_vector = embed_query(expanded)

    filter_fn = _build_filter(scope, user_uid)
    candidates = hybrid_search(expanded, query_vector=query_vector, top_k=12, filter_fn=filter_fn)
    logger.info(f"Hybrid returned {len(candidates)} candidates (scope={scope})")
    if not candidates:
        return [], 0.0

    top_chunks = rerank(query, candidates, top_n=5)
    top_confidence = top_chunks[0].get("rerank_score", 0.0) if top_chunks else 0.0
    return top_chunks, top_confidence


def _sources_from(chunks: List[Dict]) -> List[Dict]:
    """Map chunks → source dicts with citation numbers aligned to prompt order."""
    sources: list[Dict] = []
    for i, c in enumerate(chunks, 1):
        sources.append(
            {
                "citation": i,
                "filename": c.get("source", "unknown"),
                "section": c.get("section", "N/A"),
                "category": c.get("category", "other"),
            }
        )
    return sources


def _log_query(user_id: str, query: str, answer: str, sources: List[Dict], confidence: float) -> str | None:
    try:
        sb = get_supabase()
        record = {
            "user_id": user_id,
            "query_text": query,
            "retrieved_sources": [s["filename"] for s in sources],
            "llm_response": answer,
            "confidence_score": confidence,
        }
        result = sb.table("query_logs").insert(record).execute()
        if result.data:
            return result.data[0]["id"]
    except Exception as exc:
        logger.warning(f"Failed to log query to Supabase: {exc}")
    return None


# ── Blocking pipeline ─────────────────────────────────────────────────
def run_rag_pipeline(query: str, user_id: str, scope: str = "admin") -> Dict:
    logger.info(f"RAG pipeline started: '{query[:80]}' scope={scope}")
    key = _cache_key(query, scope, user_id)

    cached = _cache.get(key)
    if cached:
        logger.info("Cache hit — returning cached answer")
        query_log_id = _log_query(
            user_id, query, cached["answer"], cached["sources"], cached["top_confidence"]
        )
        return {**cached, "query_log_id": query_log_id, "cached": True}

    top_chunks, top_confidence = _retrieve(query, scope=scope, user_uid=user_id)
    if not top_chunks:
        no_result_msg = (
            "No runbooks found for the selected scope. "
            "Try switching to 'Admin Runbooks' or upload your own runbook first."
        )
        return {
            "answer": no_result_msg,
            "sources": [],
            "top_confidence": 0.0,
            "query_log_id": None,
            "cached": False,
        }

    answer = generate_resolution(query, top_chunks)
    sources = _sources_from(top_chunks)
    top_confidence = round(top_confidence, 4)

    query_log_id = _log_query(user_id, query, answer, sources, top_confidence)

    result = {
        "answer": answer,
        "sources": sources,
        "top_confidence": top_confidence,
        "query_log_id": query_log_id,
        "cached": False,
    }
    _cache[key] = {"answer": answer, "sources": sources, "top_confidence": top_confidence}
    return result


# ── Streaming pipeline ────────────────────────────────────────────────
def stream_rag_pipeline(query: str, user_id: str, scope: str = "admin") -> Iterator[Dict]:
    """Yield SSE-ready dicts: retrieval meta first, then answer tokens, then done event."""
    logger.info(f"RAG streaming started: '{query[:80]}' scope={scope}")

    top_chunks, top_confidence = _retrieve(query, scope=scope, user_uid=user_id)
    if not top_chunks:
        no_result_msg = (
            "No runbooks found for the selected scope. "
            "Try switching to 'Admin Runbooks' or upload your own runbook first."
        )
        yield {"event": "sources", "data": []}
        yield {"event": "token", "data": no_result_msg}
        yield {"event": "done", "data": {"query_log_id": None, "top_confidence": 0.0}}
        return

    sources = _sources_from(top_chunks)
    yield {"event": "sources", "data": sources}

    buffer: list[str] = []
    for piece in stream_resolution(query, top_chunks):
        buffer.append(piece)
        yield {"event": "token", "data": piece}

    full_answer = "".join(buffer).strip()
    top_confidence = round(top_confidence, 4)
    query_log_id = _log_query(user_id, query, full_answer, sources, top_confidence)

    _cache[_cache_key(query, scope, user_id)] = {
        "answer": full_answer,
        "sources": sources,
        "top_confidence": top_confidence,
    }

    yield {
        "event": "done",
        "data": {
            "query_log_id": query_log_id,
            "top_confidence": top_confidence,
        },
    }
