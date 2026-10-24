"""Readiness evaluation tests. Eligibility stays with the rule engine; readiness is separate."""

from __future__ import annotations

import os
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import patch

from sqlalchemy import text

from app.db.base import Base
from app.db.init_db import ensure_application_schema
from app.db.session import check_database, get_engine, load_database_env, reset_engine
from app.schemas.wallet import CitizenWalletResponse
from app.services import readiness_evaluation_service as service
from app.services.readiness_evaluation_service import ReadinessEvaluationNotFoundError, _evaluate
from app.services.scheme_requirements_service import get_scheme_requirements

STUDENT = {
    "age": 19,
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
FARMER = {
    **STUDENT,
    "age": 40,
    "gender": "male",
    "is_student": False,
    "first_higher_education_course": False,
    "school_background": "other",
    "marital_status": "married",
    "occupation_category": "small_marginal_farmer",
}


def _wallet(profile: dict) -> CitizenWalletResponse:
    now = datetime.now(timezone.utc)
    return CitizenWalletResponse(citizen_id="test-citizen", created_at=now, updated_at=now, **profile)


def _with_documents_level(scheme_id: str, level: str):
    requirements = get_scheme_requirements(None, scheme_id)
    documents = [doc.model_copy(update={"requirement": level, "verification_status": "verified"})
                 for doc in requirements.documents]
    return requirements.model_copy(update={"documents": documents})


class ReadinessEvaluationLogicTests(unittest.TestCase):
    def test_no_wallet_is_insufficient_information_not_ineligible(self) -> None:
        result = _evaluate(None, "TN-SW-001", None, {}, None)
        self.assertEqual(result.readiness_state, "insufficient_information")
        self.assertEqual(result.eligibility.outcome, "insufficient_information")
        self.assertFalse(result.profile.has_wallet)
        self.assertEqual(result.profile.missing_fields, result.profile.required_fields)
        self.assertTrue(all(item.outcome == "unknown" for item in result.eligibility.conditions))
        self.assertIsNone(result.ml_comparison)

    def test_missing_profile_field_is_insufficient_information(self) -> None:
        wallet = _wallet(STUDENT)
        with patch.object(service, "_missing_profile_fields", return_value=["school_background"]):
            result = _evaluate(None, "TN-SW-001", wallet, {}, None)
        self.assertEqual(result.readiness_state, "insufficient_information")
        self.assertNotEqual(result.eligibility.outcome, "ineligible_under_rules")
        self.assertIn("school_background", result.blocking_reasons[0])

    def test_ineligible_lists_only_failed_conditions(self) -> None:
        result = _evaluate(None, "TN-SW-001", _wallet({**STUDENT, "gender": "male"}), {}, None)
        self.assertEqual(result.readiness_state, "ineligible_under_rules")
        outcomes = {item.key: item.outcome for item in result.eligibility.conditions}
        self.assertEqual(outcomes["gender_female"], "not_met")
        self.assertEqual(outcomes["is_student"], "met")
        self.assertEqual(result.blocking_reasons, ["Documented condition not met: Applicant is female."])

    def test_eligible_with_missing_document_list_is_unverified_requirements(self) -> None:
        result = _evaluate(None, "TN-SW-001", _wallet(STUDENT), {}, None)
        self.assertEqual(result.eligibility.outcome, "eligible_under_rules")
        self.assertEqual(result.readiness_state, "unverified_requirements")
        self.assertEqual(result.documents.documents_status, "missing")
        self.assertIn("required documents are not listed on an official source", result.unverified_requirements)
        self.assertTrue(all(item.outcome == "met" for item in result.eligibility.conditions))

    def test_rev001_land_edge_case_keeps_rule_result_and_flags_land(self) -> None:
        result = _evaluate(None, "TN-REV-001", _wallet({**FARMER, "wet_land_acres": 10.0}), {}, None)
        self.assertEqual(result.eligibility.outcome, "eligible_under_rules")
        land = next(item for item in result.eligibility.conditions if item.key == "land_holding_limit")
        self.assertEqual(land.outcome, "met")
        self.assertEqual(land.verification_status, "unverified")
        self.assertIn("exceeds 2.50", land.rule_reason)
        self.assertEqual(result.readiness_state, "unverified_requirements")
        self.assertTrue(any("Land-holding" in item for item in result.unverified_requirements))

    def test_unspecified_document_levels_never_become_missing_mandatory(self) -> None:
        result = _evaluate(None, "TN-REV-001", _wallet(FARMER), {}, None)
        self.assertEqual(result.documents.mandatory_missing, [])
        self.assertTrue(result.documents.requirement_level_unspecified)
        self.assertIn(service.UNSPECIFIED_LEVEL_ITEM, result.unverified_requirements)

    def test_missing_mandatory_documents_when_levels_are_confirmed(self) -> None:
        confirmed = _with_documents_level("TN-REV-002", "mandatory")
        pensioner = {**STUDENT, "age": 55, "is_student": False, "first_higher_education_course": False,
                     "is_destitute": True}
        with patch.object(service, "get_scheme_requirements", return_value=confirmed):
            saved = {confirmed.documents[0].key: "ready"}
            result = _evaluate(None, "TN-REV-002", _wallet(pensioner), saved, None)
        self.assertEqual(result.readiness_state, "missing_mandatory_documents")
        self.assertEqual(len(result.documents.mandatory_missing), len(confirmed.documents) - 1)
        self.assertNotIn(confirmed.documents[0].label, result.documents.mandatory_missing)
        self.assertEqual(result.documents.items[0].citizen_status, "ready")

    def test_all_confirmed_and_ready_is_eligible_under_rules(self) -> None:
        confirmed = _with_documents_level("TN-REV-002", "mandatory")
        confirmed = confirmed.model_copy(update={"unverified_items": []})
        pensioner = {**STUDENT, "age": 55, "is_student": False, "first_higher_education_course": False,
                     "is_destitute": True}
        saved = {doc.key: "ready" for doc in confirmed.documents}
        with patch.object(service, "get_scheme_requirements", return_value=confirmed):
            result = _evaluate(None, "TN-REV-002", _wallet(pensioner), saved, "ready_to_apply")
        self.assertEqual(result.readiness_state, "eligible_under_rules")
        self.assertEqual(result.blocking_reasons, [])
        self.assertTrue(result.manual_stage.consistent_with_evaluation)

    def test_ml_disagreement_never_changes_rule_outcome(self) -> None:
        fake = SimpleNamespace(ml_prediction="not_eligible", eligible_probability=0.1)
        with patch.object(service, "compare_rule_and_ml", return_value=fake):
            result = _evaluate(None, "TN-SW-001", _wallet(STUDENT), {}, None)
        self.assertEqual(result.eligibility.outcome, "eligible_under_rules")
        self.assertFalse(result.ml_comparison.agrees_with_rule)

    def test_manual_ready_stage_is_flagged_when_inconsistent(self) -> None:
        result = _evaluate(None, "TN-SW-001", _wallet({**STUDENT, "gender": "male"}), {}, "ready_to_apply")
        self.assertFalse(result.manual_stage.consistent_with_evaluation)
        self.assertIsNotNone(result.manual_stage.note)

    def test_non_core_scheme_is_rejected(self) -> None:
        with self.assertRaises(ReadinessEvaluationNotFoundError):
            service.evaluate_scheme_readiness(None, "user", "TN-KMUT-001")


class ReadinessEvaluationContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        from fastapi.testclient import TestClient

        from app.main import app

        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def test_unauthenticated_requests_return_401(self) -> None:
        self.assertEqual(self.client.get("/api/v1/readiness/evaluation").status_code, 401)
        self.assertEqual(self.client.get("/api/v1/readiness/evaluation/TN-SW-001").status_code, 401)

    def test_invalid_token_returns_401(self) -> None:
        response = self.client.get(
            "/api/v1/readiness/evaluation", headers={"Authorization": "Bearer not-a-token"}
        )
        self.assertEqual(response.status_code, 401)

    def test_openapi_lists_evaluation_routes(self) -> None:
        paths = self.client.get("/openapi.json").json()["paths"]
        self.assertIn("/api/v1/readiness/evaluation", paths)
        self.assertIn("/api/v1/readiness/evaluation/{scheme_id}", paths)
        self.assertIn("/api/v1/schemes/{scheme_id}/requirements", paths)
        self.assertNotIn("patch", paths["/api/v1/readiness/evaluation/{scheme_id}"])


def _postgres_ready() -> bool:
    load_database_env()
    test_url = (os.environ.get("TEST_DATABASE_URL") or "").strip()
    if not test_url:
        return False
    os.environ["SCHEME_PREDICTOR_USE_TEST_DB"] = "1"
    reset_engine()
    return check_database()


class ReadinessEvaluationDatabaseTests(unittest.TestCase):
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
            connection.execute(text("DELETE FROM application_readiness"))
            connection.execute(text("DELETE FROM document_checklist_progress"))
            connection.execute(text("DELETE FROM recommendation_history"))
            connection.execute(text("DELETE FROM citizen_profiles"))
            connection.execute(text("DELETE FROM users"))

    def _headers(self, email: str) -> dict[str, str]:
        self.client.post(
            "/api/v1/auth/register",
            json={"full_name": "Evaluation Owner", "email": email, "password": "password123"},
        )
        token = self.client.post(
            "/api/v1/auth/login", json={"email": email, "password": "password123"}
        ).json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_user_without_wallet_gets_insufficient_information(self) -> None:
        headers = self._headers("evaluation.nowallet@example.com")
        response = self.client.get("/api/v1/readiness/evaluation", headers=headers)
        self.assertEqual(response.status_code, 200)
        states = {item["readiness_state"] for item in response.json()["schemes"]}
        self.assertEqual(states, {"insufficient_information"})

    def test_evaluation_is_owner_scoped_and_not_history_gated(self) -> None:
        owner = self._headers("evaluation.owner@example.com")
        other = self._headers("evaluation.other@example.com")
        self.client.post("/api/v1/wallets", json=STUDENT, headers=owner)

        mine = self.client.get("/api/v1/readiness/evaluation/TN-SW-001", headers=owner)
        self.assertEqual(mine.status_code, 200)
        self.assertEqual(mine.json()["eligibility"]["outcome"], "eligible_under_rules")

        theirs = self.client.get("/api/v1/readiness/evaluation/TN-SW-001", headers=other)
        self.assertEqual(theirs.status_code, 200)
        self.assertEqual(theirs.json()["readiness_state"], "insufficient_information")
        self.assertFalse(theirs.json()["profile"]["has_wallet"])

        with self.engine.connect() as connection:
            count = connection.execute(text("SELECT COUNT(*) FROM application_readiness")).scalar()
        self.assertEqual(count, 0)

    def test_non_core_scheme_returns_404(self) -> None:
        headers = self._headers("evaluation.noncore@example.com")
        response = self.client.get("/api/v1/readiness/evaluation/TN-KMUT-001", headers=headers)
        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
