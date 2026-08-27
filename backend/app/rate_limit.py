"""In-process auth rate limiting. Not a multi-instance production gateway."""

from __future__ import annotations

import threading
import time
from collections import deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.settings import auth_rate_limit, auth_rate_limit_enabled, auth_rate_window_seconds

AUTH_RATE_LIMIT_PATHS = {
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/google",
}


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def allow(self, key: str, limit: int, window_seconds: float) -> bool:
        now = time.monotonic()
        with self._lock:
            bucket = self._hits.setdefault(key, deque())
            while bucket and now - bucket[0] > window_seconds:
                bucket.popleft()
            if len(bucket) >= limit:
                return False
            bucket.append(now)
            return True

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


_limiter = InMemoryRateLimiter()


def reset_rate_limiter() -> None:
    _limiter.reset()


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip() or "unknown"
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


class AuthRateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path
        if (
            request.method == "POST"
            and path in AUTH_RATE_LIMIT_PATHS
            and auth_rate_limit_enabled()
        ):
            key = f"{client_ip(request)}:{path}"
            if not _limiter.allow(key, auth_rate_limit(), float(auth_rate_window_seconds())):
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many authentication attempts. Please try again later."},
                    headers={"Retry-After": str(auth_rate_window_seconds())},
                )
        return await call_next(request)
