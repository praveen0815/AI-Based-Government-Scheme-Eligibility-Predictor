"""Lightweight in-process timing for selected research APIs."""

from __future__ import annotations

import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.services.performance_service import get_performance_service

_EXACT = {
    ("POST", "/api/v1/predict"): "/predict",
    ("POST", "/api/v1/recommend"): "/recommend",
    ("GET", "/api/v1/schemes"): "/schemes",
    ("GET", "/api/v1/insights"): "/insights",
}


def classify_endpoint(method: str, path: str) -> str | None:
    mapped = _EXACT.get((method.upper(), path))
    if mapped:
        return mapped
    if path == "/api/v1/evaluation" or path.startswith("/api/v1/evaluation/"):
        return "/evaluation"
    return None


class PerformanceMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        endpoint = classify_endpoint(request.method, request.url.path)
        if endpoint is None:
            return await call_next(request)
        started = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            elapsed_ms = (time.perf_counter() - started) * 1000
            get_performance_service().record(endpoint, elapsed_ms, is_error=True)
            raise
        elapsed_ms = (time.perf_counter() - started) * 1000
        get_performance_service().record(endpoint, elapsed_ms, is_error=response.status_code >= 400)
        return response
