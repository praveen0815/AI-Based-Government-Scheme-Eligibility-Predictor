"""On-demand PDF report tests. Does not store generated files."""

from __future__ import annotations

import os
import unittest
from datetime import datetime, timezone

from sqlalchemy import text

from app.db.base import Base
from app.db.init_db import ensure_application_schema
from app.db.session import check_database, get_engine, load_database_env, reset_engine
from app.models import citizen as _citizen_model  # noqa: F401
from app.models import history as _history_model  # noqa: F401
from app.models import user as _user_model  # noqa: F401
from app.models.user import UserRecord
from app.schemas.completeness import ProfileCompletenessResponse
from app.schemas.report import PROJECT_TITLE
from app.schemas.wallet import CitizenWalletResponse
from app.services.recommendation_service import recommend_for_citizen
from app.services.report_service import generate_recommendation_report_pdf

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


class ReportServiceTests(unittest.TestCase):
    def test_pdf_contains_title_disclaimer_and_no_secrets(self) -> None:
        now = datetime.now(timezone.utc)
        wallet = CitizenWalletResponse(
            **WALLET_PROFILE,
            citizen_id="11111111-2222-3333-4444-555555555555",
            created_at=now,
            updated_at=now,
        )
        user = UserRecord(
            id="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
            email="owner@example.com",
            password_hash="should-not-appear",
            full_name="Report Owner",
        )
        pdf = generate_recommendation_report_pdf(
            user=user,
            wallet=wallet,
            completeness=ProfileCompletenessResponse(
                percentage=100,
                completed_fields=11,
                total_fields=11,
                incomplete_fields=[],
            ),
            recommendation=recommend_for_citizen(WALLET_PROFILE),
            comparison=None,
        )
        self.assertTrue(pdf.startswith(b"%PDF"))
        self.assertGreater(len(pdf), 1000)
        self.assertIn(PROJECT_TITLE.encode("latin-1"), pdf)
        self.assertIn(b"SchemeWise AI research prototype", pdf)
        self.assertIn(b"Times-Bold", pdf)
        self.assertNotIn(b"should-not-appear", pdf)
        self.assertNotIn(b"password_hash", pdf)
        self.assertNotIn(b"owner@example.com", pdf)

    def test_tamil_pdf_uses_localized_headings_without_changing_eligibility(self) -> None:
        now = datetime.now(timezone.utc)
        wallet = CitizenWalletResponse(
            **WALLET_PROFILE,
            citizen_id="11111111-2222-3333-4444-555555555555",
            created_at=now,
            updated_at=now,
        )
        user = UserRecord(
            id="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
            email="owner@example.com",
            password_hash="should-not-appear",
            full_name="Report Owner",
        )
        english = generate_recommendation_report_pdf(
            user=user,
            wallet=wallet,
            completeness=ProfileCompletenessResponse(
                percentage=100,
                completed_fields=11,
                total_fields=11,
                incomplete_fields=[],
            ),
            recommendation=recommend_for_citizen(WALLET_PROFILE),
            comparison=None,
            language="en",
        )
        tamil = generate_recommendation_report_pdf(
            user=user,
            wallet=wallet,
            completeness=ProfileCompletenessResponse(
                percentage=100,
                completed_fields=11,
                total_fields=11,
                incomplete_fields=[],
            ),
            recommendation=recommend_for_citizen(WALLET_PROFILE),
            comparison=None,
            language="ta",
        )
        self.assertTrue(tamil.startswith(b"%PDF"))
        self.assertGreater(len(tamil), 1000)
        self.assertIn(b"Times-Bold", english)
        self.assertTrue(b"NirmalaUI" in tamil or b"NotoSansTamil" in tamil)
        self.assertIn(b"TrueType", tamil)
        self.assertNotIn(b"Times-Bold", tamil)
        self.assertNotIn(b"should-not-appear", tamil)


class ReportRouteContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        from fastapi.testclient import TestClient

        from app.main import app

        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def test_unauthenticated_report_returns_401(self) -> None:
        response = self.client.post("/api/v1/reports/recommendations", json={})
        self.assertEqual(response.status_code, 401)

    def test_openapi_lists_report_route(self) -> None:
        paths = self.client.get("/openapi.json").json()["paths"]
        self.assertIn("/api/v1/reports/recommendations", paths)
        self.assertIn("post", paths["/api/v1/reports/recommendations"])


class ReportDatabaseTests(unittest.TestCase):
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

    def test_report_requires_owned_wallet_and_returns_pdf(self) -> None:
        self.client.post(
            "/api/v1/auth/register",
            json={"full_name": "Report Owner", "email": "report@example.com", "password": "password123"},
        )
        token = self.client.post(
            "/api/v1/auth/login",
            json={"email": "report@example.com", "password": "password123"},
        ).json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        missing = self.client.post("/api/v1/reports/recommendations", json={}, headers=headers)
        self.assertEqual(missing.status_code, 404)

        self.client.post("/api/v1/wallets", json=WALLET_PROFILE, headers=headers)
        response = self.client.post(
            "/api/v1/reports/recommendations",
            json={"compare_scheme_ids": ["TN-SW-001", "TN-SW-006"]},
            headers=headers,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["content-type"], "application/pdf")
        self.assertTrue(response.content.startswith(b"%PDF"))
        self.assertNotIn(b"password123", response.content)
        self.assertNotIn(token.encode(), response.content)


if __name__ == "__main__":
    unittest.main()
