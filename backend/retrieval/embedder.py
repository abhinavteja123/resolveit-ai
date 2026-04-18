"""Embedding wrapper — BGE-small-en-v1.5 with L2 normalization (cosine-ready)."""

from __future__ import annotations

import logging
import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List

from core.config import EMBEDDING_MODEL

logger = logging.getLogger(__name__)

_model: SentenceTransformer | None = None

# BGE models recommend a short prefix for the query side only.
_QUERY_PREFIX = "Represent this sentence for searching relevant passages: "


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        logger.info(f"Loading embedding model: {EMBEDDING_MODEL}")
        _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model


def warmup() -> None:
    """Load model at startup (called from lifespan)."""
    _get_model()


def embed_texts(texts: List[str]) -> np.ndarray:
    """Embed passages — returns L2-normalized (N, D) float32 array."""
    model = _get_model()
    vectors = model.encode(
        texts,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    return vectors.astype(np.float32)


def embed_query(query: str) -> np.ndarray:
    """Embed a single query with BGE-style prefix → normalized (1, D) float32."""
    model = _get_model()
    prefixed = _QUERY_PREFIX + query
    vector = model.encode(
        [prefixed],
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    return vector.astype(np.float32)


def embedding_dim() -> int:
    return _get_model().get_sentence_embedding_dimension()
