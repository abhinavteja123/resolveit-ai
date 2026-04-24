"""Bookmarks routes — save, list, and delete bookmarked answers."""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional

from core.firebase_auth import get_current_user
from core.supabase_client import get_supabase

router = APIRouter(prefix="/bookmarks", tags=["Bookmarks"])


class BookmarkRequest(BaseModel):
    query_log_id: str
    query_text: str
    answer_snippet: str
    sources: Optional[List[str]] = []


@router.post("")
async def create_bookmark(body: BookmarkRequest, user: dict = Depends(get_current_user)):
    """Save an answer as a bookmark."""
    try:
        sb = get_supabase()
        result = sb.table("bookmarks").insert({
            "user_id": user["uid"],
            "query_log_id": body.query_log_id,
            "query_text": body.query_text,
            "answer_snippet": body.answer_snippet[:300],
            "sources": body.sources or [],
        }).execute()
        bm_id = result.data[0]["id"] if result.data else None
        return {"message": "Bookmarked", "id": bm_id}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Bookmark failed: {exc}")


@router.get("")
async def list_bookmarks(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    """List the current user's bookmarks."""
    try:
        sb = get_supabase()
        offset = (page - 1) * per_page
        try:
            result = (
                sb.table("bookmarks")
                .select("*")
                .eq("user_id", user["uid"])
                .order("bookmarked_at", desc=True)
                .range(offset, offset + per_page - 1)
                .execute()
            )
        except Exception:
            # Fallback: try ordering by created_at if bookmarked_at column doesn't exist
            try:
                result = (
                    sb.table("bookmarks")
                    .select("*")
                    .eq("user_id", user["uid"])
                    .order("created_at", desc=True)
                    .range(offset, offset + per_page - 1)
                    .execute()
                )
            except Exception:
                return {"bookmarks": [], "page": page}
        return {"bookmarks": result.data or [], "page": page}
    except Exception:
        return {"bookmarks": [], "page": page}


@router.delete("/{bookmark_id}")
async def delete_bookmark(bookmark_id: str, user: dict = Depends(get_current_user)):
    """Delete a bookmark owned by the current user."""
    try:
        sb = get_supabase()
        row = (
            sb.table("bookmarks")
            .select("user_id")
            .eq("id", bookmark_id)
            .single()
            .execute()
        )
        if not row.data or row.data.get("user_id") != user["uid"]:
            raise HTTPException(status_code=404, detail="Bookmark not found")
        sb.table("bookmarks").delete().eq("id", bookmark_id).execute()
        return {"message": "Bookmark deleted"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Delete failed: {exc}")
