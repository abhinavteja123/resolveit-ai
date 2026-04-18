"""FAISS index management — cosine similarity via IndexFlatIP + normalized vectors."""

from __future__ import annotations

import json
import logging
import os
from typing import Dict, List

import faiss
import numpy as np

logger = logging.getLogger(__name__)

_index: faiss.IndexFlatIP | None = None
_metadata: List[Dict] = []
_dimension: int = 384  # BGE-small-en-v1.5 output dimension


def get_index() -> faiss.IndexFlatIP:
    global _index
    if _index is None:
        _index = faiss.IndexFlatIP(_dimension)
    return _index


def get_metadata() -> List[Dict]:
    return _metadata


def add_to_index(embeddings: np.ndarray, metadata_entries: List[Dict]) -> None:
    """Add vectors + metadata to the live index. Vectors must be L2-normalized."""
    global _index, _metadata
    idx = get_index()
    if idx.d != embeddings.shape[1]:
        # Rebuild index if dimension mismatch (e.g. model changed)
        logger.warning(
            f"Rebuilding FAISS index: dim mismatch {idx.d} → {embeddings.shape[1]}"
        )
        _index = faiss.IndexFlatIP(embeddings.shape[1])
        idx = _index
    idx.add(embeddings)
    _metadata.extend(metadata_entries)


def save_index(path: str) -> None:
    os.makedirs(path, exist_ok=True)
    idx = get_index()
    faiss.write_index(idx, os.path.join(path, "index.bin"))
    with open(os.path.join(path, "metadata.json"), "w", encoding="utf-8") as f:
        json.dump(_metadata, f, ensure_ascii=False, indent=2)


def load_index(path: str) -> bool:
    global _index, _metadata
    index_path = os.path.join(path, "index.bin")
    meta_path = os.path.join(path, "metadata.json")

    if not os.path.exists(index_path):
        return False

    _index = faiss.read_index(index_path)
    if os.path.exists(meta_path):
        with open(meta_path, "r", encoding="utf-8") as f:
            _metadata = json.load(f)
    else:
        _metadata = []
    return True


def remove_runbook_from_index(filename: str) -> int:
    """Remove all chunks for *filename* from FAISS + metadata. Returns chunk count removed."""
    global _index, _metadata

    idx = get_index()
    if idx.ntotal == 0 or not _metadata:
        return 0

    keep = [i for i, m in enumerate(_metadata) if m.get("source") != filename]
    removed = idx.ntotal - len(keep)

    if removed == 0:
        return 0

    if not keep:
        _index = faiss.IndexFlatIP(_dimension)
        _metadata = []
        return removed

    # Reconstruct kept vectors and rebuild index
    kept_vectors = np.vstack([idx.reconstruct(i) for i in keep])
    new_idx = faiss.IndexFlatIP(_dimension)
    new_idx.add(kept_vectors)
    _index = new_idx
    _metadata = [_metadata[i] for i in keep]

    logger.info(f"Removed {removed} chunks for '{filename}' — {len(keep)} remain")
    return removed


def search(query_vector: np.ndarray, top_k: int = 10, filter_fn=None) -> List[Dict]:
    """Return nearest chunks by cosine similarity (inner product on normalized vectors).

    If filter_fn is provided, a larger pool is fetched and filtered down to top_k.
    """
    idx = get_index()
    if idx.ntotal == 0:
        return []

    # Fetch a larger pool when filtering so we have enough results after the filter.
    pool = min(max(top_k * 5, 50), idx.ntotal) if filter_fn else min(top_k, idx.ntotal)
    scores, indices = idx.search(query_vector, pool)

    results: list[Dict] = []
    for score, i in zip(scores[0], indices[0]):
        if i < 0 or i >= len(_metadata):
            continue
        entry = dict(_metadata[i])
        entry["score"] = float(score)
        entry["faiss_rank"] = len(results)
        if filter_fn and not filter_fn(entry):
            continue
        results.append(entry)
        if len(results) >= top_k:
            break

    return results
