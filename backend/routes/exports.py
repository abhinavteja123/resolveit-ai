"""Export saved answers to portable formats.

Currently supports Markdown only. PDF/HTML can be added later by reusing
`_render_markdown` and piping through weasyprint or markdown-it + jinja2.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse

from core.firebase_auth import get_current_user
from core.supabase_client import get_supabase

router = APIRouter(tags=["Export"])


def _slugify(text: str) -> str:
    keep = "abcdefghijklmnopqrstuvwxyz0123456789-"
    s = "".join(c if c.lower() in keep else "-" for c in (text or "").lower())
    while "--" in s:
        s = s.replace("--", "-")
    return s.strip("-")[:60] or "answer"


def _render_markdown(log: dict) -> str:
    query = log.get("query_text") or "(no query)"
    answer = log.get("llm_response") or ""
    sources = log.get("retrieved_sources") or []
    confidence = log.get("confidence_score")
    mode = log.get("mode") or "standard"
    queried_at = log.get("queried_at") or datetime.now(timezone.utc).isoformat()

    parts: list[str] = []
    parts.append(f"# {query}")
    parts.append("")
    meta_bits = [
        f"_Mode: **{mode}**_",
        f"_Confidence: **{int((confidence or 0) * 100)}%**_" if confidence is not None else None,
        f"_Generated: {queried_at}_",
    ]
    parts.append("  ·  ".join(b for b in meta_bits if b))
    parts.append("")
    parts.append("---")
    parts.append("")
    parts.append(answer.strip() or "_(no answer recorded)_")
    parts.append("")
    if sources:
        parts.append("---")
        parts.append("")
        parts.append("## Sources")
        for s in sources:
            parts.append(f"- {s}")
        parts.append("")
    parts.append("---")
    parts.append("")
    parts.append("_Exported from ResolveIT AI_")
    return "\n".join(parts)


@router.get("/export/{query_log_id}.md", response_class=PlainTextResponse)
async def export_markdown(query_log_id: str, user: dict = Depends(get_current_user)):
    """Return the answer as a downloadable Markdown file."""
    try:
        sb = get_supabase()
        result = (
            sb.table("query_logs")
            .select("*")
            .eq("id", query_log_id)
            .single()
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Lookup failed: {exc}")

    if not result.data:
        raise HTTPException(status_code=404, detail="Answer not found")

    md = _render_markdown(result.data)
    filename = f"{_slugify(result.data.get('query_text') or 'answer')}.md"
    return PlainTextResponse(
        content=md,
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
