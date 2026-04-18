"""Pydantic response schemas."""

from pydantic import BaseModel
from typing import List, Optional


class SourceInfo(BaseModel):
    citation: Optional[int] = None
    filename: str
    section: str
    category: str


class QueryResponse(BaseModel):
    answer: str
    sources: List[SourceInfo]
    top_confidence: float
    query_log_id: Optional[str] = None
    cached: bool = False


class RunbookInfo(BaseModel):
    id: Optional[str] = None
    filename: str
    title: Optional[str] = None
    category: str
    file_type: Optional[str] = None
    uploaded_by: Optional[str] = None
    uploaded_at: Optional[str] = None
    chunk_count: Optional[int] = None
    is_indexed: bool = False


class UploadResponse(BaseModel):
    message: str
    filename: str
    category: str
    chunk_count: int


class FeedbackResponse(BaseModel):
    message: str
    feedback_id: Optional[str] = None


class FeedbackStats(BaseModel):
    total_queries: int
    total_feedback: int
    thumbs_up: int
    thumbs_down: int
    thumbs_up_rate: float
    thumbs_down_rate: float
    recent_negative: List[dict]
