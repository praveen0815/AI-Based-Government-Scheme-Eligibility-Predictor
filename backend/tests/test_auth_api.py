"""Authentication API tests. Database cases use TEST_DATABASE_URL only."""

from __future__ import annotations

import os
import unittest
from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db.base import Base
from app.db.init_db import ensure_application_schema
from app.db.session import check_database, get_engine, load_database_env, reset_engine
from app.main import app
from app.models import citizen as _citizen_model  # noqa: F401
from app.models import history as _history_model  # noqa: F401
from app.models import user as _user_model  # noqa: F401
from app.services.token_service import create_access_token

REGISTER_A = {
    "full_name": "User A",
    "email": "user.a@example.com",
    "password": "password123",
}

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


def _auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


class AuthOpenApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def test_openapi_lists_auth_routes(self) -> None:
        spec = self.client.get("/openapi.json").json()
        paths = spec["paths"]
        self.assertIn("/api/v1/auth/register", paths)
        self.assertIn("/api/v1/auth/login", paths)
        self.assertIn("/api/v1/auth/me", paths)
        self.assertIn("/api/v1/auth/google", paths)
        self.assertIn("/api/v1/auth/change-password", paths)
        self.assertIn("/api/v1/wallets/me", paths)
        self.assertIn("patch", paths["/api/v1/auth/me"])
        self.assertIn("delete", paths["/api/v1/auth/me"])

    def test_unauthenticated_wallet_create_returns_401(self) -> None:
        response = self.client.post("/api/v1/wallets", json=WALLET_PROFILE)
        self.assertEqual(response.status_code, 401)

    def test_auth_me_without_token_returns_401(self) -> None:
        response = self.client.get("/api/v1/auth/me")
        self.assertEqual(response.status_code, 401)

    def test_account_mutations_require_auth(self) -> None:
        self.assertEqual(
            self.client.patch("/api/v1/auth/me", json={"full_name": "New Name"}).status_code,
            401,
        )
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/change-password",
                json={"current_password": "password123", "new_password": "newpassword123"},
            ).status_code,
            401,
        )
        self.assertEqual(self.client.delete("/api/v1/auth/me").status_code, 401)

    def test_auth_me_with_invalid_token_returns_401(self) -> None:
        response = self.client.get("/api/v1/auth/me", headers=_auth_header("not-a-jwt"))
        self.assertEqual(response.status_code, 401)

    def test_invalid_email_returns_422(self) -> None:
        response = self.client.post(
            "/api/v1/auth/register",
            json={**REGISTER_A, "email": "not-an-email"},
        )
        self.assertEqual(response.status_code, 422)

    def test_short_password_returns_422(self) -> None:
        response = self.client.post(
            "/api/v1/auth/register",
            json={**REGISTER_A, "password": "short"},
        )
        self.assertEqual(response.status_code, 422)

    def test_google_auth_missing_credential_returns_422(self) -> None:
        response = self.client.post("/api/v1/auth/google", json={})
        self.assertEqual(response.status_code, 422)

    def test_health_predict_recommend_schemes_still_public(self) -> None:
        self.assertEqual(self.client.get("/health").status_code, 200)
        self.assertEqual(
            self.client.post("/api/v1/predict", json={**WALLET_PROFILE, "scheme_id": "TN-SW-001"}).status_code,
            200,
        )
        self.assertEqual(self.client.post("/api/v1/recommend", json=WALLET_PROFILE).status_code, 200)
        self.assertEqual(self.client.get("/api/v1/schemes").status_code, 200)


@unittest.skipUnless(_postgres_ready(), "PostgreSQL test database is not configured or unavailable")
class AuthDatabaseTests(unittest.TestCase):
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

    def _register(self, **overrides) -> dict:
        payload = {**REGISTER_A, **overrides}
        response = self.client.post("/api/v1/auth/register", json=payload)
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def _login(self, email: str = REGISTER_A["email"], password: str = REGISTER_A["password"]) -> dict:
        response = self.client.post("/api/v1/auth/login", json={"email": email, "password": password})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_register_success(self) -> None:
        body = self._register()
        self.assertEqual(body["email"], "user.a@example.com")
        self.assertEqual(body["full_name"], "User A")
        self.assertTrue(body["user_id"])
        self.assertNotIn("password", body)
        self.assertNotIn("password_hash", body)

    def test_duplicate_email(self) -> None:
        self._register()
        response = self.client.post(
            "/api/v1/auth/register",
            json={**REGISTER_A, "email": "User.A@example.com"},
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["detail"], "Email already registered")

    def test_login_success(self) -> None:
        registered = self._register()
        body = self._login()
        self.assertTrue(body["access_token"])
        self.assertEqual(body["token_type"], "bearer")
        self.assertEqual(body["expires_in"], 3600)
        self.assertEqual(body["user"]["user_id"], registered["user_id"])
        self.assertNotIn("password", body)
        self.assertNotIn("password_hash", body["user"])

    def test_wrong_password(self) -> None:
        self._register()
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": REGISTER_A["email"], "password": "wrongpass"},
        )
        self.assertEqual(response.status_code, 401)

    def test_unknown_email(self) -> None:
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": "missing@example.com", "password": "password123"},
        )
        self.assertEqual(response.status_code, 401)

    def test_auth_me_with_valid_token(self) -> None:
        registered = self._register()
        token = self._login()["access_token"]
        response = self.client.get("/api/v1/auth/me", headers=_auth_header(token))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user_id"], registered["user_id"])
        self.assertNotIn("password_hash", response.json())

    def test_auth_me_with_expired_token(self) -> None:
        registered = self._register()
        token = create_access_token(registered["user_id"], expires_delta=timedelta(seconds=-30))
        response = self.client.get("/api/v1/auth/me", headers=_auth_header(token))
        self.assertEqual(response.status_code, 401)

    def test_authenticated_wallet_crud_and_recommend(self) -> None:
        self._register()
        headers = _auth_header(self._login()["access_token"])
        created = self.client.post("/api/v1/wallets", json=WALLET_PROFILE, headers=headers)
        self.assertEqual(created.status_code, 201)
        citizen_id = created.json()["citizen_id"]
        self.assertNotIn("password_hash", created.json())

        mine = self.client.get("/api/v1/wallets/me", headers=headers)
        self.assertEqual(mine.status_code, 200)
        self.assertEqual(mine.json()["citizen_id"], citizen_id)

        fetched = self.client.get(f"/api/v1/wallets/{citizen_id}", headers=headers)
        self.assertEqual(fetched.status_code, 200)

        updated = self.client.put(
            f"/api/v1/wallets/{citizen_id}",
            json={**WALLET_PROFILE, "age": 21},
            headers=headers,
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["age"], 21)

        recommended = self.client.post(f"/api/v1/wallets/{citizen_id}/recommend", headers=headers)
        self.assertEqual(recommended.status_code, 200)
        self.assertEqual(recommended.json()["total_schemes_evaluated"], 6)

        deleted = self.client.delete(f"/api/v1/wallets/{citizen_id}", headers=headers)
        self.assertEqual(deleted.status_code, 204)
        self.assertEqual(self.client.get("/api/v1/wallets/me", headers=headers).status_code, 404)

    def test_user_cannot_access_another_users_wallet(self) -> None:
        self._register()
        headers_a = _auth_header(self._login()["access_token"])
        citizen_id = self.client.post("/api/v1/wallets", json=WALLET_PROFILE, headers=headers_a).json()[
            "citizen_id"
        ]

        self.client.post(
            "/api/v1/auth/register",
            json={"full_name": "User B", "email": "user.b@example.com", "password": "password123"},
        )
        headers_b = _auth_header(
            self.client.post(
                "/api/v1/auth/login",
                json={"email": "user.b@example.com", "password": "password123"},
            ).json()["access_token"]
        )

        self.assertEqual(self.client.get(f"/api/v1/wallets/{citizen_id}", headers=headers_b).status_code, 404)
        self.assertEqual(
            self.client.put(
                f"/api/v1/wallets/{citizen_id}",
                json=WALLET_PROFILE,
                headers=headers_b,
            ).status_code,
            404,
        )
        self.assertEqual(self.client.delete(f"/api/v1/wallets/{citizen_id}", headers=headers_b).status_code, 404)
        self.assertEqual(
            self.client.post(f"/api/v1/wallets/{citizen_id}/recommend", headers=headers_b).status_code,
            404,
        )
        self.assertEqual(self.client.get(f"/api/v1/wallets/{citizen_id}", headers=headers_a).status_code, 200)

    def test_authenticated_invalid_wallet_returns_422(self) -> None:
        self._register()
        headers = _auth_header(self._login()["access_token"])
        response = self.client.post("/api/v1/wallets", json={**WALLET_PROFILE, "age": 150}, headers=headers)
        self.assertEqual(response.status_code, 422)

    def test_google_login_creates_user_and_returns_existing_jwt_shape(self) -> None:
        from unittest.mock import patch

        from app.services.google_token_service import GoogleIdentity

        identity = GoogleIdentity(
            google_sub="google-sub-new-user",
            email="google.new@example.com",
            full_name="Google User",
        )
        with patch(
            "app.routes.auth.verify_google_credential",
            return_value=identity,
        ):
            response = self.client.post(
                "/api/v1/auth/google",
                json={"credential": "google-id-token"},
            )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertTrue(body["access_token"])
        self.assertEqual(body["token_type"], "bearer")
        self.assertEqual(body["user"]["email"], "google.new@example.com")
        self.assertEqual(body["user"]["full_name"], "Google User")
        self.assertNotIn("password_hash", body)
        self.assertNotIn("password_hash", body["user"])
        self.assertNotIn("google_sub", body["user"])
        self.assertNotIn("credential", body)

        me = self.client.get("/api/v1/auth/me", headers=_auth_header(body["access_token"]))
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["user_id"], body["user"]["user_id"])

        password_login = self.client.post(
            "/api/v1/auth/login",
            json={"email": "google.new@example.com", "password": "password123"},
        )
        self.assertEqual(password_login.status_code, 401)

    def test_google_login_links_existing_password_user(self) -> None:
        from unittest.mock import patch

        from app.services.google_token_service import GoogleIdentity

        registered = self._register()
        identity = GoogleIdentity(
            google_sub="google-sub-existing",
            email=REGISTER_A["email"],
            full_name="Ignored Name",
        )
        with patch(
            "app.routes.auth.verify_google_credential",
            return_value=identity,
        ):
            response = self.client.post(
                "/api/v1/auth/google",
                json={"credential": "google-id-token"},
            )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["user"]["user_id"], registered["user_id"])
        password_login = self._login()
        self.assertEqual(password_login["user"]["user_id"], registered["user_id"])

        with patch(
            "app.routes.auth.verify_google_credential",
            return_value=identity,
        ):
            again = self.client.post(
                "/api/v1/auth/google",
                json={"credential": "google-id-token"},
            )
        self.assertEqual(again.status_code, 200, again.text)
        self.assertEqual(again.json()["user"]["user_id"], registered["user_id"])

    def test_patch_me_updates_name_only(self) -> None:
        registered = self._register()
        headers = _auth_header(self._login()["access_token"])
        response = self.client.patch("/api/v1/auth/me", json={"full_name": "Updated Name"}, headers=headers)
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["full_name"], "Updated Name")
        self.assertEqual(body["email"], registered["email"])
        self.assertEqual(body["user_id"], registered["user_id"])
        self.assertTrue(body["has_password"])
        self.assertFalse(body["has_google"])
        self.assertNotIn("password_hash", body)
        self.assertNotIn("google_sub", body)
        me = self.client.get("/api/v1/auth/me", headers=headers)
        self.assertEqual(me.json()["full_name"], "Updated Name")

    def test_change_password_rejects_wrong_current_password(self) -> None:
        self._register()
        headers = _auth_header(self._login()["access_token"])
        response = self.client.post(
            "/api/v1/auth/change-password",
            json={"current_password": "wrongpass", "new_password": "newpassword123"},
            headers=headers,
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Current password is incorrect.")
        self.assertEqual(self._login()["user"]["email"], REGISTER_A["email"])

    def test_change_password_then_login_with_new_password(self) -> None:
        self._register()
        headers = _auth_header(self._login()["access_token"])
        response = self.client.post(
            "/api/v1/auth/change-password",
            json={"current_password": "password123", "new_password": "newpassword123"},
            headers=headers,
        )
        self.assertEqual(response.status_code, 204, response.text)
        old_login = self.client.post(
            "/api/v1/auth/login",
            json={"email": REGISTER_A["email"], "password": "password123"},
        )
        self.assertEqual(old_login.status_code, 401)
        new_login = self._login(password="newpassword123")
        self.assertTrue(new_login["access_token"])

    def test_delete_account_removes_wallet_and_history_access(self) -> None:
        self._register()
        headers = _auth_header(self._login()["access_token"])
        wallet = self.client.post("/api/v1/wallets", json=WALLET_PROFILE, headers=headers)
        self.assertEqual(wallet.status_code, 201, wallet.text)
        citizen_id = wallet.json()["citizen_id"]
        self.client.post(f"/api/v1/wallets/{citizen_id}/recommend", headers=headers)
        deleted = self.client.delete("/api/v1/auth/me", headers=headers)
        self.assertEqual(deleted.status_code, 204, deleted.text)
        self.assertEqual(self.client.get("/api/v1/auth/me", headers=headers).status_code, 401)
        self.assertEqual(self.client.get("/api/v1/wallets/me", headers=headers).status_code, 401)
        other = self._register(email="other.user@example.com", full_name="Other User")
        other_headers = _auth_header(self._login(email=other["email"])["access_token"])
        self.assertEqual(self.client.get(f"/api/v1/wallets/{citizen_id}", headers=other_headers).status_code, 404)


if __name__ == "__main__":
    unittest.main()
