"""Document preparation checklist API tests. Does not score eligibility."""

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
from app.schemas.documents import OFFICIAL_SOURCE_ITEM_KEY
from app.services.document_checklist_service import catalog_document_labels

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


class DocumentCatalogParsingTests(unittest.TestCase):
    def test_unverified_catalog_text_is_not_invented_into_items(self) -> None:
        self.assertEqual(catalog_document_labels(None), [])
        self.assertEqual(catalog_document_labels(""), [])
        self.assertEqual(catalog_document_labels("NEEDS VERIFICATION"), [])
        self.assertEqual(catalog_document_labels("Needs verification"), [])

    def test_catalog_lists_are_split_without_adding_extra_documents(self) -> None:
        self.assertEqual(
            catalog_document_labels("Income certificate; Address proof"),
            ["Income certificate", "Address proof"],
        )
        self.assertEqual(
            catalog_document_labels("Identity proof\nBank account details"),
            ["Identity proof", "Bank account details"],
        )


class DocumentContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        from fastapi.testclient import TestClient

        from app.main import app

        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def test_unauthenticated_document_list_returns_401(self) -> None:
        response = self.client.get("/api/v1/documents")
        self.assertEqual(response.status_code, 401)

    def test_unauthenticated_scheme_checklist_returns_401(self) -> None:
        response = self.client.get("/api/v1/documents/schemes/TN-SW-001")
        self.assertEqual(response.status_code, 401)

    def test_unauthenticated_status_update_returns_401(self) -> None:
        response = self.client.patch(
            "/api/v1/documents/schemes/TN-SW-001/items/official-source-review",
            json={"status": "ready"},
        )
        self.assertEqual(response.status_code, 401)

    def test_openapi_lists_document_routes(self) -> None:
        paths = self.client.get("/openapi.json").json()["paths"]
        self.assertIn("/api/v1/documents", paths)
        self.assertIn("/api/v1/documents/schemes/{scheme_id}", paths)
        self.assertIn("/api/v1/documents/schemes/{scheme_id}/items/{item_key}", paths)
        self.assertIn("get", paths["/api/v1/documents"])
        self.assertIn("get", paths["/api/v1/documents/schemes/{scheme_id}"])
        self.assertIn("patch", paths["/api/v1/documents/schemes/{scheme_id}/items/{item_key}"])


class DocumentDatabaseTests(unittest.TestCase):
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

    def _headers(self, email: str, name: str = "Document Owner") -> dict[str, str]:
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
        headers = self._headers("no.history@example.com")
        listed = self.client.get("/api/v1/documents", headers=headers)
        self.assertEqual(listed.status_code, 200)
        body = listed.json()
        self.assertEqual(body["schemes"], [])
        self.assertEqual(body["schemes_with_progress"], 0)
        self.assertEqual(body["overall_progress_percent"], 0)
        self.assertIn("not government approval", body["disclaimer"].lower())

        missing = self.client.get("/api/v1/documents/schemes/TN-SW-001", headers=headers)
        self.assertEqual(missing.status_code, 404)
        self.assertEqual(missing.json(), {"detail": "No document checklist was found for that scheme."})

    def test_checklist_is_history_gated_and_progress_is_owner_only(self) -> None:
        owner = self._headers("docs.owner@example.com", "Owner")
        other = self._headers("docs.other@example.com", "Other")
        recommended = self._recommend(owner)
        self.assertIn("TN-SW-001", recommended)

        listed = self.client.get("/api/v1/documents", headers=owner)
        self.assertEqual(listed.status_code, 200)
        scheme_ids = [row["scheme_id"] for row in listed.json()["schemes"]]
        self.assertEqual(scheme_ids, recommended)
        self.assertEqual(listed.json()["schemes_with_progress"], 0)
        self.assertTrue(listed.json()["schemes"][0]["documents_need_verification"])

        with self.engine.connect() as connection:
            count = connection.execute(text("SELECT COUNT(*) FROM document_checklist_progress")).scalar()
        self.assertEqual(count, 0)

        checklist = self.client.get("/api/v1/documents/schemes/TN-SW-001", headers=owner)
        self.assertEqual(checklist.status_code, 200)
        payload = checklist.json()
        self.assertEqual(payload["scheme_id"], "TN-SW-001")
        self.assertTrue(payload["documents_need_verification"])
        self.assertEqual(payload["item_count"], 1)
        self.assertEqual(payload["ready_count"], 0)
        self.assertEqual(payload["progress_percent"], 0)
        self.assertEqual(payload["has_saved_progress"], False)
        self.assertEqual(payload["items"][0]["item_key"], OFFICIAL_SOURCE_ITEM_KEY)
        self.assertEqual(payload["items"][0]["source"], "project_reminder")
        self.assertEqual(payload["items"][0]["status"], "not_started")
        self.assertNotIn("aadhaar", str(payload).lower())
        self.assertNotIn("approved", payload["disclaimer"].lower())

        foreign = self.client.get("/api/v1/documents/schemes/TN-SW-001", headers=other)
        self.assertEqual(foreign.status_code, 404)
        self.assertEqual(foreign.json(), {"detail": "No document checklist was found for that scheme."})

        unknown_scheme = self.client.get("/api/v1/documents/schemes/TN-ADV-999", headers=owner)
        self.assertEqual(unknown_scheme.status_code, 404)

    def test_status_update_stores_progress_and_calculates_percentage(self) -> None:
        owner = self._headers("docs.ready@example.com")
        other = self._headers("docs.ready.other@example.com")
        self._recommend(owner)

        updated = self.client.patch(
            f"/api/v1/documents/schemes/TN-SW-001/items/{OFFICIAL_SOURCE_ITEM_KEY}",
            json={"status": "ready"},
            headers=owner,
        )
        self.assertEqual(updated.status_code, 200)
        body = updated.json()
        self.assertEqual(body["items"][0]["status"], "ready")
        self.assertEqual(body["ready_count"], 1)
        self.assertEqual(body["item_count"], 1)
        self.assertEqual(body["progress_percent"], 100)
        self.assertTrue(body["has_saved_progress"])

        listed = self.client.get("/api/v1/documents", headers=owner).json()
        self.assertEqual(listed["schemes_with_progress"], 1)
        self.assertEqual(listed["overall_ready_count"], 1)
        target = next(row for row in listed["schemes"] if row["scheme_id"] == "TN-SW-001")
        self.assertEqual(target["progress_percent"], 100)
        self.assertEqual(
            listed["overall_progress_percent"],
            round(100 * listed["overall_ready_count"] / listed["overall_item_count"]),
        )

        verify = self.client.patch(
            f"/api/v1/documents/schemes/TN-SW-001/items/{OFFICIAL_SOURCE_ITEM_KEY}",
            json={"status": "needs_verification"},
            headers=owner,
        )
        self.assertEqual(verify.status_code, 200)
        self.assertEqual(verify.json()["items"][0]["status"], "needs_verification")
        self.assertEqual(verify.json()["progress_percent"], 0)

        foreign = self.client.patch(
            f"/api/v1/documents/schemes/TN-SW-001/items/{OFFICIAL_SOURCE_ITEM_KEY}",
            json={"status": "ready"},
            headers=other,
        )
        self.assertEqual(foreign.status_code, 404)

        unknown_item = self.client.patch(
            "/api/v1/documents/schemes/TN-SW-001/items/invented-aadhaar-card",
            json={"status": "ready"},
            headers=owner,
        )
        self.assertEqual(unknown_item.status_code, 404)

        invalid_status = self.client.patch(
            f"/api/v1/documents/schemes/TN-SW-001/items/{OFFICIAL_SOURCE_ITEM_KEY}",
            json={"status": "approved"},
            headers=owner,
        )
        self.assertEqual(invalid_status.status_code, 422)

    def test_account_delete_removes_document_progress(self) -> None:
        headers = self._headers("docs.delete@example.com")
        self._recommend(headers)
        self.client.patch(
            f"/api/v1/documents/schemes/TN-SW-001/items/{OFFICIAL_SOURCE_ITEM_KEY}",
            json={"status": "ready"},
            headers=headers,
        )
        deleted = self.client.delete("/api/v1/auth/me", headers=headers)
        self.assertEqual(deleted.status_code, 204)
        with self.engine.connect() as connection:
            count = connection.execute(text("SELECT COUNT(*) FROM document_checklist_progress")).scalar()
        self.assertEqual(count, 0)


if __name__ == "__main__":
    unittest.main()
