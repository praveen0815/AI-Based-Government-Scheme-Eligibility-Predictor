"""Eligibility insights API tests. Does not change ranking or save history."""

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
from app.models import user as _user_model  # noqa: F401
from app.schemas.compare import NOT_RECOMMENDED_LABEL, PREDICTED_ELIGIBLE_LABEL

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


class InsightsContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        from fastapi.testclient import TestClient

        from app.main import app

        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def test_unauthenticated_insights_returns_401(self) -> None:
        response = self.client.get("/api/v1/insights")
        self.assertEqual(response.status_code, 401)

    def test_openapi_lists_insights_route(self) -> None:
        paths = self.client.get("/openapi.json").json()["paths"]
        self.assertIn("/api/v1/insights", paths)
        self.assertIn("get", paths["/api/v1/insights"])


class InsightsDatabaseTests(unittest.TestCase):
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

    def _headers(self, email: str) -> dict[str, str]:
        self.client.post(
            "/api/v1/auth/register",
            json={"full_name": "Insights Owner", "email": email, "password": "password123"},
        )
        token = self.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "password123"},
        ).json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_missing_wallet_returns_404(self) -> None:
        headers = self._headers("no.wallet.insights@example.com")
        response = self.client.get("/api/v1/insights", headers=headers)
        self.assertEqual(response.status_code, 404)

    def test_insights_evaluate_core_schemes_without_saving_history(self) -> None:
        headers = self._headers("insights.owner@example.com")
        self.client.post("/api/v1/wallets", json=WALLET_PROFILE, headers=headers)
        response = self.client.get("/api/v1/insights", headers=headers)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["total_schemes_evaluated"], 6)
        self.assertEqual(body["predicted_eligible_count"] + body["not_recommended_count"], 6)
        self.assertGreaterEqual(body["predicted_eligible_count"], 1)
        self.assertIn("TN-SW-001", [item["scheme_id"] for item in body["recommended_schemes"]])
        recommended = next(item for item in body["recommended_schemes"] if item["scheme_id"] == "TN-SW-001")
        self.assertEqual(recommended["status_label"], PREDICTED_ELIGIBLE_LABEL)
        self.assertTrue(recommended["rule_reasons"])
        self.assertIn("ml_prediction", recommended)
        self.assertIn("eligible_probability", recommended)
        self.assertIn("agreement", recommended)
        other = body["other_schemes"]
        self.assertTrue(other)
        self.assertTrue(all(item["status_label"] == NOT_RECOMMENDED_LABEL for item in other))
        self.assertTrue(all("reject" not in item["status_label"].lower() for item in other))
        self.assertIn("verify_profile", [item["code"] for item in body["review_items"]])
        self.assertIn("review_official_source", [item["code"] for item in body["review_items"]])
        self.assertEqual(body["completeness"]["total_fields"], 11)
        self.assertNotIn("change your", str(body["review_items"]).lower())
        self.assertNotIn("become eligible", str(body["review_items"]).lower())
        history = self.client.get("/api/v1/history", headers=headers)
        self.assertEqual(history.status_code, 200)
        self.assertEqual(history.json()["count"], 0)

    def test_insights_are_owner_only(self) -> None:
        owner = self._headers("insights.owner.only@example.com")
        other = self._headers("insights.other.only@example.com")
        self.client.post("/api/v1/wallets", json=WALLET_PROFILE, headers=owner)
        own = self.client.get("/api/v1/insights", headers=owner)
        foreign = self.client.get("/api/v1/insights", headers=other)
        self.assertEqual(own.status_code, 200)
        self.assertEqual(foreign.status_code, 404)
        self.assertGreaterEqual(own.json()["predicted_eligible_count"], 1)


if __name__ == "__main__":
    unittest.main()
