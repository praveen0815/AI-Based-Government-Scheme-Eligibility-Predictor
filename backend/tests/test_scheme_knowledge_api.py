"""Scheme knowledge retrieval tests. Does not change eligibility or OCR scanning."""

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

ADMIN_EMAIL = "knowledge.admin@example.com"
USER_EMAIL = "knowledge.citizen@example.com"


def _postgres_ready() -> bool:
    load_database_env()
    test_url = (os.environ.get("TEST_DATABASE_URL") or "").strip()
    if not test_url:
        return False
    os.environ["SCHEME_PREDICTOR_USE_TEST_DB"] = "1"
    reset_engine()
    return check_database()


class SchemeKnowledgeContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        from fastapi.testclient import TestClient

        from app.main import app

        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def test_retrieves_existing_scheme_with_source_and_unverified_defaults(self) -> None:
        response = self.client.get("/api/v1/scheme-knowledge/TN-SW-001")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["scheme_id"], "TN-SW-001")
        self.assertIn("Pudhumai Penn", body["scheme_name"])
        self.assertTrue(body["official_source_url"].startswith("https://www.tnsocialwelfare.tn.gov.in"))
        self.assertEqual(body["catalog_rule_status"], "PARTIALLY_VERIFIED")
        self.assertIn("does not predict eligibility", body["disclaimer"].lower())
        fields = {item["field_key"]: item for item in body["items"]}
        self.assertEqual(
            set(fields),
            {
                "scheme_name",
                "department",
                "description",
                "eligibility_notes",
                "required_documents",
                "benefit_description",
                "application_method",
                "official_source_url",
            },
        )
        self.assertEqual(fields["required_documents"]["value"], "NEEDS VERIFICATION")
        self.assertEqual(fields["required_documents"]["content_state"], "unverified_placeholder")
        self.assertEqual(fields["required_documents"]["verification_status"], "unverified")
        self.assertIsNone(fields["required_documents"]["last_verified_at"])
        self.assertEqual(fields["required_documents"]["source_url"], body["official_source_url"])
        self.assertEqual(fields["required_documents"]["catalog_access_date"], "2026-08-14")
        self.assertEqual(fields["benefit_description"]["content_state"], "present")
        self.assertEqual(fields["benefit_description"]["verification_status"], "unverified")
        self.assertTrue(all(item["verification_status"] != "verified" for item in body["items"]))

    def test_search_and_filters_use_catalog_values(self) -> None:
        listed = self.client.get("/api/v1/scheme-knowledge")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.json()["total_catalog_count"], 13)
        self.assertEqual(listed.json()["scheme_count"], 13)

        by_id = self.client.get("/api/v1/scheme-knowledge", params={"scheme_id": "TN-REV-001"})
        self.assertEqual(by_id.json()["scheme_count"], 1)
        self.assertEqual(by_id.json()["schemes"][0]["scheme_id"], "TN-REV-001")

        by_name = self.client.get("/api/v1/scheme-knowledge", params={"q": "Pudhumai Penn"})
        self.assertEqual(by_name.json()["scheme_count"], 1)
        self.assertEqual(by_name.json()["schemes"][0]["scheme_id"], "TN-SW-001")

        by_department = self.client.get(
            "/api/v1/scheme-knowledge",
            params={"department": "Revenue and Disaster Management Department"},
        )
        self.assertGreaterEqual(by_department.json()["scheme_count"], 1)
        self.assertTrue(
            all(
                item["department"] == "Revenue and Disaster Management Department"
                for item in by_department.json()["schemes"]
            )
        )

    def test_unknown_scheme_returns_404(self) -> None:
        response = self.client.get("/api/v1/scheme-knowledge/TN-NOT-REAL")
        self.assertEqual(response.status_code, 404)

    def test_existing_catalog_schemes_and_scanner_routes_are_unchanged(self) -> None:
        catalog = self.client.get("/api/v1/catalog")
        self.assertEqual(catalog.status_code, 200)
        self.assertEqual(catalog.json()["scheme_count"], 13)
        schemes = self.client.get("/api/v1/schemes")
        self.assertEqual(schemes.status_code, 200)
        self.assertEqual(schemes.json()["scheme_count"], 6)
        self.assertTrue(all(item["ml_scope"] == "CORE" for item in schemes.json()["schemes"]))
        self.assertEqual(self.client.get("/api/v1/document-scans/types").status_code, 401)

    def test_admin_write_requires_authentication(self) -> None:
        self.assertEqual(self.client.get("/api/v1/admin/scheme-knowledge").status_code, 401)
        self.assertEqual(
            self.client.patch(
                "/api/v1/admin/scheme-knowledge/TN-SW-001/items/required_documents",
                json={"verification_status": "verified"},
            ).status_code,
            401,
        )

    def test_openapi_lists_knowledge_routes(self) -> None:
        paths = self.client.get("/openapi.json").json()["paths"]
        self.assertIn("/api/v1/scheme-knowledge", paths)
        self.assertIn("/api/v1/scheme-knowledge/{scheme_id}", paths)
        self.assertIn("/api/v1/admin/scheme-knowledge", paths)
        self.assertIn("/api/v1/admin/scheme-knowledge/{scheme_id}/items/{field_key}", paths)
        self.assertIn("/api/v1/document-scans", paths)
        self.assertIn("/api/v1/catalog", paths)


class SchemeKnowledgeDatabaseTests(unittest.TestCase):
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
            connection.execute(text("DELETE FROM scheme_knowledge_items"))
            connection.execute(text("DELETE FROM supporting_uploads"))
            connection.execute(text("DELETE FROM recommendation_history"))
            connection.execute(text("DELETE FROM citizen_profiles"))
            connection.execute(text("DELETE FROM users"))

    def _headers(self, email: str, name: str) -> dict[str, str]:
        self.client.post(
            "/api/v1/auth/register",
            json={"full_name": name, "email": email, "password": "password123"},
        )
        token = self.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "password123"},
        ).json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_citizen_cannot_edit_and_admin_can_verify_without_changing_eligibility(self) -> None:
        citizen = self._headers(USER_EMAIL, "Citizen User")
        admin = self._headers(ADMIN_EMAIL, "Knowledge Admin")
        forbidden = self.client.patch(
            "/api/v1/admin/scheme-knowledge/TN-SW-001/items/required_documents",
            json={"verification_status": "verified", "last_verified_at": "2026-09-28"},
            headers=citizen,
        )
        self.assertEqual(forbidden.status_code, 403)

        citizen_id = self.client.post("/api/v1/wallets", json=WALLET_PROFILE, headers=citizen).json()["citizen_id"]
        before = self.client.post(f"/api/v1/wallets/{citizen_id}/recommend", headers=citizen)
        self.assertEqual(before.status_code, 200)
        before_ids = [item["scheme_id"] for item in before.json()["recommendations"]]

        updated = self.client.patch(
            "/api/v1/admin/scheme-knowledge/TN-SW-001/items/required_documents",
            json={
                "verification_status": "verified",
                "source_url": "https://www.tnsocialwelfare.tn.gov.in/en/specilisationswoman-welfare/pudhumai-penn",
                "last_verified_at": "2026-09-28",
            },
            headers=admin,
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        fields = {item["field_key"]: item for item in updated.json()["items"]}
        self.assertEqual(fields["required_documents"]["verification_status"], "verified")
        self.assertEqual(fields["required_documents"]["last_verified_at"], "2026-09-28")
        self.assertEqual(fields["required_documents"]["value"], "NEEDS VERIFICATION")
        self.assertEqual(fields["benefit_description"]["verification_status"], "unverified")

        public = self.client.get("/api/v1/scheme-knowledge/TN-SW-001").json()
        public_fields = {item["field_key"]: item for item in public["items"]}
        self.assertEqual(public_fields["required_documents"]["verification_status"], "verified")

        after = self.client.post(f"/api/v1/wallets/{citizen_id}/recommend", headers=citizen)
        self.assertEqual(after.status_code, 200)
        self.assertEqual([item["scheme_id"] for item in after.json()["recommendations"]], before_ids)
        self.assertEqual(after.json()["recommendations"][0]["required_documents"], "NEEDS VERIFICATION")
