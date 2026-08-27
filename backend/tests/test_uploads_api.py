"""Supporting-document upload tests. Does not extract identity numbers."""

from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

from sqlalchemy import text

from app.db.base import Base
from app.db.init_db import ensure_application_schema
from app.db.session import check_database, get_engine, load_database_env, reset_engine
from app.models import citizen as _citizen_model  # noqa: F401
from app.models import documents as _documents_model  # noqa: F401
from app.models import history as _history_model  # noqa: F401
from app.models import readiness as _readiness_model  # noqa: F401
from app.models import uploads as _uploads_model  # noqa: F401
from app.models import user as _user_model  # noqa: F401
from app.services.upload_service import _detect_type, _looks_sensitive

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


def _postgres_ready() -> bool:
    load_database_env()
    test_url = (os.environ.get("TEST_DATABASE_URL") or "").strip()
    if not test_url:
        return False
    os.environ["SCHEME_PREDICTOR_USE_TEST_DB"] = "1"
    reset_engine()
    return check_database()


class UploadValidationTests(unittest.TestCase):
    def test_sensitive_names_are_rejected(self) -> None:
        self.assertTrue(_looks_sensitive("aadhaar-copy.pdf"))
        self.assertTrue(_looks_sensitive("my_PAN_card.jpg"))
        self.assertTrue(_looks_sensitive("passport-scan.png"))
        self.assertFalse(_looks_sensitive("school-certificate.pdf"))

    def test_magic_bytes_accept_pdf_and_reject_unknown(self) -> None:
        content_type, extension = _detect_type(MIN_PDF)
        self.assertEqual(content_type, "application/pdf")
        self.assertEqual(extension, ".pdf")
        with self.assertRaises(Exception):
            _detect_type(b"MZ-not-a-document")


class UploadContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        from fastapi.testclient import TestClient

        from app.main import app

        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def test_unauthenticated_upload_list_returns_401(self) -> None:
        self.assertEqual(self.client.get("/api/v1/uploads").status_code, 401)

    def test_unauthenticated_upload_create_returns_401(self) -> None:
        response = self.client.post(
            "/api/v1/uploads",
            data={"category": "address_proof"},
            files={"file": ("note.pdf", MIN_PDF, "application/pdf")},
        )
        self.assertEqual(response.status_code, 401)

    def test_openapi_lists_upload_routes(self) -> None:
        paths = self.client.get("/openapi.json").json()["paths"]
        self.assertIn("/api/v1/uploads", paths)
        self.assertIn("/api/v1/uploads/{upload_id}", paths)
        self.assertIn("/api/v1/uploads/{upload_id}/file", paths)
        self.assertIn("get", paths["/api/v1/uploads"])
        self.assertIn("post", paths["/api/v1/uploads"])
        self.assertIn("delete", paths["/api/v1/uploads/{upload_id}"])


class UploadDatabaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        if not _postgres_ready():
            raise unittest.SkipTest("PostgreSQL test database is not configured or unavailable")
        from fastapi.testclient import TestClient

        from app.main import app

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
        reset_engine()

    def setUp(self) -> None:
        with self.engine.begin() as connection:
            connection.execute(text("DELETE FROM supporting_uploads"))
            connection.execute(text("DELETE FROM application_readiness"))
            connection.execute(text("DELETE FROM document_checklist_progress"))
            connection.execute(text("DELETE FROM recommendation_history"))
            connection.execute(text("DELETE FROM citizen_profiles"))
            connection.execute(text("DELETE FROM users"))

    def _headers(self, email: str, name: str = "Upload Owner") -> dict[str, str]:
        self.client.post(
            "/api/v1/auth/register",
            json={"full_name": name, "email": email, "password": "password123"},
        )
        token = self.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "password123"},
        ).json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_owner_can_upload_list_download_link_and_delete(self) -> None:
        owner = self._headers("uploads.owner@example.com")
        other = self._headers("uploads.other@example.com")
        citizen_id = self.client.post("/api/v1/wallets", json=WALLET_PROFILE, headers=owner).json()[
            "citizen_id"
        ]
        recommend = self.client.post(f"/api/v1/wallets/{citizen_id}/recommend", headers=owner)
        self.assertEqual(recommend.status_code, 200)

        created = self.client.post(
            "/api/v1/uploads",
            data={"category": "education_certificate", "scheme_id": "TN-SW-001"},
            files={"file": ("school-certificate.pdf", MIN_PDF, "application/pdf")},
            headers=owner,
        )
        self.assertEqual(created.status_code, 201)
        body = created.json()
        self.assertEqual(body["category"], "education_certificate")
        self.assertEqual(body["display_name"], "school-certificate.pdf")
        self.assertNotIn("..", body["stored_filename"])
        self.assertEqual(body["scheme_id"], "TN-SW-001")
        self.assertIn("aadhaar", body["disclaimer"].lower())
        upload_id = body["id"]

        listed = self.client.get("/api/v1/uploads", headers=owner).json()
        self.assertEqual(listed["count"], 1)
        self.assertEqual(listed["uploads"][0]["id"], upload_id)

        foreign_list = self.client.get("/api/v1/uploads", headers=other).json()
        self.assertEqual(foreign_list["count"], 0)

        foreign_get = self.client.get(f"/api/v1/uploads/{upload_id}", headers=other)
        self.assertEqual(foreign_get.status_code, 404)

        download = self.client.get(f"/api/v1/uploads/{upload_id}/file", headers=owner)
        self.assertEqual(download.status_code, 200)
        self.assertTrue(download.content.startswith(b"%PDF"))

        foreign_download = self.client.get(f"/api/v1/uploads/{upload_id}/file", headers=other)
        self.assertEqual(foreign_download.status_code, 404)

        unlinked = self.client.patch(
            f"/api/v1/uploads/{upload_id}",
            json={"scheme_id": None},
            headers=owner,
        )
        self.assertEqual(unlinked.status_code, 200)
        self.assertIsNone(unlinked.json()["scheme_id"])

        deleted = self.client.delete(f"/api/v1/uploads/{upload_id}", headers=owner)
        self.assertEqual(deleted.status_code, 204)
        self.assertEqual(self.client.get(f"/api/v1/uploads/{upload_id}", headers=owner).status_code, 404)

    def test_sensitive_or_invalid_files_are_rejected(self) -> None:
        headers = self._headers("uploads.reject@example.com")
        aadhaar = self.client.post(
            "/api/v1/uploads",
            data={"category": "identity_proof_demo"},
            files={"file": ("aadhaar-card.pdf", MIN_PDF, "application/pdf")},
            headers=headers,
        )
        self.assertEqual(aadhaar.status_code, 422)
        self.assertIn("aadhaar", aadhaar.json()["detail"].lower())

        exe = self.client.post(
            "/api/v1/uploads",
            data={"category": "other_supporting"},
            files={"file": ("notes.pdf", b"MZ-not-allowed", "application/pdf")},
            headers=headers,
        )
        self.assertEqual(exe.status_code, 422)

        unknown_category = self.client.post(
            "/api/v1/uploads",
            data={"category": "aadhaar_card"},
            files={"file": ("notes.pdf", MIN_PDF, "application/pdf")},
            headers=headers,
        )
        self.assertEqual(unknown_category.status_code, 422)

    def test_account_delete_removes_upload_rows_and_files(self) -> None:
        headers = self._headers("uploads.delete@example.com")
        created = self.client.post(
            "/api/v1/uploads",
            data={"category": "address_proof"},
            files={"file": ("address-note.pdf", MIN_PDF, "application/pdf")},
            headers=headers,
        )
        self.assertEqual(created.status_code, 201)
        stored = created.json()["stored_filename"]
        user_dirs = list(Path(os.environ["SUPPORTING_UPLOAD_DIR"]).iterdir())
        self.assertTrue(user_dirs)
        self.assertTrue((user_dirs[0] / stored).is_file())

        deleted = self.client.delete("/api/v1/auth/me", headers=headers)
        self.assertEqual(deleted.status_code, 204)
        with self.engine.connect() as connection:
            count = connection.execute(text("SELECT COUNT(*) FROM supporting_uploads")).scalar()
        self.assertEqual(count, 0)
        remaining = [path for path in Path(os.environ["SUPPORTING_UPLOAD_DIR"]).rglob("*") if path.is_file()]
        self.assertEqual(remaining, [])


if __name__ == "__main__":
    unittest.main()
