"""Profile completeness unit and API tests."""

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
from app.services.profile_completeness_service import calculate_profile_completeness

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


class ProfileCompletenessServiceTests(unittest.TestCase):
    def test_complete_profile_counts_false_and_zero(self) -> None:
        result = calculate_profile_completeness(WALLET_PROFILE)
        self.assertEqual(result.percentage, 100)
        self.assertEqual(result.completed_fields, 11)
        self.assertEqual(result.total_fields, 11)
        self.assertEqual(result.incomplete_fields, [])

    def test_false_boolean_is_completed(self) -> None:
        result = calculate_profile_completeness({**WALLET_PROFILE, "is_student": False})
        self.assertEqual(result.percentage, 100)
        self.assertNotIn("is_student", result.incomplete_fields)

    def test_zero_numeric_is_completed(self) -> None:
        result = calculate_profile_completeness({**WALLET_PROFILE, "wet_land_acres": 0})
        self.assertEqual(result.percentage, 100)
        self.assertNotIn("wet_land_acres", result.incomplete_fields)

    def test_missing_and_empty_values_are_incomplete(self) -> None:
        profile = {
            "age": 20,
            "gender": "",
            "is_student": False,
            "first_higher_education_course": True,
            "school_background": None,
            "marital_status": "never_married",
            "is_orphan": False,
            "is_destitute": False,
            "occupation_category": "other",
            "wet_land_acres": 0,
        }
        result = calculate_profile_completeness(profile)
        self.assertEqual(result.total_fields, 11)
        self.assertEqual(result.completed_fields, 8)
        self.assertEqual(result.percentage, 73)
        self.assertEqual(
            result.incomplete_fields,
            ["gender", "school_background", "dry_land_acres"],
        )


class CompletenessRouteContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        from fastapi.testclient import TestClient

        from app.main import app

        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def test_unauthenticated_completeness_returns_401(self) -> None:
        response = self.client.get("/api/v1/wallets/me/completeness")
        self.assertEqual(response.status_code, 401)

    def test_openapi_lists_completeness_route(self) -> None:
        paths = self.client.get("/openapi.json").json()["paths"]
        self.assertIn("/api/v1/wallets/me/completeness", paths)
        self.assertIn("get", paths["/api/v1/wallets/me/completeness"])


class CompletenessDatabaseTests(unittest.TestCase):
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

    def _headers(self, email: str = "complete.owner@example.com") -> dict[str, str]:
        self.client.post(
            "/api/v1/auth/register",
            json={"full_name": "Complete Owner", "email": email, "password": "password123"},
        )
        token = self.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "password123"},
        ).json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_completeness_requires_owned_wallet(self) -> None:
        headers = self._headers()
        missing = self.client.get("/api/v1/wallets/me/completeness", headers=headers)
        self.assertEqual(missing.status_code, 404)
        self.assertEqual(missing.json(), {"detail": "No data wallet was found for that citizen ID."})

        self.client.post("/api/v1/wallets", json=WALLET_PROFILE, headers=headers)
        complete = self.client.get("/api/v1/wallets/me/completeness", headers=headers)
        self.assertEqual(complete.status_code, 200)
        self.assertEqual(
            complete.json(),
            {
                "percentage": 100,
                "completed_fields": 11,
                "total_fields": 11,
                "incomplete_fields": [],
            },
        )
        self.assertNotIn("user_id", complete.json())
        self.assertNotIn("citizen_id", complete.json())


if __name__ == "__main__":
    unittest.main()
