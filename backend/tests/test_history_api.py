"""Recommendation history API tests."""

from __future__ import annotations

import os
import unittest
from uuid import uuid4

from sqlalchemy import text

from app.db.base import Base
from app.db.init_db import ensure_application_schema
from app.db.session import check_database, get_engine, load_database_env, reset_engine
from app.models import citizen as _citizen_model  # noqa: F401
from app.models import history as _history_model  # noqa: F401
from app.models import user as _user_model  # noqa: F401

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

HISTORY_ITEM_KEYS = {
    "id",
    "checked_at",
    "profile_snapshot",
    "recommended_scheme_ids",
    "recommendation_count",
    "recommended_schemes",
}


def _postgres_ready() -> bool:
    load_database_env()
    test_url = (os.environ.get("TEST_DATABASE_URL") or "").strip()
    if not test_url:
        return False
    os.environ["SCHEME_PREDICTOR_USE_TEST_DB"] = "1"
    reset_engine()
    return check_database()


class HistoryContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        from fastapi.testclient import TestClient

        from app.main import app

        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def test_unauthenticated_history_list_returns_401(self) -> None:
        response = self.client.get("/api/v1/history")
        self.assertEqual(response.status_code, 401)

    def test_unauthenticated_history_detail_returns_401(self) -> None:
        response = self.client.get(f"/api/v1/history/{uuid4()}")
        self.assertEqual(response.status_code, 401)

    def test_unauthenticated_history_delete_returns_401(self) -> None:
        response = self.client.delete(f"/api/v1/history/{uuid4()}")
        self.assertEqual(response.status_code, 401)

    def test_openapi_lists_history_routes(self) -> None:
        paths = self.client.get("/openapi.json").json()["paths"]
        self.assertIn("/api/v1/history", paths)
        self.assertIn("/api/v1/history/{history_id}", paths)
        self.assertIn("get", paths["/api/v1/history"])
        self.assertIn("get", paths["/api/v1/history/{history_id}"])
        self.assertIn("delete", paths["/api/v1/history/{history_id}"])


class HistoryDatabaseTests(unittest.TestCase):
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

    def _headers(self, email: str, name: str = "History Owner") -> dict[str, str]:
        self.client.post(
            "/api/v1/auth/register",
            json={"full_name": name, "email": email, "password": "password123"},
        )
        token = self.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "password123"},
        ).json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def _create_wallet_and_recommend(self, headers: dict[str, str]) -> tuple[dict, dict]:
        citizen_id = self.client.post("/api/v1/wallets", json=WALLET_PROFILE, headers=headers).json()[
            "citizen_id"
        ]
        recommend = self.client.post(f"/api/v1/wallets/{citizen_id}/recommend", headers=headers)
        self.assertEqual(recommend.status_code, 200)
        return recommend.json(), headers

    def test_wallet_recommend_saves_history_without_changing_response(self) -> None:
        headers = self._headers("owner@example.com")
        body, _ = self._create_wallet_and_recommend(headers)
        self.assertEqual(body["total_schemes_evaluated"], 6)
        self.assertIn("TN-SW-001", [item["scheme_id"] for item in body["recommendations"]])
        self.assertNotIn("history_id", body)
        self.assertNotIn("user_id", body)

        listed = self.client.get("/api/v1/history", headers=headers)
        self.assertEqual(listed.status_code, 200)
        payload = listed.json()
        self.assertEqual(payload["count"], 1)
        item = payload["history"][0]
        self.assertEqual(set(item.keys()), HISTORY_ITEM_KEYS)
        self.assertNotIn("user_id", item)
        self.assertEqual(item["profile_snapshot"]["age"], 20)
        self.assertEqual(item["profile_snapshot"]["is_student"], True)
        self.assertEqual(item["profile_snapshot"]["wet_land_acres"], 0.0)
        self.assertEqual(item["recommendation_count"], len(item["recommended_scheme_ids"]))
        self.assertEqual(item["recommended_scheme_ids"], [row["scheme_id"] for row in body["recommendations"]])
        self.assertTrue(item["recommended_schemes"])
        self.assertEqual(item["recommended_schemes"][0]["scheme_id"], item["recommended_scheme_ids"][0])
        self.assertTrue(item["recommended_schemes"][0]["scheme_name"])

    def test_history_is_newest_first(self) -> None:
        headers = self._headers("repeat@example.com")
        self._create_wallet_and_recommend(headers)
        citizen_id = self.client.get("/api/v1/wallets/me", headers=headers).json()["citizen_id"]
        second = self.client.post(f"/api/v1/wallets/{citizen_id}/recommend", headers=headers)
        self.assertEqual(second.status_code, 200)
        listed = self.client.get("/api/v1/history", headers=headers).json()
        self.assertEqual(listed["count"], 2)
        first_checked = listed["history"][0]["checked_at"]
        second_checked = listed["history"][1]["checked_at"]
        self.assertGreaterEqual(first_checked, second_checked)

    def test_history_detail_and_delete_are_owner_only(self) -> None:
        owner = self._headers("owner.history@example.com", "Owner")
        other = self._headers("other.history@example.com", "Other")
        self._create_wallet_and_recommend(owner)
        history_id = self.client.get("/api/v1/history", headers=owner).json()["history"][0]["id"]

        own = self.client.get(f"/api/v1/history/{history_id}", headers=owner)
        self.assertEqual(own.status_code, 200)
        self.assertEqual(own.json()["id"], history_id)
        self.assertEqual(own.json()["profile_snapshot"]["gender"], "female")

        foreign_get = self.client.get(f"/api/v1/history/{history_id}", headers=other)
        missing_get = self.client.get(f"/api/v1/history/{uuid4()}", headers=other)
        self.assertEqual(foreign_get.status_code, 404)
        self.assertEqual(missing_get.status_code, 404)
        self.assertEqual(foreign_get.json(), missing_get.json())
        self.assertEqual(foreign_get.json(), {"detail": "No recommendation history was found."})

        foreign_delete = self.client.delete(f"/api/v1/history/{history_id}", headers=other)
        self.assertEqual(foreign_delete.status_code, 404)
        self.assertEqual(foreign_delete.json(), {"detail": "No recommendation history was found."})

        deleted = self.client.delete(f"/api/v1/history/{history_id}", headers=owner)
        self.assertEqual(deleted.status_code, 204)
        missing = self.client.get(f"/api/v1/history/{history_id}", headers=owner)
        self.assertEqual(missing.status_code, 404)
        empty = self.client.get("/api/v1/history", headers=owner)
        self.assertEqual(empty.json()["count"], 0)
        self.assertEqual(empty.json()["history"], [])

    def test_history_does_not_recompute_recommendations(self) -> None:
        headers = self._headers("frozen@example.com")
        recommend_body, _ = self._create_wallet_and_recommend(headers)
        history_id = self.client.get("/api/v1/history", headers=headers).json()["history"][0]["id"]
        detail = self.client.get(f"/api/v1/history/{history_id}", headers=headers).json()
        self.assertEqual(
            detail["recommended_scheme_ids"],
            [item["scheme_id"] for item in recommend_body["recommendations"]],
        )
        self.assertNotIn("eligible_probability", detail)
        self.assertNotIn("prediction", detail)
        self.assertNotIn("ml_prediction", detail)


if __name__ == "__main__":
    unittest.main()
