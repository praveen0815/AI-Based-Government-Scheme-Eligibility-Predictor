"""Environment-driven runtime settings. Never log secret values."""

from __future__ import annotations

import os

from app.db.session import load_database_env

ACADEMIC_FALLBACK_JWT_SECRET = "change-me-academic-prototype-only-not-for-production"
DEFAULT_JWT_ALGORITHM = "HS256"
DEFAULT_JWT_EXPIRE_MINUTES = 60
MIN_PRODUCTION_JWT_SECRET_LENGTH = 32

DEV_FRONTEND_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
)

_WEAK_JWT_SECRETS = {
    "",
    "secret",
    "password",
    "changeme",
    "change-me",
    "jwt-secret",
    "jwt_secret_key",
    ACADEMIC_FALLBACK_JWT_SECRET.lower(),
}


class SettingsError(Exception):
    """Raised when production configuration is missing or unsafe."""


def app_environment() -> str:
    load_database_env()
    raw = (os.environ.get("APP_ENV") or os.environ.get("ENVIRONMENT") or "development").strip().lower()
    if raw in {"prod", "production"}:
        return "production"
    if raw in {"test", "testing"}:
        return "test"
    return "development"


def is_production() -> bool:
    return app_environment() == "production"


def is_test_runtime() -> bool:
    if app_environment() == "test":
        return True
    if os.environ.get("SCHEME_PREDICTOR_USE_TEST_DB") == "1":
        return True
    if os.environ.get("PYTEST_CURRENT_TEST"):
        return True
    return False


def is_weak_jwt_secret(secret: str) -> bool:
    value = (secret or "").strip()
    if len(value) < MIN_PRODUCTION_JWT_SECRET_LENGTH:
        return True
    return value.lower() in _WEAK_JWT_SECRETS


def jwt_secret_key() -> str:
    load_database_env()
    secret = (os.environ.get("JWT_SECRET_KEY") or "").strip()
    if is_production():
        if is_weak_jwt_secret(secret):
            raise SettingsError(
                "JWT_SECRET_KEY must be a unique secret of at least "
                f"{MIN_PRODUCTION_JWT_SECRET_LENGTH} characters in production."
            )
        return secret
    return secret or ACADEMIC_FALLBACK_JWT_SECRET


def jwt_algorithm() -> str:
    load_database_env()
    return (os.environ.get("JWT_ALGORITHM") or DEFAULT_JWT_ALGORITHM).strip() or DEFAULT_JWT_ALGORITHM


def jwt_expire_minutes() -> int:
    load_database_env()
    raw = os.environ.get("JWT_ACCESS_TOKEN_EXPIRE_MINUTES") or str(DEFAULT_JWT_EXPIRE_MINUTES)
    try:
        minutes = int(raw)
    except ValueError:
        minutes = DEFAULT_JWT_EXPIRE_MINUTES
    return minutes if minutes > 0 else DEFAULT_JWT_EXPIRE_MINUTES


def google_client_id() -> str:
    load_database_env()
    return (os.environ.get("GOOGLE_CLIENT_ID") or "").strip()


def _parse_origins(raw: str) -> tuple[str, ...]:
    origins: list[str] = []
    for item in raw.split(","):
        origin = item.strip()
        if not origin:
            continue
        if origin == "*":
            raise SettingsError("CORS_ALLOWED_ORIGINS must not include *.")
        origins.append(origin)
    return tuple(origins)


def cors_allowed_origins() -> tuple[str, ...]:
    load_database_env()
    configured = _parse_origins(os.environ.get("CORS_ALLOWED_ORIGINS") or "")
    if is_production():
        if not configured:
            raise SettingsError("CORS_ALLOWED_ORIGINS must be set in production.")
        return configured
    if configured:
        merged = list(DEV_FRONTEND_ORIGINS)
        for origin in configured:
            if origin not in merged:
                merged.append(origin)
        return tuple(merged)
    return DEV_FRONTEND_ORIGINS


def cors_allowed_methods() -> tuple[str, ...]:
    return ("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")


def cors_allowed_headers() -> tuple[str, ...]:
    return ("Content-Type", "Authorization")


def auth_rate_limit_enabled() -> bool:
    load_database_env()
    raw = (os.environ.get("AUTH_RATE_LIMIT_ENABLED") or "").strip().lower()
    if raw in {"0", "false", "off", "no"}:
        return False
    if raw in {"1", "true", "on", "yes"}:
        return not is_test_runtime()
    if is_test_runtime():
        return False
    return is_production()


def auth_rate_limit() -> int:
    load_database_env()
    raw = os.environ.get("AUTH_RATE_LIMIT") or "10"
    try:
        value = int(raw)
    except ValueError:
        value = 10
    return value if value > 0 else 10


def auth_rate_window_seconds() -> int:
    load_database_env()
    raw = os.environ.get("AUTH_RATE_WINDOW_SECONDS") or "60"
    try:
        value = int(raw)
    except ValueError:
        value = 60
    return value if value > 0 else 60


def docs_enabled() -> bool:
    return not is_production()


def using_development_jwt_fallback() -> bool:
    load_database_env()
    secret = (os.environ.get("JWT_SECRET_KEY") or "").strip()
    return not is_production() and (not secret or secret == ACADEMIC_FALLBACK_JWT_SECRET)


def validate_runtime_settings() -> None:
    """Fail fast in production. Development keeps local academic defaults."""
    if not is_production():
        return
    if not (os.environ.get("DATABASE_URL") or "").strip():
        raise SettingsError("DATABASE_URL is required in production.")
    jwt_secret_key()
    if not google_client_id():
        raise SettingsError("GOOGLE_CLIENT_ID is required in production.")
    cors_allowed_origins()
