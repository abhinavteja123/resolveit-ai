"""Feedback route — POST /feedback → stores thumbs up/down in Supabase."""

from fastapi import APIRouter, Depends, HTTPException
from core.firebase_auth import get_current_user
from core.supabase_client import get_supabase
from models.request_models import FeedbackRequest
from models.response_models import FeedbackResponse

router = APIRouter(tags=["Feedback"])


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    body: FeedbackRequest, user: dict = Depends(get_current_user)
):
    """Submit feedback (thumbs up / thumbs down) for a query response.

    Requires a valid Firebase Bearer token.
    """
    if body.rating not in (1, -1):
        raise HTTPException(
            status_code=400, detail="Rating must be 1 (thumbs up) or -1 (thumbs down)"
        )

    try:
        sb = get_supabase()
        record = {
            "query_log_id": body.query_log_id,
            "user_id": user["uid"],
            "rating": body.rating,
            "comment": body.comment,
        }
        result = sb.table("feedback").insert(record).execute()
        feedback_id = result.data[0]["id"] if result.data else None

        return FeedbackResponse(
            message="Feedback submitted successfully",
            feedback_id=feedback_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to submit feedback: {exc}")
