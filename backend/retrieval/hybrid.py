"""Hybrid retrieval — fuses FAISS (dense) + BM25 (lexical) with Reciprocal Rank Fusion."""

from __future__ import annotations

import logging
from typing import Dict, List

import numpy as np

from retrieval import bm25_store
from retrieval.embedder import embed_query
from retrieval.faiss_store import search as faiss_search

logger = logging.getLogger(__name__)

_RRF_K = 60  # standard RRF constant


def _key(chunk: Dict) -> str:
    """Stable dedup key per chunk."""
    return chunk.get("chunk_id") or f"{chunk.get('source')}::{chunk.get('section')}::{hash(chunk.get('text',''))}"


def hybrid_search(
    query: str,
    query_vector: np.ndarray | None = None,
    top_k: int = 10,
    pool_size: int = 20,
    filter_fn=None,
) -> List[Dict]:
    """Return fused top_k chunks.

    Strategy: Reciprocal Rank Fusion over FAISS and BM25 rankings.
    RRF score = Σ 1 / (k + rank_i). Robust, no score normalization needed.
    """
    if query_vector is None:
        query_vector = embed_query(query)

    dense = faiss_search(query_vector, top_k=pool_size, filter_fn=filter_fn)
    lexical = bm25_store.search(query, top_k=pool_size, filter_fn=filter_fn)

    fused: dict[str, Dict] = {}

    for rank, item in enumerate(dense):
        k = _key(item)
        entry = fused.setdefault(k, dict(item))
        entry["rrf_score"] = entry.get("rrf_score", 0.0) + 1.0 / (_RRF_K + rank)
        entry["dense_rank"] = rank

    for rank, item in enumerate(lexical):
        k = _key(item)
        entry = fused.setdefault(k, dict(item))
        entry["rrf_score"] = entry.get("rrf_score", 0.0) + 1.0 / (_RRF_K + rank)
        entry["lex_rank"] = rank

    ranked = sorted(fused.values(), key=lambda c: c.get("rrf_score", 0.0), reverse=True)
    logger.info(
        f"Hybrid: dense={len(dense)} lex={len(lexical)} fused={len(ranked)} → top {top_k}"
    )
    return ranked[:top_k]
