"""Wallet API tests. Database cases use a separate PostgreSQL test URL."""

from __future__ import annotations

import os
import unittest
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db.base import Base
from app.db.init_db import ensure_application_schema
from app.db.session import check_database, get_engine, load_database_env, reset_engine
from app.main import app
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

WALLET_RESPONSE_KEYS = {
    "citizen_id",
    "age",
    "gender",
    "is_student",
    "first_higher_education_course",
    "school_background",
    "marital_status",
    "is_orphan",
    "is_destitute",
    "occupation_category",
    "wet_land_acres",
    "dry_land_acres",
    "created_at",
    "updated_at",
}


def _postgres_ready() -> bool:
    """Use only TEST_DATABASE_URL. Never run destructive tests on the app database."""
    load_database_env()
    test_url = (os.environ.get("TEST_DATABASE_URL") or "").strip()
    if not test_url:
        return False
    os.environ["SCHEME_PREDICTOR_USE_TEST_DB"] = "1"
    reset_engine()
    return check_database()


class WalletValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def test_unauthenticated_invalid_age_returns_401(self) -> None:
        response = self.client.post("/api/v1/wallets", json={**WALLET_PROFILE, "age": 150})
        self.assertEqual(response.status_code, 401)

    def test_unauthenticated_negative_land_returns_401(self) -> None:
        response = self.client.post("/api/v1/wallets", json={**WALLET_PROFILE, "wet_land_acres": -1})
        self.assertEqual(response.status_code, 401)

    def test_unauthenticated_invalid_categorical_value_returns_401(self) -> None:
        response = self.client.post("/api/v1/wallets", json={**WALLET_PROFILE, "gender": "unknown"})
        self.assertEqual(response.status_code, 401)

    def test_existing_recommend_still_works(self) -> None:
        response = self.client.post("/api/v1/recommend", json=WALLET_PROFILE)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["total_schemes_evaluated"], 6)

    def test_existing_predict_still_works(self) -> None:
        response = self.client.post("/api/v1/predict", json={**WALLET_PROFILE, "scheme_id": "TN-SW-001"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["prediction"], "eligible")

    def test_existing_schemes_still_works(self) -> None:
        response = self.client.get("/api/v1/schemes")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["scheme_count"], 6)

    def test_openapi_lists_wallet_routes(self) -> None:
        spec = self.client.get("/openapi.json").json()
        paths = spec["paths"]
        self.assertIn("/api/v1/wallets", paths)
        self.assertIn("/api/v1/wallets/me", paths)
        self.assertIn("/api/v1/wallets/{citizen_id}", paths)
        self.assertIn("/api/v1/wallets/{citizen_id}/recommend", paths)
        self.assertIn("/api/v1/wallets/me/completeness", paths)
        self.assertIn("get", paths["/api/v1/wallets/me/completeness"])
        self.assertIn("post", paths["/api/v1/wallets"])
        self.assertIn("get", paths["/api/v1/wallets/{citizen_id}"])
        self.assertIn("put", paths["/api/v1/wallets/{citizen_id}"])
        self.assertIn("delete", paths["/api/v1/wallets/{citizen_id}"])
        self.assertIn("post", paths["/api/v1/wallets/{citizen_id}/recommend"])
        self.assertIn("CitizenWalletCreate", spec["components"]["schemas"])
        self.assertIn("CitizenWalletResponse", spec["components"]["schemas"])
        create_props = spec["components"]["schemas"]["CitizenWalletCreate"]["properties"]
        self.assertNotIn("citizen_id", create_props)
        self.assertNotIn("user_id", create_props)

    def test_unauthenticated_wallet_create_returns_401(self) -> None:
        response = self.client.post("/api/v1/wallets", json=WALLET_PROFILE)
        self.assertEqual(response.status_code, 401)


@unittest.skipUnless(_postgres_ready(), "PostgreSQL test database is not configured or unavailable")
class WalletDatabaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
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

    def _headers(self, email: str = "wallet.owner@example.com") -> dict[str, str]:
        self.client.post(
            "/api/v1/auth/register",
            json={"full_name": "Wallet Owner", "email": email, "password": "password123"},
        )
        token = self.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "password123"},
        ).json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_database_connection(self) -> None:
        self.assertTrue(check_database())
        health = self.client.get("/health").json()
        self.assertEqual(health["database"], "connected")
        self.assertEqual(health["status"], "ok")

    def test_create_and_retrieve_wallet(self) -> None:
        headers = self._headers()
        created = self.client.post("/api/v1/wallets", json=WALLET_PROFILE, headers=headers)
        self.assertEqual(created.status_code, 201)
        body = created.json()
        self.assertEqual(set(body.keys()), WALLET_RESPONSE_KEYS)
        self.assertTrue(body["citizen_id"])
        self.assertEqual(body["age"], 20)
        self.assertNotIn("eligible", body)
        self.assertNotIn("id", body)
        self.assertNotIn("user_id", body)

        fetched = self.client.get(f"/api/v1/wallets/{body['citizen_id']}", headers=headers)
        self.assertEqual(fetched.status_code, 200)
        self.assertEqual(fetched.json()["citizen_id"], body["citizen_id"])
        self.assertEqual(fetched.json()["gender"], "female")

    def test_update_wallet(self) -> None:
        headers = self._headers()
        citizen_id = self.client.post("/api/v1/wallets", json=WALLET_PROFILE, headers=headers).json()[
            "citizen_id"
        ]
        updated = self.client.put(
            f"/api/v1/wallets/{citizen_id}",
            json={**WALLET_PROFILE, "age": 21, "is_orphan": True},
            headers=headers,
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["age"], 21)
        self.assertTrue(updated.json()["is_orphan"])

    def test_delete_wallet(self) -> None:
        headers = self._headers()
        citizen_id = self.client.post("/api/v1/wallets", json=WALLET_PROFILE, headers=headers).json()[
            "citizen_id"
        ]
        deleted = self.client.delete(f"/api/v1/wallets/{citizen_id}", headers=headers)
        self.assertEqual(deleted.status_code, 204)
        missing = self.client.get(f"/api/v1/wallets/{citizen_id}", headers=headers)
        self.assertEqual(missing.status_code, 404)

    def test_wallet_not_found(self) -> None:
        headers = self._headers()
        response = self.client.get(f"/api/v1/wallets/{uuid4()}", headers=headers)
        self.assertEqual(response.status_code, 404)

    def test_wallet_recommendation(self) -> None:
        headers = self._headers()
        citizen_id = self.client.post("/api/v1/wallets", json=WALLET_PROFILE, headers=headers).json()[
            "citizen_id"
        ]
        response = self.client.post(f"/api/v1/wallets/{citizen_id}/recommend", headers=headers)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["total_schemes_evaluated"], 6)
        self.assertIn("TN-SW-001", [item["scheme_id"] for item in body["recommendations"]])

    def test_wallet_recommendation_for_missing_citizen(self) -> None:
        headers = self._headers()
        response = self.client.post(f"/api/v1/wallets/{uuid4()}/recommend", headers=headers)
        self.assertEqual(response.status_code, 404)

    def test_invalid_age_returns_422_when_authenticated(self) -> None:
        headers = self._headers()
        response = self.client.post("/api/v1/wallets", json={**WALLET_PROFILE, "age": 150}, headers=headers)
        self.assertEqual(response.status_code, 422)

    def test_negative_land_returns_422_when_authenticated(self) -> None:
        headers = self._headers()
        response = self.client.post(
            "/api/v1/wallets",
            json={**WALLET_PROFILE, "wet_land_acres": -1},
            headers=headers,
        )
        self.assertEqual(response.status_code, 422)

    def test_invalid_categorical_value_returns_422_when_authenticated(self) -> None:
        headers = self._headers()
        response = self.client.post(
            "/api/v1/wallets",
            json={**WALLET_PROFILE, "gender": "unknown"},
            headers=headers,
        )
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
