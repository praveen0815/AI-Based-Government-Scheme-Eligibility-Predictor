"""API tests for Phase 7 multi-scheme recommendation. Does not modify datasets."""

from __future__ import annotations

import unittest
from unittest.mock import patch

import pandas as pd
from fastapi.testclient import TestClient

from app.main import app
from app.paths import project_root
from app.schemas.recommendation import RANKING_RULE, RECOMMENDATION_DISCLAIMER
from app.services.model_service import ModelUnavailableError, get_model_service
from app.services.scheme_service import CatalogUnavailableError, get_scheme_service

NON_CORE_SCHEME_IDS = {
    "TN-SW-003",
    "TN-KMUT-001",
    "TN-SW-005",
    "TN-SW-007",
    "TN-HFW-001",
    "TN-REV-003",
    "TN-DAW-001",
}

PUDHUMAI_CITIZEN = {
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

TAMIL_PUDHALVAN_CITIZEN = {
    **PUDHUMAI_CITIZEN,
    "gender": "male",
    "school_background": "government_or_aided_tamil_medium_6_to_12",
}

UZHAVAR_CITIZEN = {
    "age": 40,
    "gender": "male",
    "is_student": False,
    "first_higher_education_course": False,
    "school_background": "other",
    "marital_status": "married",
    "is_orphan": False,
    "is_destitute": False,
    "occupation_category": "agricultural_labourer",
    "wet_land_acres": 1.0,
    "dry_land_acres": 0.0,
}

ZERO_ELIGIBLE_CITIZEN = {
    "age": 10,
    "gender": "male",
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

MULTIPLE_ELIGIBLE_CITIZEN = {
    **PUDHUMAI_CITIZEN,
    "is_orphan": True,
}

RECOMMENDATION_KEYS = {
    "scheme_id",
    "scheme_name",
    "department",
    "scheme_category",
    "description",
    "prediction",
    "status_label",
    "eligible_probability",
    "not_eligible_probability",
    "reason",
    "benefit",
    "required_documents",
    "application_method",
    "official_source_url",
    "rule_result",
    "rule_reasons",
    "ml_prediction",
    "agreement",
}


def _recommended_ids(body: dict) -> list[str]:
    return [item["scheme_id"] for item in body["recommendations"]]


def _evaluated_ids(body: dict) -> list[str]:
    return [item["scheme_id"] for item in body["evaluated_schemes"]]


class RecommendationApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()
        cls.catalog = pd.read_csv(
            project_root() / "dataset" / "raw" / "schemes.csv",
            dtype=str,
            keep_default_na=False,
        )

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def test_pudhumai_penn_appears_in_recommendations(self) -> None:
        response = self.client.post("/api/v1/recommend", json=PUDHUMAI_CITIZEN)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("TN-SW-001", _recommended_ids(body))
        item = next(row for row in body["recommendations"] if row["scheme_id"] == "TN-SW-001")
        self.assertEqual(item["prediction"], "eligible")
        self.assertEqual(item["status_label"], "Predicted eligible")
        self.assertIn("female", item["reason"])
        self.assertIn("government_6_to_12", item["reason"])

    def test_tamil_pudhalvan_appears_when_appropriate(self) -> None:
        response = self.client.post("/api/v1/recommend", json=TAMIL_PUDHALVAN_CITIZEN)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("TN-SW-002", _recommended_ids(body))
        self.assertNotIn("TN-SW-001", _recommended_ids(body))

    def test_uzhavar_pathukappu_appears_when_appropriate(self) -> None:
        response = self.client.post("/api/v1/recommend", json=UZHAVAR_CITIZEN)
        self.assertEqual(response.status_code, 200)
        self.assertIn("TN-REV-001", _recommended_ids(response.json()))

    def test_zero_eligible_schemes(self) -> None:
        response = self.client.post("/api/v1/recommend", json=ZERO_ELIGIBLE_CITIZEN)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["eligible_scheme_count"], 0)
        self.assertEqual(body["recommendations"], [])
        self.assertEqual(body["total_schemes_evaluated"], 6)

    def test_exactly_six_core_schemes_evaluated(self) -> None:
        response = self.client.post("/api/v1/recommend", json=PUDHUMAI_CITIZEN)
        body = response.json()
        self.assertEqual(body["total_schemes_evaluated"], 6)
        self.assertEqual(len(body["evaluated_schemes"]), 6)
        self.assertEqual(
            _evaluated_ids(body),
            [
                "TN-SW-001",
                "TN-SW-002",
                "TN-SW-004",
                "TN-SW-006",
                "TN-REV-001",
                "TN-REV-002",
            ],
        )

    def test_advanced_and_hold_schemes_never_appear(self) -> None:
        response = self.client.post("/api/v1/recommend", json=MULTIPLE_ELIGIBLE_CITIZEN)
        body = response.json()
        seen = set(_recommended_ids(body)) | set(_evaluated_ids(body))
        self.assertTrue(seen.isdisjoint(NON_CORE_SCHEME_IDS))

        catalog = self.client.get("/api/v1/schemes")
        self.assertEqual(catalog.status_code, 200)
        catalog_ids = {item["scheme_id"] for item in catalog.json()["schemes"]}
        self.assertTrue(catalog_ids.isdisjoint(NON_CORE_SCHEME_IDS))
        self.assertEqual(catalog.json()["scheme_count"], 6)

    def test_recommendations_contain_required_metadata(self) -> None:
        response = self.client.post("/api/v1/recommend", json=PUDHUMAI_CITIZEN)
        body = response.json()
        self.assertGreaterEqual(body["eligible_scheme_count"], 1)
        for item in body["recommendations"]:
            self.assertEqual(set(item.keys()), RECOMMENDATION_KEYS)
            self.assertEqual(item["prediction"], "eligible")
            self.assertTrue(item["scheme_name"])
            self.assertTrue(item["reason"])
            self.assertNotIn("You are officially eligible", item["reason"])

    def test_official_source_url_comes_from_catalog(self) -> None:
        response = self.client.post("/api/v1/recommend", json=PUDHUMAI_CITIZEN)
        item = next(
            row
            for row in response.json()["recommendations"]
            if row["scheme_id"] == "TN-SW-001"
        )
        expected = self.catalog.loc[
            self.catalog["scheme_id"] == "TN-SW-001", "official_source_url"
        ].iloc[0]
        self.assertEqual(item["official_source_url"], expected)
        self.assertTrue(str(expected).startswith("http"))

    def test_deterministic_ordering(self) -> None:
        first = self.client.post("/api/v1/recommend", json=MULTIPLE_ELIGIBLE_CITIZEN)
        second = self.client.post("/api/v1/recommend", json=MULTIPLE_ELIGIBLE_CITIZEN)
        self.assertEqual(first.status_code, 200)
        self.assertEqual(_recommended_ids(first.json()), _recommended_ids(second.json()))
        self.assertEqual(first.json()["ranking_rule"], RANKING_RULE)
        ids = _recommended_ids(first.json())
        self.assertGreaterEqual(len(ids), 2)
        ranked = first.json()["recommendations"]
        pairs = [
            (-item["eligible_probability"], item["scheme_id"]) for item in ranked
        ]
        self.assertEqual(pairs, sorted(pairs))

    def test_predict_still_works(self) -> None:
        payload = {**PUDHUMAI_CITIZEN, "scheme_id": "TN-SW-001"}
        response = self.client.post("/api/v1/predict", json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["scheme_id"], "TN-SW-001")
        self.assertEqual(response.json()["prediction"], "eligible")

    def test_invalid_citizen_input_returns_422(self) -> None:
        cases = [
            {**PUDHUMAI_CITIZEN, "age": 150},
            {**PUDHUMAI_CITIZEN, "age": -1},
            {**PUDHUMAI_CITIZEN, "wet_land_acres": -0.5},
            {**PUDHUMAI_CITIZEN, "gender": "unknown"},
            {key: value for key, value in PUDHUMAI_CITIZEN.items() if key != "age"},
        ]
        for payload in cases:
            response = self.client.post("/api/v1/recommend", json=payload)
            self.assertEqual(response.status_code, 422, msg=payload)

    def test_recommend_does_not_require_scheme_id(self) -> None:
        response = self.client.post("/api/v1/recommend", json=PUDHUMAI_CITIZEN)
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("scheme_id", PUDHUMAI_CITIZEN)

    def test_one_and_multiple_eligible_counts(self) -> None:
        single = self.client.post("/api/v1/recommend", json=TAMIL_PUDHALVAN_CITIZEN).json()
        multiple = self.client.post("/api/v1/recommend", json=MULTIPLE_ELIGIBLE_CITIZEN).json()
        self.assertEqual(single["eligible_scheme_count"], 1)
        self.assertGreaterEqual(multiple["eligible_scheme_count"], 2)
        self.assertTrue(all(item["prediction"] == "eligible" for item in multiple["recommendations"]))

    def test_disclaimer_and_openapi(self) -> None:
        response = self.client.post("/api/v1/recommend", json=PUDHUMAI_CITIZEN)
        self.assertEqual(response.json()["disclaimer"], RECOMMENDATION_DISCLAIMER)
        spec = self.client.get("/openapi.json").json()
        self.assertIn("/api/v1/recommend", spec["paths"])
        self.assertIn("/api/v1/schemes", spec["paths"])
        self.assertIn("/api/v1/predict", spec["paths"])
        self.assertIn("RecommendRequest", spec["components"]["schemas"])
        self.assertNotIn("scheme_id", spec["components"]["schemas"]["RecommendRequest"]["properties"])

    def test_needs_verification_is_not_rewritten(self) -> None:
        response = self.client.post("/api/v1/recommend", json=PUDHUMAI_CITIZEN)
        item = next(
            row
            for row in response.json()["recommendations"]
            if row["scheme_id"] == "TN-SW-001"
        )
        catalog_docs = self.catalog.loc[
            self.catalog["scheme_id"] == "TN-SW-001", "required_documents"
        ].iloc[0]
        self.assertEqual(item["required_documents"], catalog_docs)
        if catalog_docs == "NEEDS VERIFICATION":
            self.assertEqual(item["required_documents"], "NEEDS VERIFICATION")

    def test_model_unavailable_returns_503(self) -> None:
        service = get_model_service()
        with patch.object(
            service,
            "pipeline",
            side_effect=ModelUnavailableError("The prediction model is not loaded."),
        ):
            response = self.client.post("/api/v1/recommend", json=PUDHUMAI_CITIZEN)
        self.assertEqual(response.status_code, 503)

    def test_catalog_unavailable_returns_503(self) -> None:
        service = get_scheme_service()
        with patch.object(
            service,
            "require_core",
            side_effect=CatalogUnavailableError("CORE scheme metadata is missing."),
        ):
            response = self.client.post("/api/v1/recommend", json=PUDHUMAI_CITIZEN)
        self.assertEqual(response.status_code, 503)


if __name__ == "__main__":
    unittest.main()
