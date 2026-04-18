"""Gemini client (new google-genai SDK) — HyDE expansion, streaming, inline citations."""

from __future__ import annotations

import logging
from typing import Iterator, List, Dict

from google import genai
from google.genai import types

from core.config import GEMINI_API_KEY, GEMINI_MODEL

logger = logging.getLogger(__name__)

_client: genai.Client | None = None


def _get_client() -> genai.Client | None:
    global _client
    if _client is None and GEMINI_API_KEY:
        _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client


# ── Prompts ───────────────────────────────────────────────────────────
_SYSTEM_PROMPT = """You are an expert IT support engineer assistant for an internal IT team.
Answer based ONLY on the runbook excerpts provided. Each excerpt is numbered [1], [2], …
Cite the excerpt(s) you used inline, e.g. "Restart the service [1]" or "See also [2][3]".
Never invent facts outside the excerpts. If nothing in the excerpts addresses the question,
reply exactly: "No relevant information in the indexed runbooks — please escalate to Tier-2."

Format:
1. Brief problem summary (1–2 sentences)
2. Numbered resolution steps — each step with inline [n] citations
3. Prevention tips (only if mentioned in excerpts)"""

_HYDE_PROMPT = """Write a short, plausible runbook paragraph (3–5 sentences) that would
answer the following IT-support question. Use concrete steps, command names, and
error-code vocabulary that would appear in a real runbook. Do NOT preface or explain —
output ONLY the paragraph.

Question: {query}"""


# ── HyDE: hypothetical document for better dense retrieval ─────────────
def hyde_expand(query: str) -> str:
    """Generate a hypothetical runbook passage to use as a retrieval query.

    Falls back to the original query if Gemini is unavailable.
    """
    client = _get_client()
    if client is None:
        return query
    try:
        resp = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=_HYDE_PROMPT.format(query=query),
            config=types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=256,
            ),
        )
        text = (resp.text or "").strip()
        if not text:
            return query
        # Concatenate: retrieval benefits from both the real query and the hypothetical.
        return f"{query}\n\n{text}"
    except Exception as exc:
        logger.warning(f"HyDE expansion failed, falling back to raw query: {exc}")
        return query


# ── Prompt builder ────────────────────────────────────────────────────
def _build_prompt(query: str, context_chunks: List[Dict]) -> str:
    parts: list[str] = []
    for i, chunk in enumerate(context_chunks, 1):
        source = chunk.get("source", "unknown")
        section = chunk.get("section", "N/A")
        text = chunk.get("text", "")
        parts.append(f"[{i}] Source: {source} | Section: {section}\n{text}")
    context_block = "\n\n".join(parts)
    return (
        f"{_SYSTEM_PROMPT}\n\n"
        f"--- RUNBOOK EXCERPTS ---\n{context_block}\n-----------------------\n\n"
        f"ENGINEER'S QUESTION: {query}\n\nRESPONSE:"
    )


# ── One-shot generation ───────────────────────────────────────────────
def generate_resolution(query: str, context_chunks: List[Dict]) -> str:
    client = _get_client()
    if client is None:
        return "[Gemini API key not configured — cannot generate response]"

    prompt = _build_prompt(query, context_chunks)
    try:
        resp = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.2),
        )
        text = (resp.text or "").strip()
        logger.info(f"Gemini response length: {len(text)} chars")
        return text or "[Empty response from Gemini]"
    except Exception as exc:
        logger.error(f"Gemini generation error: {exc}")
        return f"[Error generating response: {exc}]"


# ── Streaming generation (SSE) ────────────────────────────────────────
def stream_resolution(query: str, context_chunks: List[Dict]) -> Iterator[str]:
    """Yield text chunks as Gemini streams them."""
    client = _get_client()
    if client is None:
        yield "[Gemini API key not configured]"
        return

    prompt = _build_prompt(query, context_chunks)
    try:
        stream = client.models.generate_content_stream(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.2),
        )
        for piece in stream:
            if piece.text:
                yield piece.text
    except Exception as exc:
        logger.error(f"Gemini streaming error: {exc}")
        yield f"\n\n[Error: {exc}]"
