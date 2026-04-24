"""Admin routes — upload runbooks, list runbooks, feedback stats."""

import os
import tempfile
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form

from core.firebase_auth import get_admin_user
from core.supabase_client import get_supabase
from core.config import MAX_UPLOAD_BYTES, MAX_UPLOAD_MB
from ingestion.indexer import index_runbook, DuplicateRunbookError
from models.response_models import UploadResponse, FeedbackStats
from retrieval.faiss_store import remove_runbook_from_index, save_index
from retrieval import bm25_store
from core.config import FAISS_INDEX_PATH

router = APIRouter(prefix="/admin", tags=["Admin"])

ALLOWED_EXTENSIONS = {"pdf", "docx", "txt"}

# Magic-byte signatures for upload validation
_PDF_MAGIC = b"%PDF-"
_DOCX_MAGIC = b"PK\x03\x04"  # zip container


def _validate_magic(content: bytes, ext: str) -> bool:
    """Sniff the first bytes to confirm the file really is what its extension claims."""
    if ext == "pdf":
        return content[:5] == _PDF_MAGIC
    if ext == "docx":
        return content[:4] == _DOCX_MAGIC
    if ext == "txt":
        # Reject files with NUL bytes in the first 4KB — likely binary.
        return b"\x00" not in content[:4096]
    return False


@router.post("/upload", response_model=UploadResponse)
async def upload_runbook(
    file: UploadFile = File(...),
    category: str = Form("other"),
    user: dict = Depends(get_admin_user),
):
    """Upload and index a runbook file (PDF, DOCX, or TXT)."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '.{ext}'. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
        )

    valid_categories = {"server", "network", "application", "other"}
    if category not in valid_categories:
        category = "other"

    # Streaming size guard — reject before buffering in memory
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds {MAX_UPLOAD_MB} MB limit",
        )

    # Magic-byte validation
    if not _validate_magic(content, ext):
        raise HTTPException(
            status_code=400,
            detail=f"File content does not match '.{ext}' type",
        )

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        result = index_runbook(
            filepath=tmp_path,
            filename=file.filename,
            category=category,
            uploaded_by=user["uid"],
            file_type=ext,
            is_admin_runbook=True,
        )

        return UploadResponse(
            message=f"Successfully indexed '{file.filename}'",
            filename=result["filename"],
            category=result["category"],
            chunk_count=result["chunk_count"],
        )

    except DuplicateRunbookError as dup:
        raise HTTPException(status_code=409, detail=str(dup))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Indexing failed: {exc}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


@router.delete("/runbooks/{runbook_id}")
async def delete_runbook(runbook_id: str, user: dict = Depends(get_admin_user)):
    """Delete any runbook by ID (admin only). Removes from Supabase + FAISS + BM25."""
    try:
        sb = get_supabase()
        row = sb.table("runbooks").select("filename").eq("id", runbook_id).single().execute()
        if not row.data:
            raise HTTPException(status_code=404, detail="Runbook not found")

        filename = row.data["filename"]
        sb.table("runbooks").delete().eq("id", runbook_id).execute()

        removed = remove_runbook_from_index(filename)
        save_index(FAISS_INDEX_PATH)
        bm25_store.rebuild_from_metadata()

        return {"message": f"Deleted '{filename}' and removed {removed} chunks"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Delete failed: {exc}")


@router.get("/runbooks")
async def list_runbooks(user: dict = Depends(get_admin_user)):
    """List all indexed runbooks from Supabase."""
    try:
        sb = get_supabase()
        result = (
            sb.table("runbooks")
            .select("*")
            .order("uploaded_at", desc=True)
            .execute()
        )
        return {"runbooks": result.data or []}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")


@router.get("/feedback-stats", response_model=FeedbackStats)
async def feedback_stats(user: dict = Depends(get_admin_user)):
    """Get aggregate feedback statistics for the admin dashboard."""
    try:
        sb = get_supabase()

        queries_result = sb.table("query_logs").select("id", count="exact").execute()
        total_queries = queries_result.count or 0

        feedback_result = sb.table("feedback").select("*").execute()
        feedback_list = feedback_result.data or []
        total_feedback = len(feedback_list)

        thumbs_up = sum(1 for f in feedback_list if f.get("rating") == 1)
        thumbs_down = sum(1 for f in feedback_list if f.get("rating") == -1)

        thumbs_up_rate = (thumbs_up / total_feedback * 100) if total_feedback else 0.0
        thumbs_down_rate = (thumbs_down / total_feedback * 100) if total_feedback else 0.0

        negative = [f for f in feedback_list if f.get("rating") == -1]
        negative.sort(key=lambda x: x.get("submitted_at", ""), reverse=True)
        recent_negative = negative[:10]

        enriched_negative = []
        for neg in recent_negative:
            query_log_id = neg.get("query_log_id")
            query_text = "N/A"
            if query_log_id:
                try:
                    log = (
                        sb.table("query_logs")
                        .select("query_text")
                        .eq("id", query_log_id)
                        .single()
                        .execute()
                    )
                    query_text = log.data.get("query_text", "N/A") if log.data else "N/A"
                except Exception:
                    pass
            enriched_negative.append({
                "feedback_id": neg.get("id"),
                "query_text": query_text,
                "comment": neg.get("comment", ""),
                "submitted_at": neg.get("submitted_at", ""),
            })

        return FeedbackStats(
            total_queries=total_queries,
            total_feedback=total_feedback,
            thumbs_up=thumbs_up,
            thumbs_down=thumbs_down,
            thumbs_up_rate=round(thumbs_up_rate, 1),
            thumbs_down_rate=round(thumbs_down_rate, 1),
            recent_negative=enriched_negative,
        )

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Stats error: {exc}")


@router.get("/runbook-health")
async def runbook_health(user: dict = Depends(get_admin_user)):
    """Per-runbook health stats: query count, avg confidence, thumbs-up ratio."""
    try:
        sb = get_supabase()
        runbooks_result = sb.table("runbooks").select("*").order("uploaded_at", desc=True).execute()
        runbooks = runbooks_result.data or []

        feedback_result = sb.table("feedback").select("*").execute()
        all_feedback = feedback_result.data or []

        logs_result = (
            sb.table("query_logs")
            .select("id,retrieved_sources,confidence_score")
            .execute()
        )
        all_logs = logs_result.data or []

        health_data = []
        for rb in runbooks:
            fname = rb["filename"]
            rb_logs = [l for l in all_logs if fname in (l.get("retrieved_sources") or [])]
            query_count = len(rb_logs)
            avg_confidence = (
                sum(l.get("confidence_score") or 0 for l in rb_logs) / query_count
                if query_count else 0.0
            )
            log_ids = {l["id"] for l in rb_logs}
            rb_feedback = [f for f in all_feedback if f.get("query_log_id") in log_ids]
            total_fb = len(rb_feedback)
            thumbs_up = sum(1 for f in rb_feedback if f.get("rating") == 1)
            thumbs_up_ratio = (thumbs_up / total_fb) if total_fb else None

            health_data.append({
                "id": rb["id"],
                "filename": rb["filename"],
                "category": rb.get("category", "other"),
                "chunk_count": rb.get("chunk_count"),
                "query_count": query_count,
                "avg_confidence": round(avg_confidence, 3),
                "thumbs_up_ratio": round(thumbs_up_ratio, 3) if thumbs_up_ratio is not None else None,
                "needs_attention": thumbs_up_ratio is not None and thumbs_up_ratio < 0.4,
            })

        return {"runbook_health": health_data}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Health stats error: {exc}")


@router.get("/knowledge-gaps")
async def knowledge_gaps(user: dict = Depends(get_admin_user)):
    """Low-confidence or negatively-rated queries — potential runbook gaps."""
    try:
        from collections import defaultdict
        sb = get_supabase()

        logs_result = (
            sb.table("query_logs")
            .select("id,query_text,confidence_score,queried_at")
            .execute()
        )
        all_logs = {l["id"]: l for l in (logs_result.data or [])}

        fb_result = sb.table("feedback").select("query_log_id,rating").execute()
        negative_ids = {
            f["query_log_id"]
            for f in (fb_result.data or [])
            if f.get("rating") == -1
        }

        gap_logs = [
            l for l in all_logs.values()
            if (l.get("confidence_score") or 1.0) < 0.5 or l["id"] in negative_ids
        ]

        groups: dict = defaultdict(list)
        for log in gap_logs:
            key = " ".join((log.get("query_text") or "").split()[:5]).lower()
            groups[key].append(log)

        gaps = []
        for key, items in sorted(groups.items(), key=lambda x: -len(x[1])):
            avg_conf = sum((i.get("confidence_score") or 0) for i in items) / len(items)
            last_seen = max(i.get("queried_at", "") for i in items)
            gaps.append({
                "query_text": items[0].get("query_text", key),
                "count": len(items),
                "avg_confidence": round(avg_conf, 3),
                "last_seen": last_seen,
            })

        return {"knowledge_gaps": gaps[:20]}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Knowledge gaps error: {exc}")
