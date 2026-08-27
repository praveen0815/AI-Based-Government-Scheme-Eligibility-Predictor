"""CORS allowlist. Never use a wildcard origin."""

from __future__ import annotations

from app.settings import (
    DEV_FRONTEND_ORIGINS,
    cors_allowed_headers,
    cors_allowed_methods,
    cors_allowed_origins,
)

# Compatibility alias used by existing development tests.
ALLOWED_DEV_ORIGINS = DEV_FRONTEND_ORIGINS

ALLOWED_METHODS = cors_allowed_methods()
ALLOWED_HEADERS = cors_allowed_headers()


def allowed_origins() -> list[str]:
    return list(cors_allowed_origins())
