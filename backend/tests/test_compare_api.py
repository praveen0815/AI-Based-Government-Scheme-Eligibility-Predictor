"""CORE scheme comparison tests. Does not modify datasets or ranking."""

from __future__ import annotations

import os
import unittest

from sqlalchemy import text

from app.db.base import Base
from app.db.init_db import ensure_application_schema
from app.db.session import check_database, get_engine, load_database_env, reset_engine
from app.models import citizen as _citizen_model  # noqa: F401
from app.models import history as _history_model  # noqa: F401
from app.models import user as _user_model  # noqa: F401
from app.schemas.compare import NOT_RECOMMENDED_LABEL, PREDICTED_ELIGIBLE_LABEL
from app.services.compare_service import CompareSelectionError, compare_core_schemes

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


class CompareServiceTests(unittest.TestCase):
    def test_compares_two_core_schemes_from_catalog(self) -> None:
        result = compare_core_schemes(WALLET_PROFILE, ["TN-SW-001", "TN-SW-006"])
        self.assertEqual(result.scheme_count, 2)
        self.assertEqual([item.scheme_id for item in result.schemes], ["TN-SW-001", "TN-SW-006"])
        pudhumai = result.schemes[0]
        self.assertTrue(pudhumai.recommended)
        self.assertEqual(pudhumai.status_label, PREDICTED_ELIGIBLE_LABEL)
        self.assertEqual(pudhumai.prediction, "eligible")
        self.assertTrue(pudhumai.scheme_name)
        self.assertTrue(pudhumai.rule_reasons)
        self.assertIn("official_source_url", pudhumai.model_dump())
        self.assertNotIn("rejected", pudhumai.status_label.lower())

    def test_non_recommended_scheme_is_not_called_official_rejection(self) -> None:
        result = compare_core_schemes(WALLET_PROFILE, ["TN-SW-001", "TN-REV-001"])
        land = next(item for item in result.schemes if item.scheme_id == "TN-REV-001")
        self.assertFalse(land.recommended)
        self.assertEqual(land.status_label, NOT_RECOMMENDED_LABEL)
        self.assertNotIn("reject", land.status_label.lower())
        self.assertNotIn("official", land.status_label.lower())

    def test_rejects_one_scheme_and_non_core_ids(self) -> None:
        with self.assertRaises(CompareSelectionError):
            compare_core_schemes(WALLET_PROFILE, ["TN-SW-001"])
        with self.assertRaises(CompareSelectionError):
            compare_core_schemes(WALLET_PROFILE, ["TN-SW-001", "TN-SW-001"])
        with self.assertRaises(CompareSelectionError):
            compare_core_schemes(WALLET_PROFILE, ["TN-SW-001", "TN-HOLD-001"])


class CompareRouteContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        from fastapi.testclient import TestClient

        from app.main import app

        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def test_unauthenticated_compare_returns_401(self) -> None:
        response = self.client.post(
            "/api/v1/compare",
            json={"scheme_ids": ["TN-SW-001", "TN-SW-006"]},
        )
        self.assertEqual(response.status_code, 401)

    def test_openapi_lists_compare_route(self) -> None:
        paths = self.client.get("/openapi.json").json()["paths"]
        self.assertIn("/api/v1/compare", paths)
        self.assertIn("post", paths["/api/v1/compare"])


class CompareDatabaseTests(unittest.TestCase):
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

    def _headers(self) -> dict[str, str]:
        self.client.post(
            "/api/v1/auth/register",
            json={"full_name": "Compare Owner", "email": "compare@example.com", "password": "password123"},
        )
        token = self.client.post(
            "/api/v1/auth/login",
            json={"email": "compare@example.com", "password": "password123"},
        ).json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_compare_uses_owned_wallet_and_ignores_client_eligibility(self) -> None:
        headers = self._headers()
        missing = self.client.post(
            "/api/v1/compare",
            json={"scheme_ids": ["TN-SW-001", "TN-SW-006"]},
            headers=headers,
        )
        self.assertEqual(missing.status_code, 404)

        self.client.post("/api/v1/wallets", json=WALLET_PROFILE, headers=headers)
        response = self.client.post(
            "/api/v1/compare",
            json={"scheme_ids": ["TN-SW-001", "TN-SW-006"]},
            headers=headers,
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["scheme_count"], 2)
        self.assertEqual(body["schemes"][0]["status_label"], PREDICTED_ELIGIBLE_LABEL)
        self.assertNotIn("user_id", body)
        self.assertNotIn("password", str(body).lower())


if __name__ == "__main__":
    unittest.main()
