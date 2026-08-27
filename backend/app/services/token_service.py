"""JWT access tokens for the academic prototype. Not a government identity system."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt

from app.settings import jwt_algorithm, jwt_expire_minutes, jwt_secret_key

DEFAULT_ALGORITHM = "HS256"
DEFAULT_EXPIRE_MINUTES = 60


class TokenError(Exception):
    """Raised when a JWT is missing, invalid, or expired."""


def _settings() -> tuple[str, str, int]:
    return jwt_secret_key(), jwt_algorithm(), jwt_expire_minutes()


def access_token_expires_in_seconds() -> int:
    _, _, expire_minutes = _settings()
    return expire_minutes * 60


def create_access_token(user_id: str, expires_delta: timedelta | None = None) -> str:
    secret, algorithm, expire_minutes = _settings()
    lifetime = expires_delta if expires_delta is not None else timedelta(minutes=expire_minutes)
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + lifetime,
    }
    return jwt.encode(payload, secret, algorithm=algorithm)


def decode_access_token(token: str) -> str:
    secret, algorithm, _ = _settings()
    try:
        payload = jwt.decode(token, secret, algorithms=[algorithm])
    except jwt.ExpiredSignatureError as exc:
        raise TokenError("Token has expired") from exc
    except jwt.InvalidTokenError as exc:
        raise TokenError("Invalid token") from exc
    user_id = payload.get("sub")
    if not user_id or not isinstance(user_id, str):
        raise TokenError("Invalid token")
    return user_id
