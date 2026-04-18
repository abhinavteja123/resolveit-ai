"""Recursive character chunker — robust, hierarchy-aware splitting."""

from __future__ import annotations

import uuid
from typing import Dict, List

from langchain_text_splitters import RecursiveCharacterTextSplitter

# Approx 400 tokens ≈ 1600 chars; 80-char overlap preserves boundary context.
_CHUNK_CHARS = 1600
_CHUNK_OVERLAP = 200

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=_CHUNK_CHARS,
    chunk_overlap=_CHUNK_OVERLAP,
    separators=["\n## ", "\n# ", "\n### ", "\n\n", "\n", ". ", " ", ""],
    length_function=len,
    is_separator_regex=False,
)


def _guess_section(chunk: str) -> str:
    """First non-blank line, stripped of markdown."""
    for line in chunk.split("\n"):
        stripped = line.strip().lstrip("#").strip().rstrip(":")
        if stripped:
            return stripped[:120]
    return "N/A"


def chunk_text(
    text: str,
    filename: str,
    category: str,
    uploaded_by: str = "",
    is_admin_runbook: bool = False,
) -> List[Dict]:
    """Split document text into metadata-annotated chunks."""
    pieces = _splitter.split_text(text)
    chunks: list[Dict] = []
    for piece in pieces:
        if not piece.strip():
            continue
        chunks.append(
            {
                "chunk_id": str(uuid.uuid4()),
                "text": piece,
                "source": filename,
                "section": _guess_section(piece),
                "category": category,
                "uploaded_by": uploaded_by,
                "is_admin_runbook": is_admin_runbook,
            }
        )
    return chunks
