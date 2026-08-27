"""API tests for the Phase 6 prediction service. Does not modify the dataset."""

from __future__ import annotations

import unittest
from unittest.mock import patch

import pandas as pd
from fastapi.testclient import TestClient

from app.main import app
from app.paths import project_root
from app.schemas.prediction import API_DISCLAIMER
from app.services.model_service import (
    MODEL_DISPLAY_NAME,
    ModelUnavailableError,
    get_model_service,
)

ELIGIBLE_PUDHUMAI = {
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
    "scheme_id": "TN-SW-001",
}

NOT_ELIGIBLE_PUDHUMAI = {**ELIGIBLE_PUDHUMAI, "gender": "male"}

RESPONSE_KEYS = {
    "scheme_id",
    "prediction",
    "eligible_probability",
    "not_eligible_probability",
    "explanation",
    "model_name",
    "disclaimer",
    "rule_result",
    "rule_reasons",
    "ml_prediction",
    "agreement",
}


class PredictionApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def test_health_endpoint(self) -> None:
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn(body["status"], {"ok", "degraded"})
        self.assertIn(body["database"], {"connected", "unavailable"})
        self.assertNotIn("postgresql", str(body).lower())
        self.assertNotIn("password", str(body).lower())

    def test_valid_eligible_shaped_citizen(self) -> None:
        response = self.client.post("/api/v1/predict", json=ELIGIBLE_PUDHUMAI)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["scheme_id"], "TN-SW-001")
        self.assertEqual(body["prediction"], "eligible")
        self.assertEqual(body["model_name"], MODEL_DISPLAY_NAME)
        self.assertIn("female", body["explanation"])
        self.assertIn("government_6_to_12", body["explanation"])

    def test_valid_non_eligible_citizen(self) -> None:
        response = self.client.post("/api/v1/predict", json=NOT_ELIGIBLE_PUDHUMAI)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["prediction"], "not_eligible")
        self.assertIn("male", body["explanation"])

    def test_invalid_age(self) -> None:
        payload = {**ELIGIBLE_PUDHUMAI, "age": 150}
        response = self.client.post("/api/v1/predict", json=payload)
        self.assertEqual(response.status_code, 422)
        self.assertIn("detail", response.json())

    def test_negative_land(self) -> None:
        payload = {**ELIGIBLE_PUDHUMAI, "wet_land_acres": -1}
        response = self.client.post("/api/v1/predict", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_invalid_scheme_id(self) -> None:
        payload = {**ELIGIBLE_PUDHUMAI, "scheme_id": "TN-FAKE-001"}
        response = self.client.post("/api/v1/predict", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_missing_required_field(self) -> None:
        payload = {key: value for key, value in ELIGIBLE_PUDHUMAI.items() if key != "gender"}
        response = self.client.post("/api/v1/predict", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_prediction_response_schema(self) -> None:
        response = self.client.post("/api/v1/predict", json=ELIGIBLE_PUDHUMAI)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(set(body.keys()), RESPONSE_KEYS)
        self.assertEqual(body["disclaimer"], API_DISCLAIMER)
        self.assertIsInstance(body["explanation"], str)
        self.assertTrue(body["explanation"])

    def test_probability_values_between_0_and_1(self) -> None:
        response = self.client.post("/api/v1/predict", json=ELIGIBLE_PUDHUMAI)
        body = response.json()
        self.assertGreaterEqual(body["eligible_probability"], 0.0)
        self.assertLessEqual(body["eligible_probability"], 1.0)
        self.assertGreaterEqual(body["not_eligible_probability"], 0.0)
        self.assertLessEqual(body["not_eligible_probability"], 1.0)

    def test_probabilities_sum_approximately_to_1(self) -> None:
        response = self.client.post("/api/v1/predict", json=ELIGIBLE_PUDHUMAI)
        body = response.json()
        total = body["eligible_probability"] + body["not_eligible_probability"]
        self.assertAlmostEqual(total, 1.0, places=3)

    def test_model_info_hides_filesystem_paths(self) -> None:
        response = self.client.get("/api/v1/model-info")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["model_name"], MODEL_DISPLAY_NAME)
        self.assertEqual(body["supported_scheme_count"], 6)
        self.assertEqual(len(body["supported_scheme_ids"]), 6)
        self.assertNotIn("C:\\", body["model_artifact"])
        self.assertNotIn("/Users/", body["model_artifact"])
        self.assertNotIn("Desktop", body["model_version"])

    def test_openapi_exposes_predict_schemas(self) -> None:
        response = self.client.get("/openapi.json")
        self.assertEqual(response.status_code, 200)
        spec = response.json()
        self.assertIn("/api/v1/predict", spec["paths"])
        self.assertIn("post", spec["paths"]["/api/v1/predict"])
        schemas = spec["components"]["schemas"]
        self.assertIn("PredictionRequest", schemas)
        self.assertIn("PredictionResponse", schemas)

    def test_api_matches_rule_derived_dataset_rows(self) -> None:
        dataset_path = project_root() / "dataset" / "processed" / "eligibility_dataset.csv"
        frame = pd.read_csv(dataset_path)
        eligible_row = frame[(frame["scheme_id"] == "TN-SW-001") & (frame["eligible"] == 1)].iloc[0]
        not_eligible_row = frame[
            (frame["scheme_id"] == "TN-SW-001") & (frame["eligible"] == 0)
        ].iloc[0]

        for row in (eligible_row, not_eligible_row):
            payload = {
                "age": int(row["age"]),
                "gender": str(row["gender"]),
                "is_student": bool(row["is_student"]),
                "first_higher_education_course": bool(row["first_higher_education_course"]),
                "school_background": str(row["school_background"]),
                "marital_status": str(row["marital_status"]),
                "is_orphan": bool(row["is_orphan"]),
                "is_destitute": bool(row["is_destitute"]),
                "occupation_category": str(row["occupation_category"]),
                "wet_land_acres": float(row["wet_land_acres"]),
                "dry_land_acres": float(row["dry_land_acres"]),
                "scheme_id": str(row["scheme_id"]),
            }
            response = self.client.post("/api/v1/predict", json=payload)
            self.assertEqual(response.status_code, 200)
            expected = "eligible" if int(row["eligible"]) == 1 else "not_eligible"
            self.assertEqual(response.json()["prediction"], expected)

    def test_model_unavailable_returns_503(self) -> None:
        service = get_model_service()
        with patch.object(
            service,
            "pipeline",
            side_effect=ModelUnavailableError("The prediction model is not loaded."),
        ):
            response = self.client.post("/api/v1/predict", json=ELIGIBLE_PUDHUMAI)
        self.assertEqual(response.status_code, 503)
        self.assertIn("detail", response.json())


if __name__ == "__main__":
    unittest.main()
