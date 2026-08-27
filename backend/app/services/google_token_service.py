"""Verify Google ID tokens. Never trust frontend-supplied email or name."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from google.auth.exceptions import GoogleAuthError, TimeoutError as GoogleTimeoutError, TransportError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.settings import google_client_id

_GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}
# GIS tokens are minted on Google's clock. A few seconds of Windows drift
# otherwise fails verification with "Token used too early".
_CLOCK_SKEW_SECONDS = 60

logger = logging.getLogger(__name__)


class GoogleTokenError(Exception):
    """Raised when a Google credential is missing, invalid, or unverified."""


class GoogleAuthUnavailableError(Exception):
    """Raised when Google Sign-In is not configured on the server."""


@dataclass(frozen=True)
class GoogleIdentity:
    google_sub: str
    email: str
    full_name: str


def verify_google_credential(credential: str) -> GoogleIdentity:
    token = (credential or "").strip()
    if not token:
        raise GoogleTokenError("Invalid Google credential.")

    audience = google_client_id()
    if not audience:
        raise GoogleAuthUnavailableError("Google Sign-In is not configured.")

    try:
        claims = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            audience=audience,
            clock_skew_in_seconds=_CLOCK_SKEW_SECONDS,
        )
    except (TransportError, GoogleTimeoutError, OSError) as exc:
        logger.warning("Google token verification unavailable (%s)", type(exc).__name__)
        raise GoogleAuthUnavailableError("Google sign-in is temporarily unavailable.") from exc
    except ValueError as exc:
        logger.warning("Google token verification failed (%s)", type(exc).__name__)
        raise GoogleTokenError("Invalid Google credential.") from exc
    except GoogleAuthError as exc:
        logger.warning("Google token verification failed (%s)", type(exc).__name__)
        raise GoogleTokenError("Invalid Google credential.") from exc

    issuer = claims.get("iss")
    if issuer not in _GOOGLE_ISSUERS:
        raise GoogleTokenError("Invalid Google credential.")

    google_sub = str(claims.get("sub") or "").strip()
    email = str(claims.get("email") or "").strip().lower()
    verified = claims.get("email_verified")
    if not google_sub or not email:
        raise GoogleTokenError("Invalid Google credential.")
    if verified is not True and verified != "true":
        raise GoogleTokenError("Google account email is not verified.")

    full_name = str(claims.get("name") or "").strip()
    if not full_name:
        given = str(claims.get("given_name") or "").strip()
        family = str(claims.get("family_name") or "").strip()
        full_name = " ".join(part for part in (given, family) if part).strip()
    if not full_name:
        full_name = email.split("@")[0]

    return GoogleIdentity(google_sub=google_sub, email=email, full_name=full_name[:200])
