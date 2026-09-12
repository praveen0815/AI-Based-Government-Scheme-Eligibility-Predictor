"""Application tracking API tests. Does not submit government applications."""

from __future__ import annotations

import os
import unittest

from app.db.session import check_database, load_database_env, reset_engine
from app.schemas.applications import APPLICATION_DISCLAIMER, APPLICATION_STATUSES


def _postgres_ready() -> bool:
    load_database_env()
    test_url = (os.environ.get("TEST_DATABASE_URL") or "").strip()
    if not test_url:
        return False
    os.environ["SCHEME_PREDICTOR_USE_TEST_DB"] = "1"
    reset_engine()
    return check_database()


class ApplicationContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        from fastapi.testclient import TestClient

        from app.main import app

        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def test_unauthenticated_application_list_returns_401(self) -> None:
        response = self.client.get("/api/v1/applications")
        self.assertEqual(response.status_code, 401)

    def test_unauthenticated_application_create_returns_401(self) -> None:
        response = self.client.post("/api/v1/applications", json={"scheme_id": "TN-SW-001"})
        self.assertEqual(response.status_code, 401)

    def test_openapi_lists_application_routes(self) -> None:
        response = self.client.get("/openapi.json")
        self.assertEqual(response.status_code, 200)
        paths = response.json()["paths"]
        self.assertIn("/api/v1/applications", paths)
        self.assertIn("/api/v1/applications/{application_id}", paths)
        self.assertIn("submitted", APPLICATION_DISCLAIMER.lower())
        self.assertIn("planning", APPLICATION_STATUSES)


@unittest.skipUnless(_postgres_ready(), "TEST_DATABASE_URL is unset or PostgreSQL is unavailable")
class ApplicationOwnershipTests(unittest.TestCase):
    def setUp(self) -> None:
        from fastapi.testclient import TestClient

        from app.db.init_db import init_db
        from app.main import app

        init_db()
        self.client = TestClient(app)
        suffix = os.urandom(4).hex()
        payload = {
            "full_name": "Application Tester",
            "email": f"apps-{suffix}@example.com",
            "password": "password123",
        }
        created = self.client.post("/api/v1/auth/register", json=payload)
        self.assertEqual(created.status_code, 201)
        login = self.client.post(
            "/api/v1/auth/login",
            json={"email": payload["email"], "password": payload["password"]},
        )
        self.assertEqual(login.status_code, 200)
        self.headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    def test_create_update_and_list_are_owner_only(self) -> None:
        created = self.client.post(
            "/api/v1/applications",
            headers=self.headers,
            json={"scheme_id": "TN-SW-001", "status": "planning"},
        )
        self.assertEqual(created.status_code, 201)
        body = created.json()
        self.assertEqual(body["scheme_id"], "TN-SW-001")
        self.assertEqual(body["status"], "planning")
        self.assertIn("does not submit", body["disclaimer"].lower())

        listed = self.client.get("/api/v1/applications", headers=self.headers)
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.json()["count"], 1)

        updated = self.client.patch(
            f"/api/v1/applications/{body['application_id']}",
            headers=self.headers,
            json={"status": "documents_ready"},
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["status"], "documents_ready")

        unknown = self.client.get("/api/v1/applications")
        self.assertEqual(unknown.status_code, 401)

        missing = self.client.patch(
            "/api/v1/applications/00000000-0000-0000-0000-000000000000",
            headers=self.headers,
            json={"status": "applied"},
        )
        self.assertEqual(missing.status_code, 404)
