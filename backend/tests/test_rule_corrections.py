"""Regression tests for rule reason text and verification notes. Labels must not change."""

from __future__ import annotations

import csv
import unittest

from fastapi.testclient import TestClient

from app.main import app
from app.paths import ensure_ml_src_on_path, project_root
from app.services.rule_engine_service import evaluate_documented_rule

ensure_ml_src_on_path()

from eligibility_rules import evaluate_scheme  # noqa: E402

FARMER = {
    "age": 40,
    "gender": "male",
    "is_student": False,
    "first_higher_education_course": False,
    "school_background": "other",
    "marital_status": "married",
    "is_orphan": False,
    "is_destitute": False,
    "occupation_category": "small_marginal_farmer",
    "wet_land_acres": 0.0,
    "dry_land_acres": 0.0,
}

UNMARRIED_PENSIONER = {
    **FARMER,
    "gender": "female",
    "age": 55,
    "marital_status": "never_married",
    "is_destitute": True,
    "occupation_category": "other",
}


def _farmer(wet: float, dry: float) -> dict:
    return {**FARMER, "wet_land_acres": wet, "dry_land_acres": dry}


class Rev001LandRuleTests(unittest.TestCase):
    """Current OR interpretation is preserved; reason text must not contradict the values."""

    def test_large_wet_holding_keeps_current_result_with_truthful_reason(self) -> None:
        result = evaluate_scheme("TN-REV-001", _farmer(10.0, 0.0))
        self.assertTrue(result.eligible)
        self.assertNotIn("10.00 <= 2.50", result.reason)
        self.assertIn("dry land 0.00 acres is within the 5.00 acre dry limit", result.reason)
        self.assertIn("wet land 10.00 acres exceeds 2.50", result.reason)

    def test_large_dry_holding_keeps_current_result_with_truthful_reason(self) -> None:
        result = evaluate_scheme("TN-REV-001", _farmer(0.0, 100.0))
        self.assertTrue(result.eligible)
        self.assertNotIn("100.00 <= 5.00", result.reason)
        self.assertIn("wet land 0.00 acres is within the 2.50 acre wet limit", result.reason)

    def test_boundaries_are_inclusive(self) -> None:
        result = evaluate_scheme("TN-REV-001", _farmer(2.5, 5.0))
        self.assertTrue(result.eligible)
        self.assertIn("within 2.50 and dry land 5.00 acres is within 5.00", result.reason)

    def test_exceeding_both_limits_is_not_eligible(self) -> None:
        for wet, dry in ((2.51, 5.01), (50.0, 50.0)):
            result = evaluate_scheme("TN-REV-001", _farmer(wet, dry))
            self.assertFalse(result.eligible)
            self.assertIn("land exceeds both", result.reason)

    def test_land_reason_stays_one_reason_entry(self) -> None:
        for wet, dry in ((10.0, 0.0), (0.0, 100.0)):
            evaluation = evaluate_documented_rule("TN-REV-001", _farmer(wet, dry))
            self.assertEqual(len(evaluation.rule_reasons), 3)
            self.assertIn("current rule accepts either limit", evaluation.rule_reasons[-1])

    def test_land_condition_is_flagged_unverified(self) -> None:
        evaluation = evaluate_documented_rule("TN-REV-001", _farmer(10.0, 0.0))
        self.assertTrue(evaluation.rule_eligible)
        self.assertIsNotNone(evaluation.verification_notes)
        self.assertIn("official G.O.", evaluation.verification_notes)
        self.assertTrue(any("land-holding" in item.lower() for item in evaluation.unverified_items))


class TrainingLabelStabilityTests(unittest.TestCase):
    """Reason-text changes must not alter any stored training label."""

    def test_rule_labels_match_processed_dataset(self) -> None:
        path = project_root() / "dataset" / "processed" / "eligibility_dataset.csv"
        if not path.is_file():
            self.skipTest("Processed eligibility dataset is not present")
        mismatches = 0
        rows = 0
        with path.open(newline="", encoding="utf-8") as handle:
            for row in csv.DictReader(handle):
                rows += 1
                expected = int(float(row["eligible"]))
                if evaluate_scheme(row["scheme_id"], row).label != expected:
                    mismatches += 1
        self.assertGreater(rows, 0)
        self.assertEqual(mismatches, 0)


class VerificationNotesApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def test_unverified_benefit_is_reported_even_when_documents_are_listed(self) -> None:
        response = self.client.post(
            "/api/v1/predict", json={**UNMARRIED_PENSIONER, "scheme_id": "TN-REV-002"}
        )
        self.assertEqual(response.status_code, 200)
        rule = response.json()["rule_result"]
        self.assertTrue(rule["eligible"])
        self.assertIn("benefit details", rule["unverified_items"])
        self.assertNotIn("required documents", rule["unverified_items"])
        self.assertIn("benefit details", rule["verification_notes"])

    def test_rev001_prediction_flags_land_condition(self) -> None:
        response = self.client.post(
            "/api/v1/predict", json={**_farmer(10.0, 0.0), "scheme_id": "TN-REV-001"}
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["prediction"], "eligible")
        self.assertTrue(
            any("land-holding" in item.lower() for item in body["rule_result"]["unverified_items"])
        )
        self.assertFalse(any("<= 2.50 or" in reason for reason in body["rule_reasons"]))

    def test_placeholder_documents_and_procedure_are_reported(self) -> None:
        widow = {
            **UNMARRIED_PENSIONER,
            "age": 30,
            "marital_status": "widow_remarrying",
            "is_destitute": False,
        }
        response = self.client.post("/api/v1/predict", json={**widow, "scheme_id": "TN-SW-004"})
        self.assertEqual(response.status_code, 200)
        items = response.json()["rule_result"]["unverified_items"]
        self.assertIn("required documents", items)
        self.assertIn("application procedure", items)

    def test_recommendations_carry_unverified_items(self) -> None:
        response = self.client.post("/api/v1/recommend", json=UNMARRIED_PENSIONER)
        self.assertEqual(response.status_code, 200)
        recs = {item["scheme_id"]: item for item in response.json()["recommendations"]}
        self.assertIn("TN-REV-002", recs)
        self.assertIn("benefit details", recs["TN-REV-002"]["rule_result"]["unverified_items"])


if __name__ == "__main__":
    unittest.main()
