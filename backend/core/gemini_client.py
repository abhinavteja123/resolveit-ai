"""Gemini client (new google-genai SDK) — HyDE expansion, streaming, inline citations.

Falls back through GEMINI_FALLBACK_MODELS when the primary model returns 503 / overload.
"""

from __future__ import annotations

import logging
import time
from typing import Iterator, List, Dict

from google import genai
from google.genai import types

from core.config import GEMINI_API_KEY, GEMINI_MODEL, GEMINI_FALLBACK_MODELS

logger = logging.getLogger(__name__)

_client: genai.Client | None = None


def _get_client() -> genai.Client | None:
    global _client
    if _client is None and GEMINI_API_KEY:
        _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client


def _model_list() -> list[str]:
    """Primary model followed by unique fallbacks."""
    seen: set[str] = set()
    result: list[str] = []
    for m in [GEMINI_MODEL] + GEMINI_FALLBACK_MODELS:
        if m not in seen:
            seen.add(m)
            result.append(m)
    return result


def _is_overload(exc: Exception) -> bool:
    """True when the error is a transient capacity/quota issue worth retrying."""
    msg = str(exc).lower()
    return any(k in msg for k in ("503", "unavailable", "overload", "resource_exhausted", "429", "quota"))


def _backoff_delay(attempt: int, exc: Exception) -> None:
    """Brief sleep before trying next model. Skip long delays for quota errors."""
    msg = str(exc).lower()
    if "429" in msg or "quota" in msg or "resource_exhausted" in msg:
        return  # Quota won't recover in seconds — move on immediately
    delay = min(2 ** attempt, 8)  # 1s, 2s, 4s, cap at 8s
    logger.info(f"[Gemini] Waiting {delay}s before next model...")
    time.sleep(delay)


# ── Prompts ───────────────────────────────────────────────────────────
_SYSTEM_PROMPT = """You are an expert IT support engineer assistant for an internal IT team.
Answer based ONLY on the runbook excerpts provided. Each excerpt is numbered [1], [2], …
Cite the excerpt(s) you used inline, e.g. "Restart the service [1]" or "See also [2][3]".
Never invent facts outside the excerpts.

GATE CHECK — do this before writing anything else:
Ask yourself: "Does at least one excerpt DIRECTLY address the user's specific topic?"
- DIRECTLY means the excerpt's subject matter is the same problem the user is asking about,
  not a tangentially-related issue that happens to share some commands or keywords.
- Example: if the question is about "log rotation not working" but the excerpts discuss
  "disk space full" and only mention log truncation as a side remedy, that is NOT direct.
- Example: if the question is about "SSL certificate expired" but excerpts discuss
  unrelated server failures, that is NOT direct.

If the gate check fails, reply with EXACTLY this single line and nothing else:
"No relevant information in the indexed runbooks — please escalate to Tier-2."

If the gate check passes, follow the output format below.

Output format — follow EXACTLY. Do NOT number the section labels themselves;
the only numbered list in your response must be the resolution steps.

**Summary**
One or two sentences describing the problem.

**Resolution Steps**
1. First concrete action with inline [n] citation. Put commands in fenced code blocks.
2. Second action [n].
3. (continue as needed — every numbered item must be a real step, never a label)

**Prevention Tips**
- Short bullet with [n] citation.
- Another bullet [n].

Omit the Prevention Tips section entirely if the excerpts don't mention any."""

_HYDE_PROMPT = """Write a short, plausible runbook paragraph (3–5 sentences) that would
answer the following IT-support question. Use concrete steps, command names, and
error-code vocabulary that would appear in a real runbook. Do NOT preface or explain —
output ONLY the paragraph.

Question: {query}"""


# ── HyDE: hypothetical document for better dense retrieval ─────────────
def hyde_expand(query: str) -> str:
    """Generate a hypothetical runbook passage to use as a retrieval query.

    Falls back to the original query if all models are unavailable.
    """
    client = _get_client()
    if client is None:
        return query

    for i, model in enumerate(_model_list()):
        try:
            if i > 0:
                logger.warning(f"[Gemini] HyDE falling back to {model}")
            resp = client.models.generate_content(
                model=model,
                contents=_HYDE_PROMPT.format(query=query),
                config=types.GenerateContentConfig(
                    temperature=0.3,
                    max_output_tokens=256,
                ),
            )
            text = (resp.text or "").strip()
            return f"{query}\n\n{text}" if text else query
        except Exception as exc:
            logger.warning(f"[Gemini] HyDE error on {model}: {exc}")
            if i < len(_model_list()) - 1 and _is_overload(exc):
                continue
            return query  # Fall back to raw query on final failure

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
    models = _model_list()

    for i, model in enumerate(models):
        try:
            if i > 0:
                logger.warning(f"[Gemini] Falling back to {model} for generation")
            resp = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.2),
            )
            text = (resp.text or "").strip()
            logger.info(f"[Gemini] Response: {len(text)} chars via {model}")
            return text or "[Empty response from Gemini]"
        except Exception as exc:
            logger.error(f"[Gemini] Generation error on {model}: {exc}")
            if i < len(models) - 1 and _is_overload(exc):
                logger.info(f"[Gemini] Model {model} overloaded, trying next...")
                _backoff_delay(i, exc)
                continue
            return f"[Error generating response: {exc}]"

    return "[All Gemini models unavailable — please try again later]"


# ── Streaming generation (SSE) ────────────────────────────────────────
def stream_resolution(query: str, context_chunks: List[Dict]) -> Iterator[str]:
    """Yield text chunks, automatically falling back on 503 / overload errors."""
    client = _get_client()
    if client is None:
        yield "[Gemini API key not configured]"
        return

    prompt = _build_prompt(query, context_chunks)
    models = _model_list()

    yielded_any = False

    for i, model in enumerate(models):
        try:
            if i > 0:
                logger.warning(f"[Gemini] Streaming falling back to {model}")
            stream = client.models.generate_content_stream(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.2),
            )
            for piece in stream:
                if piece.text:
                    yield piece.text
                    yielded_any = True
            return  # Stream completed successfully
        except Exception as exc:
            logger.error(f"[Gemini] Streaming error on {model}: {exc}")
            if i < len(models) - 1 and _is_overload(exc):
                logger.info(f"[Gemini] Model {model} overloaded, trying next...")
                _backoff_delay(i, exc)
                continue
            # Last model or non-retryable — only show error if nothing was streamed yet
            if not yielded_any:
                yield "[Error generating response — all models unavailable. Please try again later.]"
            return

    if not yielded_any:
        yield "[All Gemini models unavailable — please try again later]"
