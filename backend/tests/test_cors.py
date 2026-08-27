"""CORS is limited to the local Vite development origins."""

from __future__ import annotations

import unittest

from fastapi.testclient import TestClient

from app.cors import ALLOWED_DEV_ORIGINS, ALLOWED_METHODS
from app.main import app


class CorsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def test_vite_localhost_origin_is_allowed(self) -> None:
        response = self.client.options(
            "/api/v1/recommend",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers.get("access-control-allow-origin"),
            "http://localhost:5173",
        )

    def test_vite_loopback_origin_is_allowed(self) -> None:
        response = self.client.options(
            "/api/v1/schemes",
            headers={
                "Origin": "http://127.0.0.1:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers.get("access-control-allow-origin"),
            "http://127.0.0.1:5173",
        )

    def test_unknown_origin_is_not_wildcarded(self) -> None:
        response = self.client.options(
            "/api/v1/recommend",
            headers={
                "Origin": "http://evil.example",
                "Access-Control-Request-Method": "POST",
            },
        )
        self.assertNotEqual(response.headers.get("access-control-allow-origin"), "*")
        self.assertIsNone(response.headers.get("access-control-allow-origin"))

    def test_allowlist_is_only_local_vite(self) -> None:
        self.assertEqual(
            ALLOWED_DEV_ORIGINS,
            ("http://localhost:5173", "http://127.0.0.1:5173"),
        )
        self.assertNotIn("*", ALLOWED_DEV_ORIGINS)

    def test_patch_is_allowed_for_account_updates(self) -> None:
        self.assertIn("PATCH", ALLOWED_METHODS)
        response = self.client.options(
            "/api/v1/auth/me",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "PATCH",
            },
        )
        self.assertEqual(response.status_code, 200)
        allowed = response.headers.get("access-control-allow-methods", "")
        self.assertIn("PATCH", allowed)


if __name__ == "__main__":
    unittest.main()
