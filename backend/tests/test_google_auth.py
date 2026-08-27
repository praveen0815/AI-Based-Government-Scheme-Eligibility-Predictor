"""Google credential verification tests. No Google tokens are stored."""

from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.services.google_token_service import (
    GoogleAuthUnavailableError,
    GoogleIdentity,
    GoogleTokenError,
    verify_google_credential,
)


class GoogleTokenServiceTests(unittest.TestCase):
    def test_missing_client_id_is_unavailable(self) -> None:
        with patch.dict(os.environ, {"GOOGLE_CLIENT_ID": ""}, clear=False):
            with self.assertRaises(GoogleAuthUnavailableError):
                verify_google_credential("any-token")

    def test_transport_error_is_unavailable(self) -> None:
        from google.auth.exceptions import TransportError

        with patch.dict(os.environ, {"GOOGLE_CLIENT_ID": "test-client.apps.googleusercontent.com"}):
            with patch(
                "app.services.google_token_service.id_token.verify_oauth2_token",
                side_effect=TransportError("certs unavailable"),
            ):
                with self.assertRaises(GoogleAuthUnavailableError):
                    verify_google_credential("signed-token")

    def test_os_error_during_verify_is_unavailable(self) -> None:
        with patch.dict(os.environ, {"GOOGLE_CLIENT_ID": "test-client.apps.googleusercontent.com"}):
            with patch(
                "app.services.google_token_service.id_token.verify_oauth2_token",
                side_effect=OSError("certificate store unavailable"),
            ):
                with self.assertRaises(GoogleAuthUnavailableError):
                    verify_google_credential("signed-token")

    def test_rejects_unverified_email(self) -> None:
        with patch.dict(os.environ, {"GOOGLE_CLIENT_ID": "test-client.apps.googleusercontent.com"}):
            with patch(
                "app.services.google_token_service.id_token.verify_oauth2_token",
                return_value={
                    "iss": "https://accounts.google.com",
                    "sub": "sub-1",
                    "email": "user@example.com",
                    "email_verified": False,
                    "name": "User",
                },
            ):
                with self.assertRaises(GoogleTokenError):
                    verify_google_credential("signed-token")

    def test_accepts_verified_claims_only(self) -> None:
        with patch.dict(os.environ, {"GOOGLE_CLIENT_ID": "test-client.apps.googleusercontent.com"}):
            with patch(
                "app.services.google_token_service.id_token.verify_oauth2_token",
                return_value={
                    "iss": "accounts.google.com",
                    "sub": "sub-2",
                    "email": "User@Example.com",
                    "email_verified": True,
                    "name": "Verified User",
                },
            ) as mocked:
                identity = verify_google_credential("signed-token")
        self.assertEqual(identity, GoogleIdentity("sub-2", "user@example.com", "Verified User"))
        self.assertEqual(mocked.call_args.kwargs["audience"], "test-client.apps.googleusercontent.com")
        self.assertEqual(mocked.call_args.kwargs["clock_skew_in_seconds"], 60)


class GoogleAuthRouteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def test_invalid_google_credential_returns_401(self) -> None:
        with patch(
            "app.routes.auth.verify_google_credential",
            side_effect=GoogleTokenError("Invalid Google credential."),
        ):
            response = self.client.post(
                "/api/v1/auth/google",
                json={"credential": "not-a-real-token"},
            )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Invalid Google credential.")
        self.assertNotIn("secret", response.text.lower())
        self.assertNotIn("traceback", response.text.lower())

    def test_unconfigured_google_returns_503(self) -> None:
        with patch("app.services.google_token_service.google_client_id", return_value=""):
            response = self.client.post(
                "/api/v1/auth/google",
                json={"credential": "signed-token"},
            )
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["detail"], "Google Sign-In is not configured.")
        self.assertNotIn("GOOGLE_CLIENT_ID", response.text)
        self.assertNotIn("apps.googleusercontent.com", response.text)


if __name__ == "__main__":
    unittest.main()
