"""Hybrid documented-rule + Decision Tree tests. Does not modify datasets."""

from __future__ import annotations

import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.services.hybrid_prediction_service import AGREE_TEXT, DISAGREE_REVIEW_TEXT
from app.services.rule_engine_service import evaluate_documented_rule

ELIGIBLE_PUDHUMAI = {
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

NOT_ELIGIBLE_PUDHUMAI = {**ELIGIBLE_PUDHUMAI, "gender": "male"}


class RuleEngineTests(unittest.TestCase):
    def test_rule_engine_eligible_case(self) -> None:
        result = evaluate_documented_rule("TN-SW-001", ELIGIBLE_PUDHUMAI)
        self.assertTrue(result.rule_eligible)
        self.assertTrue(result.rule_reasons)
        self.assertTrue(any("female" in reason for reason in result.rule_reasons))

    def test_rule_engine_non_eligible_case(self) -> None:
        result = evaluate_documented_rule("TN-SW-001", NOT_ELIGIBLE_PUDHUMAI)
        self.assertFalse(result.rule_eligible)
        self.assertTrue(any("female" in reason for reason in result.rule_reasons))


class HybridApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def test_predict_hybrid_agreement(self) -> None:
        response = self.client.post(
            "/api/v1/predict",
            json={**ELIGIBLE_PUDHUMAI, "scheme_id": "TN-SW-001"},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["prediction"], "eligible")
        self.assertEqual(body["ml_prediction"], "eligible")
        self.assertTrue(body["agreement"])
        self.assertTrue(body["rule_result"]["eligible"])
        self.assertEqual(body["rule_reasons"], body["rule_result"]["reasons"])
        self.assertIn(AGREE_TEXT, body["explanation"])
        self.assertIn("Documented scheme conditions satisfied", body["explanation"])
        self.assertIn("Decision Tree prediction", body["explanation"])
        self.assertNotIn("government confidence", body["explanation"].lower())

    def test_predict_hybrid_non_eligible(self) -> None:
        response = self.client.post(
            "/api/v1/predict",
            json={**NOT_ELIGIBLE_PUDHUMAI, "scheme_id": "TN-SW-001"},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["prediction"], "not_eligible")
        self.assertFalse(body["rule_result"]["eligible"])
        self.assertTrue(body["agreement"])

    def test_predict_disagreement_keeps_rule_as_reference(self) -> None:
        with patch(
            "app.services.hybrid_prediction_service.explain_citizen_prediction",
            return_value={
                "prediction": "not_eligible",
                "probability_eligible": 0.12,
                "probability_not_eligible": 0.88,
                "human_readable": "Decision Tree predicted not eligible.",
            },
        ):
            response = self.client.post(
                "/api/v1/predict",
                json={**ELIGIBLE_PUDHUMAI, "scheme_id": "TN-SW-001"},
            )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["prediction"], "eligible")
        self.assertEqual(body["ml_prediction"], "not_eligible")
        self.assertFalse(body["agreement"])
        self.assertTrue(body["rule_result"]["eligible"])
        self.assertIn(DISAGREE_REVIEW_TEXT, body["explanation"])
        self.assertAlmostEqual(body["eligible_probability"], 0.12)

    def test_recommend_hybrid_uses_rule_reference(self) -> None:
        response = self.client.post("/api/v1/recommend", json=ELIGIBLE_PUDHUMAI)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["total_schemes_evaluated"], 6)
        self.assertIn("TN-SW-001", [item["scheme_id"] for item in body["recommendations"]])
        item = next(row for row in body["recommendations"] if row["scheme_id"] == "TN-SW-001")
        self.assertEqual(item["prediction"], "eligible")
        self.assertTrue(item["rule_result"]["eligible"])
        self.assertTrue(item["agreement"])
        self.assertEqual(item["ml_prediction"], "eligible")
        evaluated = next(row for row in body["evaluated_schemes"] if row["scheme_id"] == "TN-SW-001")
        self.assertTrue(evaluated["rule_eligible"])
        self.assertTrue(evaluated["agreement"])

    def test_recommend_disagreement_still_returns_rule_eligible(self) -> None:
        with patch(
            "app.services.hybrid_prediction_service.explain_citizen_prediction",
            return_value={
                "prediction": "not_eligible",
                "probability_eligible": 0.2,
                "probability_not_eligible": 0.8,
                "human_readable": "Decision Tree predicted not eligible.",
            },
        ):
            response = self.client.post("/api/v1/recommend", json=ELIGIBLE_PUDHUMAI)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("TN-SW-001", [item["scheme_id"] for item in body["recommendations"]])
        item = next(row for row in body["recommendations"] if row["scheme_id"] == "TN-SW-001")
        self.assertTrue(item["rule_result"]["eligible"])
        self.assertEqual(item["ml_prediction"], "not_eligible")
        self.assertFalse(item["agreement"])

    def test_invalid_input_still_422(self) -> None:
        response = self.client.post(
            "/api/v1/predict",
            json={**ELIGIBLE_PUDHUMAI, "age": 150, "scheme_id": "TN-SW-001"},
        )
        self.assertEqual(response.status_code, 422)

    def test_hybrid_evaluation_endpoint(self) -> None:
        response = self.client.get("/api/v1/evaluation/hybrid")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["agreement_count"], 6000)
        self.assertEqual(body["disagreement_count"], 0)
        self.assertEqual(body["agreement_percentage"], 100.0)
        self.assertIn("synthetic research data", body["note"].lower())
        self.assertNotIn("password", str(body).lower())

    def test_existing_public_endpoints_still_work(self) -> None:
        self.assertEqual(self.client.get("/api/v1/schemes").status_code, 200)
        self.assertEqual(self.client.get("/api/v1/auth/me").status_code, 401)


if __name__ == "__main__":
    unittest.main()
