"""Application readiness API tests. Does not submit government applications."""

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
from app.schemas.readiness import READINESS_DISCLAIMER, READINESS_STAGES
from app.services.readiness_service import _progress_percent

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


class ReadinessProgressMathTests(unittest.TestCase):
    def test_stage_progress_is_manual_tracker_percent_only(self) -> None:
        self.assertEqual(_progress_percent("not_started"), 0)
        self.assertEqual(_progress_percent("profile_ready"), 20)
        self.assertEqual(_progress_percent("documents_in_progress"), 40)
        self.assertEqual(_progress_percent("ready_to_apply"), 60)
        self.assertEqual(_progress_percent("official_source_visited"), 80)
        self.assertEqual(_progress_percent("completed_preparation"), 100)
        self.assertEqual(len(READINESS_STAGES), 6)
        self.assertIn("submitted", READINESS_DISCLAIMER.lower())
        self.assertIn("approved", READINESS_DISCLAIMER.lower())


class ReadinessContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        from fastapi.testclient import TestClient

        from app.main import app

        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def test_unauthenticated_readiness_list_returns_401(self) -> None:
        response = self.client.get("/api/v1/readiness")
        self.assertEqual(response.status_code, 401)

    def test_unauthenticated_scheme_readiness_returns_401(self) -> None:
        response = self.client.get("/api/v1/readiness/schemes/TN-SW-001")
        self.assertEqual(response.status_code, 401)

    def test_unauthenticated_stage_update_returns_401(self) -> None:
        response = self.client.patch(
            "/api/v1/readiness/schemes/TN-SW-001",
            json={"stage": "profile_ready"},
        )
        self.assertEqual(response.status_code, 401)

    def test_openapi_lists_readiness_routes(self) -> None:
        paths = self.client.get("/openapi.json").json()["paths"]
        self.assertIn("/api/v1/readiness", paths)
        self.assertIn("/api/v1/readiness/schemes/{scheme_id}", paths)
        self.assertIn("get", paths["/api/v1/readiness"])
        self.assertIn("get", paths["/api/v1/readiness/schemes/{scheme_id}"])
        self.assertIn("patch", paths["/api/v1/readiness/schemes/{scheme_id}"])


class ReadinessDatabaseTests(unittest.TestCase):
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

    def _headers(self, email: str, name: str = "Readiness Owner") -> dict[str, str]:
        self.client.post(
            "/api/v1/auth/register",
            json={"full_name": name, "email": email, "password": "password123"},
        )
        token = self.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "password123"},
        ).json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def _recommend(self, headers: dict[str, str]) -> list[str]:
        citizen_id = self.client.post("/api/v1/wallets", json=WALLET_PROFILE, headers=headers).json()[
            "citizen_id"
        ]
        recommend = self.client.post(f"/api/v1/wallets/{citizen_id}/recommend", headers=headers)
        self.assertEqual(recommend.status_code, 200)
        return [item["scheme_id"] for item in recommend.json()["recommendations"]]

    def test_empty_progress_when_user_has_no_recommendation_history(self) -> None:
        headers = self._headers("no.history.readiness@example.com")
        listed = self.client.get("/api/v1/readiness", headers=headers)
        self.assertEqual(listed.status_code, 200)
        body = listed.json()
        self.assertEqual(body["schemes"], [])
        self.assertEqual(body["schemes_being_prepared"], 0)
        self.assertEqual(body["overall_progress_percent"], 0)
        self.assertIn("completed preparation", body["disclaimer"].lower())
        self.assertIn("submitted", body["disclaimer"].lower())

        missing = self.client.get("/api/v1/readiness/schemes/TN-SW-001", headers=headers)
        self.assertEqual(missing.status_code, 404)
        self.assertEqual(
            missing.json(),
            {"detail": "No application readiness tracker was found for that scheme."},
        )

    def test_tracker_is_history_gated_and_get_does_not_insert(self) -> None:
        owner = self._headers("readiness.owner@example.com", "Owner")
        other = self._headers("readiness.other@example.com", "Other")
        recommended = self._recommend(owner)
        self.assertIn("TN-SW-001", recommended)

        listed = self.client.get("/api/v1/readiness", headers=owner)
        self.assertEqual(listed.status_code, 200)
        scheme_ids = [row["scheme_id"] for row in listed.json()["schemes"]]
        self.assertEqual(scheme_ids, recommended)
        self.assertEqual(listed.json()["schemes_being_prepared"], 0)
        self.assertEqual(listed.json()["schemes"][0]["stage"], "not_started")
        self.assertEqual(listed.json()["schemes"][0]["progress_percent"], 0)
        self.assertFalse(listed.json()["schemes"][0]["has_saved_progress"])

        with self.engine.connect() as connection:
            count = connection.execute(text("SELECT COUNT(*) FROM application_readiness")).scalar()
        self.assertEqual(count, 0)

        detail = self.client.get("/api/v1/readiness/schemes/TN-SW-001", headers=owner)
        self.assertEqual(detail.status_code, 200)
        payload = detail.json()
        self.assertEqual(payload["scheme_id"], "TN-SW-001")
        self.assertEqual(payload["stage"], "not_started")
        self.assertEqual(payload["stage_index"], 0)
        self.assertEqual(payload["stage_count"], 6)
        self.assertEqual(payload["progress_percent"], 0)
        self.assertFalse(payload["has_saved_progress"])
        self.assertIn("does not mean the government application was submitted", payload["disclaimer"])

        foreign = self.client.get("/api/v1/readiness/schemes/TN-SW-001", headers=other)
        self.assertEqual(foreign.status_code, 404)
        self.assertEqual(
            foreign.json(),
            {"detail": "No application readiness tracker was found for that scheme."},
        )

        unknown_scheme = self.client.get("/api/v1/readiness/schemes/TN-ADV-999", headers=owner)
        self.assertEqual(unknown_scheme.status_code, 404)

    def test_stage_update_is_owner_only_and_calculates_percentage(self) -> None:
        owner = self._headers("readiness.ready@example.com")
        other = self._headers("readiness.ready.other@example.com")
        self._recommend(owner)

        updated = self.client.patch(
            "/api/v1/readiness/schemes/TN-SW-001",
            json={"stage": "profile_ready"},
            headers=owner,
        )
        self.assertEqual(updated.status_code, 200)
        body = updated.json()
        self.assertEqual(body["stage"], "profile_ready")
        self.assertEqual(body["stage_index"], 1)
        self.assertEqual(body["progress_percent"], 20)
        self.assertTrue(body["has_saved_progress"])

        listed = self.client.get("/api/v1/readiness", headers=owner).json()
        self.assertEqual(listed["schemes_being_prepared"], 1)
        target = next(row for row in listed["schemes"] if row["scheme_id"] == "TN-SW-001")
        self.assertEqual(target["progress_percent"], 20)
        self.assertEqual(listed["overall_progress_percent"], 20)

        completed = self.client.patch(
            "/api/v1/readiness/schemes/TN-SW-001",
            json={"stage": "completed_preparation"},
            headers=owner,
        )
        self.assertEqual(completed.status_code, 200)
        self.assertEqual(completed.json()["stage"], "completed_preparation")
        self.assertEqual(completed.json()["progress_percent"], 100)
        self.assertIn(
            "Completed Preparation does not mean the government application was submitted or approved.",
            completed.json()["disclaimer"],
        )

        listed = self.client.get("/api/v1/readiness", headers=owner).json()
        self.assertEqual(listed["overall_progress_percent"], 100)

        foreign = self.client.patch(
            "/api/v1/readiness/schemes/TN-SW-001",
            json={"stage": "ready_to_apply"},
            headers=other,
        )
        self.assertEqual(foreign.status_code, 404)

        invalid_stage = self.client.patch(
            "/api/v1/readiness/schemes/TN-SW-001",
            json={"stage": "government_submitted"},
            headers=owner,
        )
        self.assertEqual(invalid_stage.status_code, 422)

    def test_account_delete_removes_readiness_rows(self) -> None:
        headers = self._headers("readiness.delete@example.com")
        self._recommend(headers)
        self.client.patch(
            "/api/v1/readiness/schemes/TN-SW-001",
            json={"stage": "documents_in_progress"},
            headers=headers,
        )
        deleted = self.client.delete("/api/v1/auth/me", headers=headers)
        self.assertEqual(deleted.status_code, 204)
        with self.engine.connect() as connection:
            count = connection.execute(text("SELECT COUNT(*) FROM application_readiness")).scalar()
        self.assertEqual(count, 0)


if __name__ == "__main__":
    unittest.main()
