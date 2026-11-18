from datetime import datetime, timezone
from pathlib import Path
import traceback
from typing import Any
import uuid

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.config import PROJECT_ROOT
from app.core.logging import logger


def extract_safe_stack(exc: Exception) -> list[dict[str, Any]]:
    """Extracts sanitized stack locations (file, line, function) without locals or code text."""
    tb = traceback.extract_tb(exc.__traceback__)
    locations: list[dict[str, Any]] = []

    for frame in tb:
        try:
            rel_path = Path(frame.filename).resolve().relative_to(PROJECT_ROOT.resolve()).as_posix()
            file_label = rel_path
        except (ValueError, RuntimeError):
            file_label = Path(frame.filename).name

        locations.append({
            "file": file_label,
            "line": frame.lineno,
            "function": frame.name,
        })

    return locations


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Centralized handler for unexpected server errors returning safe 500 JSON responses."""
    request_id = getattr(request.state, "request_id", None) or str(uuid.uuid4())

    logger.error({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": "ERROR",
        "event": "unexpected_error",
        "request_id": request_id,
        "exception_class": type(exc).__name__,
        "stack": extract_safe_stack(exc),
    })

    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "request_id": request_id,
        },
        headers={"X-Request-ID": request_id},
    )
