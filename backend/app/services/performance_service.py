"""In-process API timing counters. Does not store request bodies or secrets."""

from __future__ import annotations

import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone

TRACKED_ENDPOINTS = (
    "/predict",
    "/recommend",
    "/schemes",
    "/evaluation",
    "/insights",
)

_STARTED_AT = datetime.now(timezone.utc).isoformat()


@dataclass
class EndpointStats:
    request_count: int = 0
    error_count: int = 0
    total_ms: float = 0.0
    min_ms: float | None = None
    max_ms: float | None = None


@dataclass
class PerformanceStore:
    started_at: str = field(default_factory=lambda: _STARTED_AT)
    endpoints: dict[str, EndpointStats] = field(
        default_factory=lambda: {key: EndpointStats() for key in TRACKED_ENDPOINTS}
    )


class PerformanceService:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._store = PerformanceStore()

    def reset(self) -> None:
        with self._lock:
            self._store = PerformanceStore()

    def record(self, endpoint: str, duration_ms: float, *, is_error: bool) -> None:
        if endpoint not in TRACKED_ENDPOINTS:
            return
        elapsed = max(0.0, float(duration_ms))
        with self._lock:
            stats = self._store.endpoints[endpoint]
            stats.request_count += 1
            stats.total_ms += elapsed
            stats.min_ms = elapsed if stats.min_ms is None else min(stats.min_ms, elapsed)
            stats.max_ms = elapsed if stats.max_ms is None else max(stats.max_ms, elapsed)
            if is_error:
                stats.error_count += 1

    def snapshot(self) -> dict[str, object]:
        with self._lock:
            rows = []
            for key in TRACKED_ENDPOINTS:
                stats = self._store.endpoints[key]
                average = None if stats.request_count == 0 else round(stats.total_ms / stats.request_count, 2)
                rows.append(
                    {
                        "endpoint": key,
                        "request_count": stats.request_count,
                        "error_count": stats.error_count,
                        "average_ms": average,
                        "min_ms": None if stats.min_ms is None else round(stats.min_ms, 2),
                        "max_ms": None if stats.max_ms is None else round(stats.max_ms, 2),
                    }
                )
            return {
                "started_at": self._store.started_at,
                "endpoints": rows,
            }


_service = PerformanceService()


def get_performance_service() -> PerformanceService:
    return _service


def reset_performance_service() -> None:
    _service.reset()
