"""Scheme Requirements Registry tests. Registry must mirror the rule engine and never invent."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.main import app
from app.paths import ensure_ml_src_on_path
from app.schemas.scheme_knowledge import SchemeKnowledgeItemUpdate
from app.services.document_checklist_service import catalog_document_items
from app.services.rule_engine_service import evaluate_documented_rule
from app.services.scheme_knowledge_service import SchemeKnowledgeRejectedError, update_scheme_knowledge_item
from app.services.scheme_requirements_service import (
    RequirementsRegistryError,
    SchemeRequirementsRegistry,
    get_requirements_registry,
    registry_overlay_keys,
)
from app.services.scheme_service import get_scheme_service

ensure_ml_src_on_path()

from eligibility_rules import RULE_FUNCTIONS  # noqa: E402
from ml_config import CORE_SCHEME_IDS  # noqa: E402

BASE_PROFILE = {
    "age": 30,
    "gender": "female",
    "is_student": False,
    "first_higher_education_course": False,
    "school_background": "other",
    "marital_status": "never_married",
    "is_orphan": False,
    "is_destitute": False,
    "occupation_category": "other",
    "wet_land_acres": 0.0,
    "dry_land_acres": 0.0,
}


class _TrackingProfile(dict):
    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.read: set[str] = set()

    def __getitem__(self, key):
        self.read.add(key)
        return super().__getitem__(key)


class RegistryIntegrityTests(unittest.TestCase):
    def test_every_core_scheme_has_conditions(self) -> None:
        entries = get_requirements_registry().entries()
        self.assertEqual(set(entries), set(CORE_SCHEME_IDS))

    def test_condition_fields_match_fields_read_by_rule(self) -> None:
        for scheme_id in CORE_SCHEME_IDS:
            profile = _TrackingProfile(BASE_PROFILE)
            RULE_FUNCTIONS[scheme_id](profile)
            entry = get_requirements_registry().entry(scheme_id)
            declared = {name for condition in entry.conditions for name in condition.profile_fields}
            self.assertEqual(declared, profile.read, scheme_id)

    def test_one_rule_reason_per_condition(self) -> None:
        student = {**BASE_PROFILE, "is_student": True, "first_higher_education_course": True,
                   "school_background": "government_6_to_12", "age": 19}
        eligible = {
            "TN-SW-001": student,
            "TN-SW-002": {**student, "gender": "male"},
            "TN-SW-004": {**BASE_PROFILE, "marital_status": "widow_remarrying"},
            "TN-SW-006": {**BASE_PROFILE, "is_orphan": True},
            "TN-REV-001": {**BASE_PROFILE, "occupation_category": "small_marginal_farmer"},
            "TN-REV-002": {**BASE_PROFILE, "age": 55, "is_destitute": True},
        }
        self.assertEqual(set(eligible), set(CORE_SCHEME_IDS))
        for scheme_id, profile in eligible.items():
            expected = len(get_requirements_registry().entry(scheme_id).conditions)
            result = evaluate_documented_rule(scheme_id, profile)
            self.assertTrue(result.rule_eligible, scheme_id)
            self.assertEqual(len(result.rule_reasons), expected, scheme_id)

    def test_document_keys_match_checklist_keys(self) -> None:
        record = get_scheme_service().require_core("TN-REV-001")
        checklist_keys = {key for key, _ in catalog_document_items(record.required_documents)}
        overlay_doc_keys = {
            key.removeprefix("document:") for key in registry_overlay_keys(record) if key.startswith("document:")
        }
        self.assertEqual(overlay_doc_keys, checklist_keys)

    def test_invalid_registry_is_rejected(self) -> None:
        bad = {"schemes": {scheme_id: {"conditions": []} for scheme_id in CORE_SCHEME_IDS}}
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "requirements.json"
            path.write_text(json.dumps(bad), encoding="utf-8")
            with self.assertRaises(RequirementsRegistryError):
                SchemeRequirementsRegistry(path).load()

    def test_unverified_condition_requires_a_note(self) -> None:
        payload = json.loads(json.dumps({"schemes": {}}))
        for scheme_id in CORE_SCHEME_IDS:
            payload["schemes"][scheme_id] = {
                "conditions": [
                    {"key": "x", "label": "x", "profile_fields": ["age"],
                     "verification_status": "unverified", "basis": "official_source"}
                ]
            }
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "requirements.json"
            path.write_text(json.dumps(payload), encoding="utf-8")
            with self.assertRaises(RequirementsRegistryError):
                SchemeRequirementsRegistry(path).load()


class AdminOverlayKeyTests(unittest.TestCase):
    def test_placeholder_step_cannot_be_marked_verified(self) -> None:
        record = get_scheme_service().require_core("TN-SW-004")
        self.assertIn("step:1", registry_overlay_keys(record))
        self.assertNotIn("step:2", registry_overlay_keys(record))
        with self.assertRaises(SchemeKnowledgeRejectedError):
            update_scheme_knowledge_item(
                MagicMock(),
                "TN-SW-004",
                "step:2",
                SchemeKnowledgeItemUpdate(verification_status="verified"),
                "admin-id",
            )

    def test_conditions_are_not_admin_editable(self) -> None:
        with self.assertRaises(SchemeKnowledgeRejectedError):
            update_scheme_knowledge_item(
                MagicMock(),
                "TN-REV-001",
                "condition:land_holding_limit",
                SchemeKnowledgeItemUpdate(verification_status="verified"),
                "admin-id",
            )


class SchemeRequirementsApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def _get(self, scheme_id: str) -> dict:
        response = self.client.get(f"/api/v1/schemes/{scheme_id}/requirements")
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_pudhumai_penn_reports_missing_documents_without_inventing(self) -> None:
        body = self._get("TN-SW-001")
        self.assertTrue(body["rule_evaluated"])
        self.assertEqual(body["documents_status"], "missing")
        self.assertEqual(body["documents"], [])
        self.assertEqual(
            body["required_profile_fields"],
            ["gender", "is_student", "first_higher_education_course", "school_background"],
        )
        self.assertTrue(all(item["verification_status"] == "verified" for item in body["conditions"]))
        self.assertEqual(body["information_not_checked"][0]["key"], "family_income")
        self.assertIn("required documents are not listed on an official source", body["unverified_items"])
        self.assertEqual(body["last_checked"], "2026-08-14")
        self.assertIn("https://pudhumaipenn.tn.gov.in/", [link["url"] for link in body["official_links"]])

    def test_rev001_land_condition_is_unverified_and_documents_listed(self) -> None:
        body = self._get("TN-REV-001")
        conditions = {item["key"]: item for item in body["conditions"]}
        land = conditions["land_holding_limit"]
        self.assertEqual(land["verification_status"], "unverified")
        self.assertEqual(land["basis"], "project_interpretation")
        self.assertIn("G.O.", land["note"])
        self.assertEqual(conditions["age_18_to_65"]["verification_status"], "verified")
        self.assertEqual(body["documents_status"], "listed")
        self.assertEqual(len(body["documents"]), 8)
        self.assertEqual(body["documents"][0]["label"], "applicant photo")
        self.assertTrue(all(doc["requirement"] == "unspecified" for doc in body["documents"]))
        self.assertTrue(all(doc["verification_status"] == "unverified" for doc in body["documents"]))
        self.assertIn("https://oap.tn.gov.in/cmupt/", [link["url"] for link in body["official_links"]])

    def test_placeholder_procedure_step_is_missing(self) -> None:
        body = self._get("TN-SW-004")
        steps = body["application_steps"]
        self.assertEqual(steps[0]["text"], "Listed on TNeGA e-Sevai as SWL-105")
        self.assertEqual(steps[0]["verification_status"], "unverified")
        self.assertEqual(steps[1]["verification_status"], "missing")
        age = {item["key"]: item for item in body["conditions"]}["age_18_or_above"]
        self.assertEqual(age["basis"], "department_convention")

    def test_non_core_scheme_is_not_rule_evaluated(self) -> None:
        body = self._get("TN-KMUT-001")
        self.assertFalse(body["rule_evaluated"])
        self.assertEqual(body["conditions"], [])
        self.assertEqual(body["required_profile_fields"], [])
        self.assertEqual(len(body["documents"]), 3)

    def test_placeholder_documents_for_hold_scheme_are_not_listed(self) -> None:
        body = self._get("TN-DAW-001")
        self.assertEqual(body["documents_status"], "missing")

    def test_unknown_scheme_returns_404(self) -> None:
        response = self.client.get("/api/v1/schemes/TN-NOT-REAL/requirements")
        self.assertEqual(response.status_code, 404)

    def test_list_filters_by_scope(self) -> None:
        response = self.client.get("/api/v1/scheme-requirements", params={"ml_scope": "CORE"})
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["scheme_count"], len(CORE_SCHEME_IDS))
        self.assertTrue(all(item["rule_evaluated"] for item in body["schemes"]))

    def test_verification_notes_include_age_convention(self) -> None:
        result = evaluate_documented_rule(
            "TN-SW-004", {**BASE_PROFILE, "marital_status": "widow_remarrying"}
        )
        self.assertTrue(result.rule_eligible)
        self.assertTrue(any("18 years or older" in item for item in result.unverified_items))


if __name__ == "__main__":
    unittest.main()
