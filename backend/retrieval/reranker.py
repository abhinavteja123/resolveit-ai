"""Cross-encoder re-ranker — BAAI/bge-reranker-base for precision."""

from __future__ import annotations

import logging
import math
from typing import Dict, List

from sentence_transformers import CrossEncoder

from core.config import RERANKER_MODEL

logger = logging.getLogger(__name__)

_reranker: CrossEncoder | None = None


def _get_reranker() -> CrossEncoder:
    global _reranker
    if _reranker is None:
        logger.info(f"Loading reranker: {RERANKER_MODEL}")
        _reranker = CrossEncoder(RERANKER_MODEL)
    return _reranker


def warmup() -> None:
    _get_reranker()


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def rerank(query: str, candidates: List[Dict], top_n: int = 3) -> List[Dict]:
    """Re-rank candidate chunks; attaches 'rerank_score' (0–1) and returns top_n."""
    if not candidates:
        return []

    model = _get_reranker()
    pairs = [(query, c["text"]) for c in candidates]
    raw_scores = model.predict(pairs)

    for candidate, raw in zip(candidates, raw_scores):
        candidate["rerank_score"] = _sigmoid(float(raw))

    candidates.sort(key=lambda c: c["rerank_score"], reverse=True)
    return candidates[:top_n]
