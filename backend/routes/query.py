"""Query routes — POST /query (blocking) and POST /query/stream (SSE)."""

import json
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from core.firebase_auth import get_current_user
from core.rate_limit import limiter
from core.config import QUERY_RATE_LIMIT
from models.request_models import QueryRequest
from models.response_models import QueryResponse
from rag.pipeline import run_rag_pipeline, stream_rag_pipeline

router = APIRouter(tags=["Query"])


@router.post("/query", response_model=QueryResponse)
@limiter.limit(QUERY_RATE_LIMIT)
async def query_runbooks(
    request: Request,
    body: QueryRequest,
    user: dict = Depends(get_current_user),
):
    """Run a RAG query against indexed runbooks."""
    if not body.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    try:
        result = run_rag_pipeline(body.query.strip(), user["uid"], scope=body.scope)
        return QueryResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Pipeline error: {exc}")


@router.post("/query/stream")
@limiter.limit(QUERY_RATE_LIMIT)
async def query_runbooks_stream(
    request: Request,
    body: QueryRequest,
    user: dict = Depends(get_current_user),
):
    """SSE streaming variant — emits 'sources', 'token', 'done' events."""
    if not body.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    def event_stream():
        try:
            for event in stream_rag_pipeline(body.query.strip(), user["uid"], scope=body.scope):
                payload = json.dumps(event["data"], default=str)
                yield f"event: {event['event']}\ndata: {payload}\n\n"
        except Exception as exc:
            err = json.dumps({"error": str(exc)})
            yield f"event: error\ndata: {err}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
