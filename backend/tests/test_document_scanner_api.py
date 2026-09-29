"""AI document scanner tests. OCR does not verify documents or score eligibility."""

from __future__ import annotations

import os
import tempfile
import unittest
from dataclasses import dataclass

from sqlalchemy import text

from app.db.base import Base
from app.db.init_db import ensure_application_schema
from app.db.session import check_database, get_engine, load_database_env, reset_engine
from app.models import citizen as _citizen_model  # noqa: F401
from app.models import document_scans as _document_scans_model  # noqa: F401
from app.models import documents as _documents_model  # noqa: F401
from app.models import history as _history_model  # noqa: F401
from app.models import readiness as _readiness_model  # noqa: F401
from app.models import uploads as _uploads_model  # noqa: F401
from app.models import user as _user_model  # noqa: F401
from app.services.ocr_service import OcrUnavailableError, OcrUnreadableError, OcrTextResult, set_ocr_provider

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

CHANGED_WALLET = {
    **WALLET_PROFILE,
    "age": 28,
    "is_student": False,
    "first_higher_education_course": False,
    "school_background": "other",
}

MIN_PDF = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n"
CLEAR_TEXT = (
    "Government Higher Secondary School Tamil Medium marksheet. "
    "The student is studying in first year undergraduate course. "
    "Date of Birth: 01/01/2006"
)
UNCLEAR_TEXT = "School certificate issued by the board."


@dataclass
class FakeOcrProvider:
    text: str = CLEAR_TEXT
    error: Exception | None = None

    def extract_text(self, payload: bytes, content_type: str) -> OcrTextResult:
        _ = payload, content_type
        if self.error is not None:
            raise self.error
        return OcrTextResult(text=self.text, engine="fake", mean_confidence=90)


def _postgres_ready() -> bool:
    load_database_env()
    test_url = (os.environ.get("TEST_DATABASE_URL") or "").strip()
    if not test_url:
        return False
    os.environ["SCHEME_PREDICTOR_USE_TEST_DB"] = "1"
    reset_engine()
    return check_database()


class DocumentScannerContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        from fastapi.testclient import TestClient

        from app.main import app

        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def test_unauthenticated_scan_routes_return_401(self) -> None:
        self.assertEqual(self.client.get("/api/v1/document-scans/types").status_code, 401)
        self.assertEqual(
            self.client.post(
                "/api/v1/document-scans",
                json={"upload_id": "missing", "document_type": "education_certificate"},
            ).status_code,
            401,
        )
        self.assertEqual(self.client.get("/api/v1/document-scans/missing").status_code, 401)
        self.assertEqual(
            self.client.post("/api/v1/document-scans/missing/confirm", json={"fields": {}}).status_code,
            401,
        )
        self.assertEqual(self.client.post("/api/v1/document-scans/missing/cancel").status_code, 401)

    def test_openapi_lists_scanner_routes(self) -> None:
        paths = self.client.get("/openapi.json").json()["paths"]
        self.assertIn("/api/v1/document-scans", paths)
        self.assertIn("/api/v1/document-scans/types", paths)
        self.assertIn("/api/v1/document-scans/{scan_id}", paths)
        self.assertIn("/api/v1/document-scans/{scan_id}/confirm", paths)
        self.assertIn("/api/v1/document-scans/{scan_id}/cancel", paths)


class DocumentScannerDatabaseTests(unittest.TestCase):
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
        set_ocr_provider(None)
        cls._client_cm.__exit__(None, None, None)
        cls._tempdir.cleanup()
        reset_engine()

    def setUp(self) -> None:
        set_ocr_provider(FakeOcrProvider())
        with self.engine.begin() as connection:
            connection.execute(text("DELETE FROM document_scans"))
            connection.execute(text("DELETE FROM supporting_uploads"))
            connection.execute(text("DELETE FROM application_readiness"))
            connection.execute(text("DELETE FROM document_checklist_progress"))
            connection.execute(text("DELETE FROM recommendation_history"))
            connection.execute(text("DELETE FROM citizen_profiles"))
            connection.execute(text("DELETE FROM users"))

    def tearDown(self) -> None:
        set_ocr_provider(None)

    def _headers(self, email: str, name: str = "Scan Owner") -> dict[str, str]:
        self.client.post(
            "/api/v1/auth/register",
            json={"full_name": name, "email": email, "password": "password123"},
        )
        token = self.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "password123"},
        ).json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def _upload(
        self,
        headers: dict[str, str],
        *,
        category: str = "education_certificate",
        filename: str = "school-certificate.pdf",
        payload: bytes = MIN_PDF,
        content_type: str = "application/pdf",
    ) -> dict:
        created = self.client.post(
            "/api/v1/uploads",
            data={"category": category},
            files={"file": (filename, payload, content_type)},
            headers=headers,
        )
        self.assertEqual(created.status_code, 201, created.text)
        return created.json()

    def test_valid_upload_then_ocr_review_confirm_and_cancel_paths(self) -> None:
        owner = self._headers("scanner.owner@example.com")
        other = self._headers("scanner.other@example.com")
        created_wallet = self.client.post("/api/v1/wallets", json=CHANGED_WALLET, headers=owner)
        self.assertEqual(created_wallet.status_code, 201)
        citizen_id = created_wallet.json()["citizen_id"]

        upload = self._upload(owner)
        self.assertEqual(upload["review_status"], "pending")

        scanned = self.client.post(
            "/api/v1/document-scans",
            json={"upload_id": upload["id"], "document_type": "education_certificate"},
            headers=owner,
        )
        self.assertEqual(scanned.status_code, 201, scanned.text)
        body = scanned.json()
        self.assertEqual(body["status"], "pending_review")
        self.assertEqual(body["review_status"], "pending")
        self.assertIsNone(body["wallet"])
        fields = {item["name"]: item for item in body["fields"]}
        self.assertEqual(fields["age"]["value"], 20)
        self.assertEqual(fields["age"]["clarity"], "extracted")
        self.assertEqual(fields["age"]["current_wallet_value"], 28)
        self.assertTrue(fields["is_student"]["value"])
        self.assertEqual(fields["school_background"]["value"], "government_or_aided_tamil_medium_6_to_12")

        unchanged = self.client.get(f"/api/v1/wallets/{citizen_id}", headers=owner).json()
        self.assertEqual(unchanged["age"], 28)
        self.assertFalse(unchanged["is_student"])
        self.assertEqual(unchanged["school_background"], "other")

        foreign = self.client.get(f"/api/v1/document-scans/{body['id']}", headers=other)
        self.assertEqual(foreign.status_code, 404)
        foreign_confirm = self.client.post(
            f"/api/v1/document-scans/{body['id']}/confirm",
            json={"fields": {"is_student": True}},
            headers=other,
        )
        self.assertEqual(foreign_confirm.status_code, 404)

        confirmed = self.client.post(
            f"/api/v1/document-scans/{body['id']}/confirm",
            json={"fields": {"is_student": True, "school_background": "government_or_aided_tamil_medium_6_to_12"}},
            headers=owner,
        )
        self.assertEqual(confirmed.status_code, 200, confirmed.text)
        confirmed_body = confirmed.json()
        self.assertEqual(confirmed_body["status"], "confirmed")
        self.assertEqual(confirmed_body["review_status"], "pending")
        self.assertCountEqual(
            confirmed_body["applied_fields"],
            ["is_student", "school_background"],
        )
        wallet = confirmed_body["wallet"]
        self.assertIsNotNone(wallet)
        self.assertTrue(wallet["is_student"])
        self.assertEqual(wallet["school_background"], "government_or_aided_tamil_medium_6_to_12")
        self.assertEqual(wallet["age"], 28)
        self.assertFalse(wallet["first_higher_education_course"])

        stored = self.client.get(f"/api/v1/wallets/{citizen_id}", headers=owner).json()
        self.assertEqual(stored["age"], 28)
        self.assertTrue(stored["is_student"])

        upload_after = self.client.get(f"/api/v1/uploads/{upload['id']}", headers=owner).json()
        self.assertEqual(upload_after["review_status"], "pending")

        second = self.client.post(
            f"/api/v1/document-scans/{body['id']}/confirm",
            json={"fields": {"age": 21}},
            headers=owner,
        )
        self.assertEqual(second.status_code, 409)

    def test_cancel_leaves_wallet_and_review_status_unchanged(self) -> None:
        owner = self._headers("scanner.cancel@example.com")
        citizen_id = self.client.post("/api/v1/wallets", json=CHANGED_WALLET, headers=owner).json()["citizen_id"]
        upload = self._upload(owner)
        scanned = self.client.post(
            "/api/v1/document-scans",
            json={"upload_id": upload["id"], "document_type": "education_certificate"},
            headers=owner,
        ).json()
        cancelled = self.client.post(f"/api/v1/document-scans/{scanned['id']}/cancel", headers=owner)
        self.assertEqual(cancelled.status_code, 200)
        self.assertEqual(cancelled.json()["status"], "cancelled")
        self.assertEqual(cancelled.json()["review_status"], "pending")
        wallet = self.client.get(f"/api/v1/wallets/{citizen_id}", headers=owner).json()
        self.assertEqual(wallet["age"], 28)
        self.assertFalse(wallet["is_student"])
        self.assertEqual(wallet["school_background"], "other")
        confirm_after = self.client.post(
            f"/api/v1/document-scans/{scanned['id']}/confirm",
            json={"fields": {"is_student": True}},
            headers=owner,
        )
        self.assertEqual(confirm_after.status_code, 409)

    def test_unclear_fields_and_empty_confirmation_are_rejected(self) -> None:
        set_ocr_provider(FakeOcrProvider(text=UNCLEAR_TEXT))
        owner = self._headers("scanner.unclear@example.com")
        self.client.post("/api/v1/wallets", json=WALLET_PROFILE, headers=owner)
        upload = self._upload(owner)
        scanned = self.client.post(
            "/api/v1/document-scans",
            json={"upload_id": upload["id"], "document_type": "education_certificate"},
            headers=owner,
        )
        self.assertEqual(scanned.status_code, 201)
        fields = {item["name"]: item for item in scanned.json()["fields"]}
        self.assertEqual(fields["age"]["clarity"], "missing")
        self.assertEqual(fields["first_higher_education_course"]["clarity"], "missing")
        self.assertEqual(fields["school_background"]["clarity"], "unclear")
        empty = self.client.post(
            f"/api/v1/document-scans/{scanned.json()['id']}/confirm",
            json={"fields": {}},
            headers=owner,
        )
        self.assertEqual(empty.status_code, 422)
        invented = self.client.post(
            f"/api/v1/document-scans/{scanned.json()['id']}/confirm",
            json={"fields": {"annual_income": 100000}},
            headers=owner,
        )
        self.assertEqual(invented.status_code, 422)

    def test_ocr_failure_and_unsupported_type_do_not_update_wallet(self) -> None:
        owner = self._headers("scanner.fail@example.com")
        citizen_id = self.client.post("/api/v1/wallets", json=CHANGED_WALLET, headers=owner).json()["citizen_id"]
        upload = self._upload(owner)

        set_ocr_provider(FakeOcrProvider(error=OcrUnreadableError("The document could not be read. Try a clearer PDF or image.")))
        unreadable = self.client.post(
            "/api/v1/document-scans",
            json={"upload_id": upload["id"], "document_type": "education_certificate"},
            headers=owner,
        )
        self.assertEqual(unreadable.status_code, 422)
        self.assertIn("could not be read", unreadable.json()["detail"].lower())

        set_ocr_provider(FakeOcrProvider(error=OcrUnavailableError("Local OCR is not available. Install Tesseract and optionally set TESSERACT_CMD.")))
        unavailable = self.client.post(
            "/api/v1/document-scans",
            json={"upload_id": upload["id"], "document_type": "education_certificate"},
            headers=owner,
        )
        self.assertEqual(unavailable.status_code, 503)

        income = self._upload(owner, category="income_certificate", filename="income-note.pdf")
        set_ocr_provider(FakeOcrProvider())
        unsupported = self.client.post(
            "/api/v1/document-scans",
            json={"upload_id": income["id"], "document_type": "education_certificate"},
            headers=owner,
        )
        self.assertEqual(unsupported.status_code, 422)

        wallet = self.client.get(f"/api/v1/wallets/{citizen_id}", headers=owner).json()
        self.assertEqual(wallet["age"], 28)
        self.assertFalse(wallet["is_student"])

    def test_existing_upload_validation_still_rejects_bad_files(self) -> None:
        headers = self._headers("scanner.reject@example.com")
        oversized = self.client.post(
            "/api/v1/uploads",
            data={"category": "education_certificate"},
            files={"file": ("huge.pdf", b"%PDF" + (b"A" * (5 * 1024 * 1024 + 10)), "application/pdf")},
            headers=headers,
        )
        self.assertEqual(oversized.status_code, 422)
        bad_type = self.client.post(
            "/api/v1/uploads",
            data={"category": "education_certificate"},
            files={"file": ("notes.exe", b"MZ-not-allowed", "application/octet-stream")},
            headers=headers,
        )
        self.assertEqual(bad_type.status_code, 422)

    def test_confirm_without_wallet_does_not_create_one(self) -> None:
        owner = self._headers("scanner.nowallet@example.com")
        upload = self._upload(owner)
        scanned = self.client.post(
            "/api/v1/document-scans",
            json={"upload_id": upload["id"], "document_type": "education_certificate"},
            headers=owner,
        )
        self.assertEqual(scanned.status_code, 201)
        confirmed = self.client.post(
            f"/api/v1/document-scans/{scanned.json()['id']}/confirm",
            json={"fields": {"is_student": True}},
            headers=owner,
        )
        self.assertEqual(confirmed.status_code, 404)
        self.assertEqual(self.client.get("/api/v1/wallets/me", headers=owner).status_code, 404)
