"""Ingestion orchestrator — parse → chunk → embed → FAISS → BM25 → Supabase."""

from __future__ import annotations

import hashlib
import logging
from typing import Dict

from ingestion.parser import parse_file
from ingestion.chunker import chunk_text
from retrieval.embedder import embed_texts
from retrieval.faiss_store import add_to_index, save_index
from retrieval import bm25_store
from core.config import FAISS_INDEX_PATH
from core.supabase_client import get_supabase

logger = logging.getLogger(__name__)


def _sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


class DuplicateRunbookError(Exception):
    """Raised when a file with the same content hash is already indexed."""


def index_runbook(
    filepath: str,
    filename: str,
    category: str,
    uploaded_by: str,
    file_type: str,
    is_admin_runbook: bool = False,
) -> Dict:
    """Full ingestion pipeline for a single runbook file."""
    # Hash-based dedup
    content_hash = _sha256_file(filepath)
    sb = get_supabase()

    try:
        existing = (
            sb.table("runbooks")
            .select("id, filename")
            .eq("content_hash", content_hash)
            .limit(1)
            .execute()
        )
        if existing.data:
            dup = existing.data[0]
            raise DuplicateRunbookError(
                f"Identical content already indexed as '{dup['filename']}'"
            )
    except DuplicateRunbookError:
        raise
    except Exception as exc:
        # Column may not exist yet — log and continue (first run / migration pending)
        logger.warning(f"Dedup check skipped: {exc}")

    # Parse
    raw_text = parse_file(filepath, file_type)
    if not raw_text.strip():
        raise ValueError(f"No text extracted from {filename}")

    # Chunk
    chunks = chunk_text(raw_text, filename, category, uploaded_by=uploaded_by, is_admin_runbook=is_admin_runbook)
    if not chunks:
        raise ValueError(f"No chunks produced from {filename}")

    # Embed + add to FAISS
    texts = [c["text"] for c in chunks]
    embeddings = embed_texts(texts)
    add_to_index(embeddings, chunks)
    save_index(FAISS_INDEX_PATH)

    # Rebuild BM25 from the updated metadata
    bm25_store.rebuild_from_metadata()

    # Record in Supabase
    record = {
        "filename": filename,
        "title": filename.rsplit(".", 1)[0],
        "category": category,
        "file_type": file_type,
        "uploaded_by": uploaded_by,
        "chunk_count": len(chunks),
        "is_indexed": True,
        "content_hash": content_hash,
        "is_admin_runbook": is_admin_runbook,
    }
    try:
        result = sb.table("runbooks").insert(record).execute()
        record_id = result.data[0]["id"] if result.data else None
    except Exception as exc:
        # Strip optional columns that may not exist yet and retry
        logger.warning(f"Insert failed, retrying without optional columns: {exc}")
        record.pop("content_hash", None)
        record.pop("is_admin_runbook", None)
        result = sb.table("runbooks").insert(record).execute()
        record_id = result.data[0]["id"] if result.data else None

    return {
        "filename": filename,
        "category": category,
        "chunk_count": len(chunks),
        "record_id": record_id,
    }
