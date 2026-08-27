"""Personalized dashboard API tests. Does not change eligibility scoring."""

from __future__ import annotations

import os
import unittest

from sqlalchemy import text

from app.db.base import Base
from app.db.init_db import ensure_application_schema
from app.db.session import check_database, get_engine, load_database_env, reset_engine
from app.models import citizen as _citizen_model  # noqa: F401
from app.models import documents as _documents_model  # noqa: F401
from app.models import history as _history_model  # noqa: F401
from app.models import readiness as _readiness_model  # noqa: F401
from app.models import user as _user_model  # noqa: F401
from app.schemas.documents import OFFICIAL_SOURCE_ITEM_KEY

WALLET_PROFILE = {
    "age": 20,
    "gender": "female",
    "is_student": True,
    "first_higher_education_course": True,
    "school_background": "government_6_to_12",
    "marital_status": "never_married",
    "is_orphan": False,
    "is_destitute": False,
    "occupation_category": "other",
    "wet_land_acres": 0.0,
    "dry_land_acres": 0.0,
}


def _postgres_ready() -> bool:
    load_database_env()
    test_url = (os.environ.get("TEST_DATABASE_URL") or "").strip()
    if not test_url:
        return False
    os.environ["SCHEME_PREDICTOR_USE_TEST_DB"] = "1"
    reset_engine()
    return check_database()


class DashboardContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        from fastapi.testclient import TestClient

        from app.main import app

        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def test_unauthenticated_dashboard_returns_401(self) -> None:
        response = self.client.get("/api/v1/dashboard")
        self.assertEqual(response.status_code, 401)

    def test_openapi_lists_dashboard_route(self) -> None:
        paths = self.client.get("/openapi.json").json()["paths"]
        self.assertIn("/api/v1/dashboard", paths)
        self.assertIn("get", paths["/api/v1/dashboard"])


class DashboardDatabaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        if not _postgres_ready():
            raise unittest.SkipTest("PostgreSQL test database is not configured or unavailable")
        from fastapi.testclient import TestClient

        from app.main import app

        reset_engine()
        engine = get_engine()
        if engine is None:
            raise unittest.SkipTest("PostgreSQL test database is not configured")
        Base.metadata.create_all(bind=engine)
        ensure_application_schema(engine)
        cls.engine = engine
        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)
        reset_engine()

    def setUp(self) -> None:
        with self.engine.begin() as connection:
            connection.execute(text("DELETE FROM supporting_uploads"))
            connection.execute(text("DELETE FROM application_readiness"))
            connection.execute(text("DELETE FROM document_checklist_progress"))
            connection.execute(text("DELETE FROM recommendation_history"))
            connection.execute(text("DELETE FROM citizen_profiles"))
            connection.execute(text("DELETE FROM users"))

    def _headers(self, email: str, name: str = "Dashboard Owner") -> dict[str, str]:
        self.client.post(
            "/api/v1/auth/register",
            json={"full_name": name, "email": email, "password": "password123"},
        )
        token = self.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "password123"},
        ).json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_empty_overview_when_user_has_no_wallet(self) -> None:
        headers = self._headers("dash.empty@example.com")
        response = self.client.get("/api/v1/dashboard", headers=headers)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertFalse(body["has_wallet"])
        self.assertEqual(body["progress"]["profile_completeness_percent"], 0)
        self.assertFalse(body["progress"]["eligibility_checked"])
        self.assertEqual(body["summary"]["total_recommended_schemes"], 0)
        self.assertEqual(body["activity"], [])
        journey = {step["key"]: step["status"] for step in body["journey"]}
        self.assertEqual(journey["profile_created"], "current")
        self.assertEqual(journey["application_readiness"], "pending")
        self.assertIn("not government approval", body["disclaimer"].lower())

    def test_overview_is_owner_only_and_uses_existing_progress(self) -> None:
        owner = self._headers("dash.owner@example.com", "Owner")
        other = self._headers("dash.other@example.com", "Other")

        citizen_id = self.client.post("/api/v1/wallets", json=WALLET_PROFILE, headers=owner).json()[
            "citizen_id"
        ]
        recommend = self.client.post(f"/api/v1/wallets/{citizen_id}/recommend", headers=owner)
        self.assertEqual(recommend.status_code, 200)
        self.assertIn("TN-SW-001", [item["scheme_id"] for item in recommend.json()["recommendations"]])

        self.client.patch(
            f"/api/v1/documents/schemes/TN-SW-001/items/{OFFICIAL_SOURCE_ITEM_KEY}",
            json={"status": "ready"},
            headers=owner,
        )
        self.client.patch(
            "/api/v1/readiness/schemes/TN-SW-001",
            json={"stage": "documents_in_progress"},
            headers=owner,
        )

        body = self.client.get("/api/v1/dashboard", headers=owner).json()
        self.assertTrue(body["has_wallet"])
        self.assertEqual(body["progress"]["profile_completeness_percent"], 100)
        self.assertTrue(body["progress"]["eligibility_checked"])
        self.assertGreaterEqual(body["summary"]["total_recommended_schemes"], 1)
        self.assertEqual(body["summary"]["schemes_with_document_progress"], 1)
        self.assertEqual(body["summary"]["schemes_being_prepared"], 1)
        self.assertGreater(body["summary"]["overall_preparation_progress"], 0)
        journey = {step["key"]: step["status"] for step in body["journey"]}
        self.assertEqual(journey["profile_created"], "completed")
        self.assertEqual(journey["profile_completed"], "completed")
        self.assertEqual(journey["eligibility_checked"], "completed")
        self.assertEqual(journey["schemes_recommended"], "completed")
        self.assertEqual(journey["documents_prepared"], "completed")
        self.assertEqual(journey["application_readiness"], "completed")

        kinds = {item["kind"] for item in body["activity"]}
        self.assertIn("recommendation", kinds)
        self.assertIn("document", kinds)
        self.assertIn("readiness", kinds)
        self.assertTrue(all("occurred_at" in item for item in body["activity"]))

        foreign = self.client.get("/api/v1/dashboard", headers=other).json()
        self.assertFalse(foreign["has_wallet"])
        self.assertEqual(foreign["activity"], [])
        self.assertEqual(foreign["summary"]["total_recommended_schemes"], 0)


if __name__ == "__main__":
    unittest.main()
