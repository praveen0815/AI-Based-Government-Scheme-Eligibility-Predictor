"""Administrator API tests. Does not change Hybrid Rule + ML scoring."""

from __future__ import annotations

import os
import tempfile
import unittest

from sqlalchemy import text

from app.db.base import Base
from app.db.init_db import ensure_application_schema
from app.db.session import check_database, get_engine, load_database_env, reset_engine

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

MIN_PDF = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n"
ADMIN_EMAIL = "phase44.admin@example.com"
USER_EMAIL = "phase44.user@example.com"
SECRET_KEYS = {"password", "password_hash", "access_token", "jwt", "google_sub", "google_id", "aadhaar"}


def _postgres_ready() -> bool:
    load_database_env()
    test_url = (os.environ.get("TEST_DATABASE_URL") or "").strip()
    if not test_url:
        return False
    os.environ["SCHEME_PREDICTOR_USE_TEST_DB"] = "1"
    reset_engine()
    return check_database()


def _assert_no_secrets(payload: object) -> None:
    if isinstance(payload, dict):
        for key, value in payload.items():
            if key in SECRET_KEYS:
                raise AssertionError(f"sensitive key leaked: {key}")
            _assert_no_secrets(value)
    elif isinstance(payload, list):
        for item in payload:
            _assert_no_secrets(item)


class VoiceAuditServiceTests(unittest.TestCase):
    def test_hash_is_sha256_of_stripped_lowercase_transcript(self) -> None:
        import hashlib

        from app.services.voice_audit_service import hash_transcript, resolve_transcript_hash

        expected = hashlib.sha256("show kamal nath's documents".encode("utf-8")).hexdigest()
        self.assertEqual(hash_transcript("  Show Kamal Nath's documents  "), expected)
        known_hash = "a" * 64
        self.assertEqual(
            resolve_transcript_hash(transcript_hash=known_hash, transcript="ignored raw speech"),
            known_hash,
        )
        self.assertEqual(resolve_transcript_hash(transcript_hash=None, transcript="Hello"), hash_transcript("Hello"))
        with self.assertRaises(ValueError):
            resolve_transcript_hash(transcript_hash=None, transcript=None)


class AdminContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        from fastapi.testclient import TestClient

        from app.main import app

        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def test_unauthenticated_admin_routes_return_401(self) -> None:
        self.assertEqual(self.client.get("/api/v1/admin/overview").status_code, 401)
        self.assertEqual(self.client.get("/api/v1/admin/users").status_code, 401)
        self.assertEqual(self.client.get("/api/v1/admin/documents").status_code, 401)
        self.assertEqual(self.client.get("/api/v1/admin/eligibility").status_code, 401)
        self.assertEqual(
            self.client.post(
                "/api/v1/admin/audit/voice",
                json={"intent": "ADMIN_LOOKUP_USER", "outcome": "ok", "transcript": "find user"},
            ).status_code,
            401,
        )
        self.assertEqual(
            self.client.patch(
                "/api/v1/admin/documents/not-a-real-id",
                json={"review_status": "verified"},
            ).status_code,
            401,
        )

    def test_openapi_lists_admin_routes(self) -> None:
        paths = self.client.get("/openapi.json").json()["paths"]
        self.assertIn("/api/v1/admin/overview", paths)
        self.assertIn("/api/v1/admin/users", paths)
        self.assertIn("/api/v1/admin/users/{user_id}", paths)
        self.assertIn("/api/v1/admin/documents", paths)
        self.assertIn("/api/v1/admin/documents/{upload_id}", paths)
        self.assertIn("/api/v1/admin/eligibility", paths)
        self.assertIn("/api/v1/admin/audit/voice", paths)


class AdminDatabaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        if not _postgres_ready():
            raise unittest.SkipTest("PostgreSQL test database is not configured or unavailable")
        from fastapi.testclient import TestClient

        from app.main import app

        os.environ["ADMIN_EMAILS"] = ADMIN_EMAIL
        cls._tempdir = tempfile.TemporaryDirectory()
        os.environ["SUPPORTING_UPLOAD_DIR"] = cls._tempdir.name
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
        cls._tempdir.cleanup()
        os.environ.pop("ADMIN_EMAILS", None)
        reset_engine()

    def setUp(self) -> None:
        os.environ["ADMIN_EMAILS"] = ADMIN_EMAIL
        with self.engine.begin() as connection:
            connection.execute(text("DELETE FROM admin_voice_audit"))
            connection.execute(text("DELETE FROM supporting_uploads"))
            connection.execute(text("DELETE FROM application_tracking"))
            connection.execute(text("DELETE FROM application_readiness"))
            connection.execute(text("DELETE FROM document_checklist_progress"))
            connection.execute(text("DELETE FROM recommendation_history"))
            connection.execute(text("DELETE FROM citizen_profiles"))
            connection.execute(text("DELETE FROM users"))

    def _register(self, email: str, name: str) -> dict[str, str]:
        self.client.post(
            "/api/v1/auth/register",
            json={"full_name": name, "email": email, "password": "password123"},
        )
        token = self.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "password123"},
        ).json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_non_admin_cannot_access_admin_apis(self) -> None:
        headers = self._register(USER_EMAIL, "Citizen User")
        overview = self.client.get("/api/v1/admin/overview", headers=headers)
        self.assertEqual(overview.status_code, 403)
        users = self.client.get("/api/v1/admin/users", headers=headers)
        self.assertEqual(users.status_code, 403)
        audit = self.client.post(
            "/api/v1/admin/audit/voice",
            json={"intent": "ADMIN_USER_DOCUMENTS", "outcome": "ok", "transcript": "show kamal nath"},
            headers=headers,
        )
        self.assertEqual(audit.status_code, 403)

    def test_admin_can_list_users_and_see_eligibility_without_secrets(self) -> None:
        user_headers = self._register(USER_EMAIL, "Citizen User")
        admin_headers = self._register(ADMIN_EMAIL, "Portal Admin")
        created = self.client.post("/api/v1/wallets", json=WALLET_PROFILE, headers=user_headers)
        self.assertEqual(created.status_code, 201)
        me = self.client.get("/api/v1/auth/me", headers=user_headers).json()
        listed = self.client.get("/api/v1/admin/users?q=citizen", headers=admin_headers)
        self.assertEqual(listed.status_code, 200)
        body = listed.json()
        self.assertGreaterEqual(body["count"], 1)
        self.assertTrue(any(item["email"] == USER_EMAIL for item in body["users"]))
        _assert_no_secrets(body)

        detail = self.client.get(f"/api/v1/admin/users/{me['user_id']}", headers=admin_headers)
        self.assertEqual(detail.status_code, 200)
        payload = detail.json()
        self.assertEqual(payload["user"]["email"], USER_EMAIL)
        self.assertTrue(payload["wallet"])
        self.assertIn(payload["eligibility"]["prediction_label"], {"eligible", "not_eligible"})
        self.assertTrue(payload["eligibility"]["evaluated_schemes"])
        _assert_no_secrets(payload)

        eligibility = self.client.get("/api/v1/admin/eligibility", headers=admin_headers)
        self.assertEqual(eligibility.status_code, 200)
        self.assertTrue(any(row["email"] == USER_EMAIL for row in eligibility.json()["users"]))
        _assert_no_secrets(eligibility.json())

    def test_admin_can_review_documents_without_changing_eligibility(self) -> None:
        user_headers = self._register(USER_EMAIL, "Citizen User")
        admin_headers = self._register(ADMIN_EMAIL, "Portal Admin")
        self.client.post("/api/v1/wallets", json=WALLET_PROFILE, headers=user_headers)
        uploaded = self.client.post(
            "/api/v1/uploads",
            data={"category": "education_certificate"},
            files={"file": ("school-certificate.pdf", MIN_PDF, "application/pdf")},
            headers=user_headers,
        )
        self.assertEqual(uploaded.status_code, 201)
        upload_id = uploaded.json()["id"]
        self.assertEqual(uploaded.json().get("review_status", "pending"), "pending")

        listed = self.client.get("/api/v1/admin/documents", headers=admin_headers)
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.json()["count"], 1)
        self.assertEqual(listed.json()["documents"][0]["review_status"], "pending")
        _assert_no_secrets(listed.json())

        before = self.client.get("/api/v1/admin/eligibility", headers=admin_headers).json()
        updated = self.client.patch(
            f"/api/v1/admin/documents/{upload_id}",
            json={"review_status": "verified"},
            headers=admin_headers,
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["review_status"], "verified")
        after = self.client.get("/api/v1/admin/eligibility", headers=admin_headers).json()
        self.assertEqual(
            [row["prediction_label"] for row in before["users"] if row["email"] == USER_EMAIL],
            [row["prediction_label"] for row in after["users"] if row["email"] == USER_EMAIL],
        )

        overview = self.client.get("/api/v1/admin/overview", headers=admin_headers)
        self.assertEqual(overview.status_code, 200)
        stats = overview.json()
        self.assertGreaterEqual(stats["total_users"], 2)
        self.assertEqual(stats["verified_documents"], 1)
        self.assertEqual(stats["pending_document_reviews"], 0)
        _assert_no_secrets(stats)

    def test_user_without_wallet_is_not_evaluated(self) -> None:
        user_headers = self._register(USER_EMAIL, "Citizen User")
        admin_headers = self._register(ADMIN_EMAIL, "Portal Admin")
        me = self.client.get("/api/v1/auth/me", headers=user_headers).json()
        detail = self.client.get(f"/api/v1/admin/users/{me['user_id']}", headers=admin_headers).json()
        self.assertEqual(detail["eligibility"]["prediction_label"], "not_evaluated")
        self.assertFalse(detail["wallet"])
        self.assertFalse(detail["eligibility"]["evaluated_schemes"])

    def test_admin_voice_audit_stores_hash_not_transcript(self) -> None:
        from app.services.voice_audit_service import hash_transcript

        user_headers = self._register(USER_EMAIL, "Citizen User")
        admin_headers = self._register(ADMIN_EMAIL, "Portal Admin")
        me = self.client.get("/api/v1/auth/me", headers=user_headers).json()
        spoken = "Show Kamal Nath's documents"
        created = self.client.post(
            "/api/v1/admin/audit/voice",
            json={
                "intent": "ADMIN_USER_DOCUMENTS",
                "outcome": "ok",
                "target_user_id": me["user_id"],
                "transcript": spoken,
            },
            headers=admin_headers,
        )
        self.assertEqual(created.status_code, 200)
        body = created.json()
        self.assertEqual(body["intent"], "ADMIN_USER_DOCUMENTS")
        self.assertEqual(body["outcome"], "ok")
        self.assertEqual(body["target_user_id"], me["user_id"])
        self.assertEqual(body["transcript_hash"], hash_transcript(spoken))
        self.assertNotIn("transcript", body)
        self.assertNotIn(spoken.lower(), str(body).lower())
        _assert_no_secrets(body)
        with self.engine.connect() as connection:
            stored = connection.execute(text("SELECT transcript_hash FROM admin_voice_audit")).scalar()
            raw_count = connection.execute(
                text("SELECT COUNT(*) FROM admin_voice_audit WHERE transcript_hash = :spoken"),
                {"spoken": spoken},
            ).scalar()
        self.assertEqual(stored, hash_transcript(spoken))
        self.assertEqual(raw_count, 0)


if __name__ == "__main__":
    unittest.main()
