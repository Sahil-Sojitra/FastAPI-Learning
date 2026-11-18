from datetime import datetime, timezone
from time import perf_counter
import uuid

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from app.core.exception_handlers import unhandled_exception_handler
from app.core.logging import logger


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware that assigns request IDs, tracks process timing, and emits structured request logs."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Generate a fresh server-side UUID for every request; ignore client-provided headers
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        started = perf_counter()

        try:
            response = await call_next(request)
        except Exception as exc:
            # If response transmission has already started, Starlette cannot safely replace it
            if isinstance(exc, RuntimeError) and "response already started" in str(exc).lower():
                raise

            response = await unhandled_exception_handler(request, exc)

        elapsed_ms = (perf_counter() - started) * 1000

        # Attach tracking headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time-Ms"] = f"{elapsed_ms:.2f}"

        # Resolve matched route template or fallback label
        route = request.scope.get("route")
        if route is not None and hasattr(route, "path"):
            matched_route = route.path
        else:
            matched_route = "unmatched_route"

        # Emit exactly one structured application request-summary event
        logger.info({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": "INFO",
            "request_id": request_id,
            "method": request.method,
            "route": matched_route,
            "status": response.status_code,
            "status_code": response.status_code,
            "duration_ms": round(elapsed_ms, 2),
        })

        return response
