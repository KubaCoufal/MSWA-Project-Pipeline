from __future__ import annotations

import json
import logging
import time
import uuid
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Callable

from fastapi import Request, Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.middleware.base import BaseHTTPMiddleware

request_id_context: ContextVar[str | None] = ContextVar("request_id", default=None)

REQUEST_COUNT = Counter(
    "pipeline_monitor_http_requests_total",
    "Total HTTP requests.",
    ["method", "path", "status"],
)
REQUEST_LATENCY = Histogram(
    "pipeline_monitor_http_request_duration_seconds",
    "HTTP request duration in seconds.",
    ["method", "path"],
)


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "requestId": request_id_context.get(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


def configure_logging() -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(logging.INFO)


class ObservabilityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        token = request_id_context.set(request_id)
        start = time.perf_counter()
        status_code = 500
        route_path = request.url.path
        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        finally:
            elapsed = time.perf_counter() - start
            route = request.scope.get("route")
            if route is not None:
                route_path = getattr(route, "path", route_path)
            REQUEST_COUNT.labels(request.method, route_path, str(status_code)).inc()
            REQUEST_LATENCY.labels(request.method, route_path).observe(elapsed)
            if "response" in locals():
                response.headers["X-Request-ID"] = request_id
            logging.getLogger("app.request").info(
                "%s %s completed with %s in %.3fs",
                request.method,
                route_path,
                status_code,
                elapsed,
            )
            request_id_context.reset(token)


def metrics_response() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
