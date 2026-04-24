"""Pydantic request schemas."""

from pydantic import BaseModel
from typing import Literal, Optional


class QueryRequest(BaseModel):
    query: str
    scope: Literal["admin", "mine", "both"] = "admin"
    thread_id: Optional[str] = None


class FeedbackRequest(BaseModel):
    query_log_id: str
    rating: int  # 1 = thumbs up, -1 = thumbs down
    comment: Optional[str] = None
