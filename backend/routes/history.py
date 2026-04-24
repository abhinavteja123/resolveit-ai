"""History route — GET /history → paginated thread-grouped query logs for the current user."""

from fastapi import APIRouter, Depends, HTTPException, Query
from core.firebase_auth import get_current_user
from core.supabase_client import get_supabase

router = APIRouter(tags=["History"])


def _make_turn(log, feedback_map):
    return {
        "id": log["id"],
        "query_text": log.get("query_text", ""),
        "llm_response": log.get("llm_response", ""),
        "retrieved_sources": log.get("retrieved_sources", []),
        "confidence_score": log.get("confidence_score", 0),
        "queried_at": log.get("queried_at", ""),
        "feedback": feedback_map.get(log["id"]),
    }


def _fetch_feedback(sb, log_ids: list) -> dict:
    if not log_ids:
        return {}
    fb_result = sb.table("feedback").select("*").in_("query_log_id", log_ids).execute()
    return {
        fb["query_log_id"]: {
            "rating": fb.get("rating"),
            "comment": fb.get("comment", ""),
            "submitted_at": fb.get("submitted_at", ""),
        }
        for fb in (fb_result.data or [])
    }


@router.get("/history")
async def get_history(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    """Get paginated thread-grouped query history for the current user.

    Falls back to a flat list if the thread_id column doesn't exist yet.
    """
    try:
        sb = get_supabase()
        offset = (page - 1) * per_page

        try:
            # ── Thread-aware path (requires migration 005) ──────────────
            roots_result = (
                sb.table("query_logs")
                .select("*")
                .eq("user_id", user["uid"])
                .is_("thread_id", "null")
                .order("queried_at", desc=True)
                .range(offset, offset + per_page - 1)
                .execute()
            )
            roots = roots_result.data or []

            root_ids = [r["id"] for r in roots]
            conts_by_thread: dict = {}
            if root_ids:
                conts_result = (
                    sb.table("query_logs")
                    .select("*")
                    .eq("user_id", user["uid"])
                    .in_("thread_id", root_ids)
                    .order("queried_at", desc=False)
                    .execute()
                )
                for cont in (conts_result.data or []):
                    tid = cont["thread_id"]
                    conts_by_thread.setdefault(tid, []).append(cont)

            all_ids = [r["id"] for r in roots] + [
                c["id"] for conts in conts_by_thread.values() for c in conts
            ]
            feedback_map = _fetch_feedback(sb, all_ids)

            threads = []
            for root in roots:
                conts = conts_by_thread.get(root["id"], [])
                turns = [_make_turn(root, feedback_map)] + [_make_turn(c, feedback_map) for c in conts]
                threads.append({
                    "id": root["id"],
                    "query_text": root.get("query_text", ""),
                    "queried_at": root.get("queried_at", ""),
                    "confidence_score": root.get("confidence_score", 0),
                    "feedback": feedback_map.get(root["id"]),
                    "turns": turns,
                    "turn_count": len(turns),
                })

            count_result = (
                sb.table("query_logs")
                .select("id", count="exact")
                .eq("user_id", user["uid"])
                .is_("thread_id", "null")
                .execute()
            )
            total = count_result.count or 0

        except Exception:
            # ── Flat fallback (migration 005 not yet applied) ───────────
            result = (
                sb.table("query_logs")
                .select("*")
                .eq("user_id", user["uid"])
                .order("queried_at", desc=True)
                .range(offset, offset + per_page - 1)
                .execute()
            )
            logs = result.data or []
            feedback_map = _fetch_feedback(sb, [log["id"] for log in logs])

            threads = [
                {
                    "id": log["id"],
                    "query_text": log.get("query_text", ""),
                    "queried_at": log.get("queried_at", ""),
                    "confidence_score": log.get("confidence_score", 0),
                    "feedback": feedback_map.get(log["id"]),
                    "turns": [_make_turn(log, feedback_map)],
                    "turn_count": 1,
                }
                for log in logs
            ]

            count_result = (
                sb.table("query_logs")
                .select("id", count="exact")
                .eq("user_id", user["uid"])
                .execute()
            )
            total = count_result.count or 0

        return {
            "logs": threads,
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": (total + per_page - 1) // per_page if total else 0,
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"History error: {exc}")
