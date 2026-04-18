"""History route — GET /history → paginated query logs for the current user."""

from fastapi import APIRouter, Depends, HTTPException, Query
from core.firebase_auth import get_current_user
from core.supabase_client import get_supabase

router = APIRouter(tags=["History"])


@router.get("/history")
async def get_history(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    """Get paginated query history for the current user.

    Joins with feedback table to show if the user submitted feedback.
    """
    try:
        sb = get_supabase()
        offset = (page - 1) * per_page

        # Fetch query logs for this user
        result = (
            sb.table("query_logs")
            .select("*")
            .eq("user_id", user["uid"])
            .order("queried_at", desc=True)
            .range(offset, offset + per_page - 1)
            .execute()
        )

        logs = result.data or []

        # Fetch feedback for these logs
        log_ids = [log["id"] for log in logs]
        feedback_map = {}
        if log_ids:
            fb_result = (
                sb.table("feedback")
                .select("*")
                .in_("query_log_id", log_ids)
                .execute()
            )
            for fb in (fb_result.data or []):
                feedback_map[fb["query_log_id"]] = {
                    "rating": fb.get("rating"),
                    "comment": fb.get("comment", ""),
                    "submitted_at": fb.get("submitted_at", ""),
                }

        # Merge feedback into logs
        enriched = []
        for log in logs:
            entry = {
                "id": log["id"],
                "query_text": log.get("query_text", ""),
                "llm_response": log.get("llm_response", ""),
                "retrieved_sources": log.get("retrieved_sources", []),
                "confidence_score": log.get("confidence_score", 0),
                "queried_at": log.get("queried_at", ""),
                "feedback": feedback_map.get(log["id"]),
            }
            enriched.append(entry)

        # Get total count
        count_result = (
            sb.table("query_logs")
            .select("id", count="exact")
            .eq("user_id", user["uid"])
            .execute()
        )
        total = count_result.count or 0

        return {
            "logs": enriched,
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": (total + per_page - 1) // per_page if total else 0,
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"History error: {exc}")
