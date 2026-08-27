"""Read-only evaluation API tests. Does not touch wallets or user accounts."""

from __future__ import annotations

import unittest

from fastapi.testclient import TestClient

from app.main import app

SENSITIVE_MARKERS = (
    "password",
    "password_hash",
    "access_token",
    "jwt",
    "Authorization",
    "user_id",
    "full_name",
)

CORE_IDS = {
    "TN-SW-001",
    "TN-SW-002",
    "TN-SW-004",
    "TN-SW-006",
    "TN-REV-001",
    "TN-REV-002",
}

MODEL_NAMES = {"Logistic Regression", "Decision Tree", "Random Forest"}


class EvaluationApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def _assert_public_and_safe(self, body: object) -> None:
        text = str(body).lower()
        for marker in SENSITIVE_MARKERS:
            self.assertNotIn(marker.lower(), text)

    def test_overview(self) -> None:
        response = self.client.get("/api/v1/evaluation/overview")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["dataset_citizen_count"], 5000)
        self.assertEqual(body["eligibility_record_count"], 30000)
        self.assertEqual(body["core_scheme_count"], 6)
        self.assertEqual(body["official_scheme_count"], 13)
        self.assertEqual(body["eligible_count"], 3653)
        self.assertEqual(body["not_eligible_count"], 26347)
        self.assertEqual(body["eligible_percentage"], 12.18)
        self.assertEqual(body["not_eligible_percentage"], 87.82)
        self.assertEqual(body["train_citizen_count"], 4000)
        self.assertEqual(body["test_citizen_count"], 1000)
        self.assertEqual(body["selected_model"], "Decision Tree")
        self.assertTrue(body["synthetic_data"])
        self.assertTrue(body["rule_derived_labels"])
        self._assert_public_and_safe(body)

    def test_models(self) -> None:
        response = self.client.get("/api/v1/evaluation/models")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        names = {item["model"] for item in body["models"]}
        self.assertEqual(names, MODEL_NAMES)
        tree = next(item for item in body["models"] if item["model"] == "Decision Tree")
        self.assertTrue(tree["selected"])
        for field in ("accuracy", "precision", "recall", "f1", "balanced_accuracy", "roc_auc", "pr_auc"):
            self.assertIn(field, tree)
        self.assertEqual(tree["f1"], 1.0)
        self._assert_public_and_safe(body)

    def test_schemes(self) -> None:
        response = self.client.get("/api/v1/evaluation/schemes")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        ids = {item["scheme_id"] for item in body["schemes"]}
        self.assertEqual(ids, CORE_IDS)
        self.assertEqual(len(body["schemes"]), 6)
        pudhumai = next(item for item in body["schemes"] if item["scheme_id"] == "TN-SW-001")
        self.assertEqual(pudhumai["eligible_count"], 445)
        self.assertTrue(pudhumai["scheme_name"])
        self.assertTrue(body["model_performance"])
        self._assert_public_and_safe(body)

    def test_features(self) -> None:
        response = self.client.get("/api/v1/evaluation/features")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["decision_tree_importance"])
        self.assertTrue(body["logistic_regression_coefficients"])
        self.assertTrue(body["random_forest_importance"])
        self.assertIn("not causal", body["note"].lower())
        self._assert_public_and_safe(body)

    def test_confusion_matrix(self) -> None:
        response = self.client.get("/api/v1/evaluation/confusion-matrix")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        names = {item["model"] for item in body["matrices"]}
        self.assertEqual(names, MODEL_NAMES)
        tree = next(item for item in body["matrices"] if item["model"] == "Decision Tree")
        self.assertEqual(tree["true_negative"], 5269)
        self.assertEqual(tree["false_positive"], 0)
        self.assertEqual(tree["false_negative"], 0)
        self.assertEqual(tree["true_positive"], 731)
        self._assert_public_and_safe(body)

    def test_limitations(self) -> None:
        response = self.client.get("/api/v1/evaluation/limitations")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("academic AI research prototype", body["prototype_notice"])
        ids = {item["id"] for item in body["limitations"]}
        self.assertIn("synthetic", ids)
        self.assertIn("rule_labels", ids)
        self.assertIn("no_outcomes", ids)
        self.assertEqual(len(body["official_sources"]), 6)
        self._assert_public_and_safe(body)

    def test_openapi_lists_evaluation_routes(self) -> None:
        spec = self.client.get("/openapi.json").json()
        paths = spec["paths"]
        self.assertIn("/api/v1/evaluation/overview", paths)
        self.assertIn("/api/v1/evaluation/models", paths)
        self.assertIn("/api/v1/evaluation/schemes", paths)
        self.assertIn("/api/v1/evaluation/features", paths)
        self.assertIn("/api/v1/evaluation/confusion-matrix", paths)
        self.assertIn("/api/v1/evaluation/limitations", paths)
        self.assertIn("/api/v1/evaluation/hybrid", paths)

    def test_existing_public_apis_still_work(self) -> None:
        self.assertEqual(self.client.get("/health").status_code, 200)
        self.assertEqual(self.client.get("/api/v1/schemes").status_code, 200)


if __name__ == "__main__":
    unittest.main()
