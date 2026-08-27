"""Phase 21 security and production-hardening checks."""

from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.logging_filters import redact_text
from app.main import app
from app.rate_limit import InMemoryRateLimiter, reset_rate_limiter
from app.safe_errors import public_validation_errors
from app.settings import (
    SettingsError,
    cors_allowed_origins,
    is_weak_jwt_secret,
    jwt_secret_key,
    validate_runtime_settings,
)


class SettingsHardeningTests(unittest.TestCase):
    def test_production_rejects_academic_jwt_fallback(self) -> None:
        env = {
            "APP_ENV": "production",
            "JWT_SECRET_KEY": "change-me-academic-prototype-only-not-for-production",
            "DATABASE_URL": "postgresql+psycopg://user:pass@localhost:5432/scheme_predictor",
            "GOOGLE_CLIENT_ID": "prod-client.apps.googleusercontent.com",
            "CORS_ALLOWED_ORIGINS": "https://schemewise.example.edu",
        }
        with patch.dict(os.environ, env, clear=False):
            with self.assertRaises(SettingsError):
                validate_runtime_settings()

    def test_production_rejects_missing_database_and_wildcard_cors(self) -> None:
        base = {
            "APP_ENV": "production",
            "JWT_SECRET_KEY": "a-unique-production-secret-key-32chars",
            "GOOGLE_CLIENT_ID": "prod-client.apps.googleusercontent.com",
        }
        with patch.dict(os.environ, {**base, "DATABASE_URL": "", "CORS_ALLOWED_ORIGINS": "https://ok.example"}, clear=False):
            with self.assertRaises(SettingsError):
                validate_runtime_settings()
        with patch.dict(
            os.environ,
            {
                **base,
                "DATABASE_URL": "postgresql+psycopg://user:pass@localhost:5432/app",
                "CORS_ALLOWED_ORIGINS": "*",
            },
            clear=False,
        ):
            with self.assertRaises(SettingsError):
                cors_allowed_origins()

    def test_development_keeps_academic_jwt_fallback(self) -> None:
        with patch.dict(os.environ, {"APP_ENV": "development", "JWT_SECRET_KEY": ""}, clear=False):
            secret = jwt_secret_key()
        self.assertTrue(is_weak_jwt_secret(secret))
        self.assertGreaterEqual(len(secret), 32)


class SafeErrorTests(unittest.TestCase):
    def test_validation_errors_omit_submitted_values(self) -> None:
        public = public_validation_errors(
            [
                {
                    "type": "string_too_short",
                    "loc": ("body", "password"),
                    "msg": "String should have at least 8 characters",
                    "input": "secret-password",
                }
            ]
        )
        self.assertEqual(public[0]["loc"], ("body", "password"))
        self.assertNotIn("input", public[0])
        self.assertNotIn("secret-password", str(public))

    def test_logs_redact_bearer_tokens_and_database_urls(self) -> None:
        redacted = redact_text(
            "Authorization: Bearer abc.def.ghi postgresql+psycopg://user:pass@localhost:5432/db"
        )
        self.assertNotIn("abc.def.ghi", redacted)
        self.assertNotIn("user:pass", redacted)
        self.assertIn("[REDACTED]", redacted)


class RateLimiterTests(unittest.TestCase):
    def test_in_memory_limiter_blocks_after_limit(self) -> None:
        limiter = InMemoryRateLimiter()
        self.assertTrue(limiter.allow("login", 2, 60))
        self.assertTrue(limiter.allow("login", 2, 60))
        self.assertFalse(limiter.allow("login", 2, 60))


class SecurityHeaderTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        reset_rate_limiter()
        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def test_api_responses_include_security_headers(self) -> None:
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("x-content-type-options"), "nosniff")
        self.assertEqual(response.headers.get("x-frame-options"), "DENY")
        self.assertEqual(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin")
        self.assertIn("default-src 'none'", response.headers.get("content-security-policy", ""))
        body = response.json()
        self.assertIn(body["environment"], {"development", "production", "test"})
        self.assertNotIn("postgresql", str(body).lower())
        self.assertNotIn("password", str(body).lower())
        self.assertNotIn("jwt", str(body).lower())

    def test_authenticated_response_is_not_stored(self) -> None:
        response = self.client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-jwt"})
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.headers.get("cache-control"), "no-store")
        self.assertNotIn("not-a-jwt", response.text)

    def test_register_validation_does_not_echo_password(self) -> None:
        response = self.client.post(
            "/api/v1/auth/register",
            json={"full_name": "A", "email": "user@example.com", "password": "hunter2"},
        )
        self.assertEqual(response.status_code, 422)
        self.assertNotIn("hunter2", response.text)
        self.assertNotIn('"input"', response.text)

    def test_docs_remain_available_in_development(self) -> None:
        response = self.client.get("/openapi.json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("/api/v1/auth/login", response.json()["paths"])


if __name__ == "__main__":
    unittest.main()
