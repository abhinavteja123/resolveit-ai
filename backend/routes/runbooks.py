"""User runbook routes — any authenticated user can upload and view their own runbooks."""

import os
import tempfile
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form

from core.firebase_auth import get_current_user
from core.supabase_client import get_supabase
from core.config import MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, FAISS_INDEX_PATH
from ingestion.indexer import index_runbook, DuplicateRunbookError
from models.response_models import UploadResponse
from routes.admin import ALLOWED_EXTENSIONS, _validate_magic
from retrieval.faiss_store import remove_runbook_from_index, save_index
from retrieval import bm25_store

router = APIRouter(prefix="/runbooks", tags=["Runbooks"])


@router.post("/upload", response_model=UploadResponse)
async def upload_runbook(
    file: UploadFile = File(...),
    category: str = Form("other"),
    user: dict = Depends(get_current_user),
):
    """Upload and index a runbook file (any authenticated user)."""
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

    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds {MAX_UPLOAD_MB} MB limit",
        )

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
            is_admin_runbook=False,
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


@router.delete("/my/{runbook_id}")
async def delete_my_runbook(runbook_id: str, user: dict = Depends(get_current_user)):
    """Delete a runbook the current user owns. Removes from Supabase + FAISS + BM25."""
    try:
        sb = get_supabase()
        row = (
            sb.table("runbooks")
            .select("filename, uploaded_by")
            .eq("id", runbook_id)
            .single()
            .execute()
        )
        if not row.data:
            raise HTTPException(status_code=404, detail="Runbook not found")
        if row.data["uploaded_by"] != user["uid"]:
            raise HTTPException(status_code=403, detail="You can only delete your own runbooks")

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


@router.get("/my")
async def my_runbooks(user: dict = Depends(get_current_user)):
    """List runbooks uploaded by the current user."""
    try:
        sb = get_supabase()
        result = (
            sb.table("runbooks")
            .select("*")
            .eq("uploaded_by", user["uid"])
            .order("uploaded_at", desc=True)
            .execute()
        )
        return {"runbooks": result.data or []}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
