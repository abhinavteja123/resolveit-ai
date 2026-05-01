"""Full RAG pipeline — HyDE → hybrid retrieve → rerank → generate → log.

Exposes both a blocking `run_rag_pipeline` and a streaming `stream_rag_pipeline`.
Mode-aware: `mode` selects retrieval knobs and the system prompt
(see `rag/modes.py`).
"""

from __future__ import annotations

import hashlib
import logging
from typing import Dict, Iterator, List, Tuple

from cachetools import TTLCache

from core.gemini_client import (
    generate_followups,
    generate_resolution,
    hyde_expand,
    stream_resolution,
)
from core.supabase_client import get_supabase
from core.config import QUERY_CACHE_SIZE, QUERY_CACHE_TTL_SECONDS
from rag.modes import FOLLOW_UP_PROMPT, ModeConfig, get_mode
from retrieval.embedder import embed_query
from retrieval.hybrid import hybrid_search
from retrieval.reranker import rerank

logger = logging.getLogger(__name__)

# ── Query result cache (in-process, TTL) ──────────────────────────────
_cache: TTLCache = TTLCache(maxsize=QUERY_CACHE_SIZE, ttl=QUERY_CACHE_TTL_SECONDS)

# Below this rerank score the top chunk is unrelated enough that we refuse
# to answer rather than let the LLM stitch tangential excerpts into a
# hallucinated response.
_MIN_TOP_CONFIDENCE = 0.25

# The exact sentinel the LLM emits when the gate-check fails. We detect it
# post-generation to strip sources/confidence so history, cache, and the UI
# treat it as a true no-match rather than an answer with bogus citations.
_ESCALATION_PHRASE = "No relevant information in the indexed runbooks"


def _is_escalation(answer: str) -> bool:
    return bool(answer) and answer.strip().startswith(_ESCALATION_PHRASE)


def _cache_key(query: str, scope: str, user_uid: str, mode: str) -> str:
    raw = f"{mode}:{scope}:{user_uid}:{query.strip().lower()}"
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
def _retrieve(
    query: str,
    cfg: ModeConfig,
    scope: str = "admin",
    user_uid: str = "",
) -> Tuple[List[Dict], float]:
    """HyDE → embed → hybrid → rerank. Returns (top_chunks, top_confidence)."""
    expanded = hyde_expand(query) if cfg.use_hyde else query
    query_vector = embed_query(expanded)

    filter_fn = _build_filter(scope, user_uid)
    candidates = hybrid_search(
        expanded, query_vector=query_vector, top_k=cfg.top_k, filter_fn=filter_fn
    )
    logger.info(
        f"Hybrid returned {len(candidates)} candidates "
        f"(scope={scope}, mode={cfg.name}, top_k={cfg.top_k})"
    )
    if not candidates:
        return [], 0.0

    top_chunks = rerank(query, candidates, top_n=cfg.top_n)
    top_confidence = top_chunks[0].get("rerank_score", 0.0) if top_chunks else 0.0
    if top_confidence < _MIN_TOP_CONFIDENCE:
        logger.info(
            f"Top rerank score {top_confidence:.3f} below threshold "
            f"{_MIN_TOP_CONFIDENCE} — refusing to answer"
        )
        return [], 0.0
    return top_chunks, top_confidence


def _sources_from(chunks: List[Dict]) -> List[Dict]:
    """Map chunks → source dicts with citation numbers aligned to prompt order."""
    sources: list[Dict] = []
    for i, c in enumerate(chunks, 1):
        text = (c.get("text") or "").strip().replace("\n", " ")
        excerpt = text[:240] + ("…" if len(text) > 240 else "")
        sources.append(
            {
                "citation": i,
                "filename": c.get("source", "unknown"),
                "section": c.get("section", "N/A"),
                "category": c.get("category", "other"),
                "excerpt": excerpt,
            }
        )
    return sources


def _log_query(
    user_id: str,
    query: str,
    answer: str,
    sources: List[Dict],
    confidence: float,
    thread_id: str | None = None,
    mode: str | None = None,
    regenerate_of: str | None = None,
) -> str | None:
    try:
        sb = get_supabase()
        record = {
            "user_id": user_id,
            "query_text": query,
            "retrieved_sources": [s["filename"] for s in sources],
            "llm_response": answer,
            "confidence_score": confidence,
        }
        if thread_id:
            record["thread_id"] = thread_id
        if mode:
            record["mode"] = mode
        if regenerate_of:
            record["regenerate_of"] = regenerate_of
        result = _insert_with_fallback(sb, record)
        if result and result.data:
            return result.data[0]["id"]
    except Exception as exc:
        logger.warning(f"Failed to log query to Supabase: {exc}")
    return None


def _insert_with_fallback(sb, record: dict):
    """Insert query_log, dropping unknown columns one at a time when migrations lag.

    Mirrors the migration-005 backward-compat pattern: if the DB rejects a
    column we just added, retry without it instead of crashing the request.
    """
    optional_cols = ("regenerate_of", "mode", "thread_id")
    rec = dict(record)
    while True:
        try:
            return sb.table("query_logs").insert(rec).execute()
        except Exception as exc:
            msg = str(exc)
            dropped = False
            for col in optional_cols:
                if col in rec and col in msg:
                    logger.warning(
                        f"[DB] {col} column missing — retrying insert without it "
                        f"(run latest migration)"
                    )
                    rec.pop(col)
                    dropped = True
                    break
            if not dropped:
                raise


def _safe_followups(query: str, answer: str) -> List[str]:
    if _is_escalation(answer) or not answer:
        return []
    try:
        return generate_followups(query, answer, FOLLOW_UP_PROMPT, n=3)
    except Exception as exc:
        logger.warning(f"follow-up generation failed: {exc}")
        return []


# ── Blocking pipeline ─────────────────────────────────────────────────
def run_rag_pipeline(
    query: str,
    user_id: str,
    scope: str = "admin",
    thread_id: str | None = None,
    mode: str = "standard",
    regenerate_of: str | None = None,
) -> Dict:
    cfg = get_mode(mode)
    logger.info(f"RAG pipeline started: '{query[:80]}' scope={scope} mode={cfg.name}")
    key = _cache_key(query, scope, user_id, cfg.name)

    # Regenerations skip the cache so the user actually gets a fresh answer.
    cached = None if regenerate_of else _cache.get(key)
    if cached:
        logger.info("Cache hit — returning cached answer")
        query_log_id = _log_query(
            user_id,
            query,
            cached["answer"],
            cached["sources"],
            cached["top_confidence"],
            thread_id=thread_id,
            mode=cfg.name,
        )
        return {
            **cached,
            "query_log_id": query_log_id,
            "cached": True,
            "mode": cfg.name,
        }

    top_chunks, top_confidence = _retrieve(query, cfg, scope=scope, user_uid=user_id)
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
            "mode": cfg.name,
            "follow_ups": [],
        }

    answer = generate_resolution(
        query, top_chunks, system_prompt=cfg.system_prompt, temperature=cfg.temperature
    )
    sources = _sources_from(top_chunks)
    top_confidence = round(top_confidence, 4)

    if _is_escalation(answer):
        sources = []
        top_confidence = 0.0

    query_log_id = _log_query(
        user_id,
        query,
        answer,
        sources,
        top_confidence,
        thread_id=thread_id,
        mode=cfg.name,
        regenerate_of=regenerate_of,
    )

    follow_ups = _safe_followups(query, answer)

    result = {
        "answer": answer,
        "sources": sources,
        "top_confidence": top_confidence,
        "query_log_id": query_log_id,
        "cached": False,
        "mode": cfg.name,
        "follow_ups": follow_ups,
    }
    _cache[key] = {
        "answer": answer,
        "sources": sources,
        "top_confidence": top_confidence,
        "follow_ups": follow_ups,
    }
    return result


# ── Streaming pipeline ────────────────────────────────────────────────
def stream_rag_pipeline(
    query: str,
    user_id: str,
    scope: str = "admin",
    thread_id: str | None = None,
    mode: str = "standard",
    regenerate_of: str | None = None,
) -> Iterator[Dict]:
    """Yield SSE-ready dicts: retrieval meta first, then answer tokens, then done event."""
    cfg = get_mode(mode)
    logger.info(f"RAG streaming started: '{query[:80]}' scope={scope} mode={cfg.name}")

    yield {"event": "mode", "data": {"mode": cfg.name}}

    top_chunks, top_confidence = _retrieve(query, cfg, scope=scope, user_uid=user_id)
    if not top_chunks:
        no_result_msg = (
            "No runbooks found for the selected scope. "
            "Try switching to 'Admin Runbooks' or upload your own runbook first."
        )
        yield {"event": "sources", "data": []}
        yield {"event": "token", "data": no_result_msg}
        yield {
            "event": "done",
            "data": {
                "query_log_id": None,
                "top_confidence": 0.0,
                "mode": cfg.name,
                "follow_ups": [],
            },
        }
        return

    sources = _sources_from(top_chunks)
    yield {"event": "sources", "data": sources}

    buffer: list[str] = []
    for piece in stream_resolution(
        query, top_chunks, system_prompt=cfg.system_prompt, temperature=cfg.temperature
    ):
        buffer.append(piece)
        yield {"event": "token", "data": piece}

    full_answer = "".join(buffer).strip()
    top_confidence = round(top_confidence, 4)

    if _is_escalation(full_answer):
        # LLM refused via gate-check — clear sources/confidence so storage
        # and downstream consumers treat this as a true no-match. The UI
        # already got a sources event; the frontend detects the sentinel
        # and renders the empty-state card.
        sources = []
        top_confidence = 0.0

    query_log_id = _log_query(
        user_id,
        query,
        full_answer,
        sources,
        top_confidence,
        thread_id=thread_id,
        mode=cfg.name,
        regenerate_of=regenerate_of,
    )

    follow_ups = _safe_followups(query, full_answer)

    _cache[_cache_key(query, scope, user_id, cfg.name)] = {
        "answer": full_answer,
        "sources": sources,
        "top_confidence": top_confidence,
        "follow_ups": follow_ups,
    }

    yield {
        "event": "done",
        "data": {
            "query_log_id": query_log_id,
            "top_confidence": top_confidence,
            "mode": cfg.name,
            "follow_ups": follow_ups,
        },
    }
