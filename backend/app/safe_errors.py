"""Convert exceptions into client-safe HTTP details. Never leak internals."""

from __future__ import annotations

from typing import Any

_UNSAFE_MARKERS = (
    "traceback",
    "sqlalchemy",
    "psycopg",
    "postgresql://",
    "password=",
    "jwt_secret",
    "secret_key",
    "file \"",
    "file '",
)


def safe_error_detail(detail: Any, fallback: str) -> str:
    if not isinstance(detail, str):
        return fallback
    lowered = detail.lower()
    if any(marker in lowered for marker in _UNSAFE_MARKERS):
        return fallback
    return detail


def public_validation_errors(errors: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Keep field locations and messages. Drop submitted values such as passwords."""
    public: list[dict[str, Any]] = []
    for error in errors:
        public.append(
            {
                "type": error.get("type"),
                "loc": error.get("loc"),
                "msg": error.get("msg"),
            }
        )
    return public
