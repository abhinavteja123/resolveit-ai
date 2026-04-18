"""BM25 lexical index — kept in sync with FAISS metadata for hybrid retrieval."""

from __future__ import annotations

import logging
import re
from typing import Dict, List

from rank_bm25 import BM25Okapi

from retrieval.faiss_store import get_metadata

logger = logging.getLogger(__name__)

_bm25: BM25Okapi | None = None
_doc_count: int = 0

_TOKEN_RE = re.compile(r"[A-Za-z0-9_]+")


def _tokenize(text: str) -> list[str]:
    return [t.lower() for t in _TOKEN_RE.findall(text or "")]


def rebuild_from_metadata() -> None:
    """Rebuild BM25 index from current FAISS metadata. Called on startup + after uploads."""
    global _bm25, _doc_count
    meta = get_metadata()
    if not meta:
        _bm25 = None
        _doc_count = 0
        logger.info("BM25: no documents to index")
        return
    corpus = [_tokenize(m.get("text", "")) for m in meta]
    _bm25 = BM25Okapi(corpus)
    _doc_count = len(corpus)
    logger.info(f"BM25: indexed {_doc_count} chunks")


def search(query: str, top_k: int = 10, filter_fn=None) -> List[Dict]:
    """Return top-k candidates by BM25 score, each with metadata + 'bm25_rank'."""
    if _bm25 is None or _doc_count == 0:
        return []
    tokens = _tokenize(query)
    if not tokens:
        return []
    scores = _bm25.get_scores(tokens)
    meta = get_metadata()
    pool = min(max(top_k * 5, 50), _doc_count) if filter_fn else min(top_k, _doc_count)
    top_idx = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:pool]
    results: list[Dict] = []
    for rank, i in enumerate(top_idx):
        if scores[i] <= 0:
            continue
        entry = dict(meta[i])
        entry["bm25_score"] = float(scores[i])
        entry["bm25_rank"] = rank
        if filter_fn and not filter_fn(entry):
            continue
        results.append(entry)
        if len(results) >= top_k:
            break
    return results
