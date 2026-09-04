"""Read-only catalog search tests. Does not change /predict or /recommend."""

from __future__ import annotations

import unittest

from fastapi.testclient import TestClient

from app.main import app
from app.schemas.catalog import UNSPECIFIED_FILTER


class CatalogSearchTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def test_catalog_lists_all_official_rows(self) -> None:
        response = self.client.get("/api/v1/catalog")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["total_catalog_count"], 13)
        self.assertEqual(body["scheme_count"], 13)
        self.assertEqual(len(body["schemes"]), 13)
        scopes = {item["ml_scope"] for item in body["schemes"]}
        self.assertEqual(scopes, {"CORE", "ADVANCED", "HOLD"})
        self.assertIn("CORE", body["filters"]["ml_scopes"])
        self.assertTrue(any(item["scheme_id"] == "TN-SW-001" for item in body["schemes"]))
        self.assertTrue(any(item["scheme_id"] == "TN-HFW-001" for item in body["schemes"]))
        self.assertIn("does not predict eligibility", body["disclaimer"].lower())

    def test_existing_core_catalog_contract_is_unchanged(self) -> None:
        response = self.client.get("/api/v1/schemes")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["scheme_count"], 6)
        self.assertTrue(all(item["ml_scope"] == "CORE" for item in body["schemes"]))
        self.assertNotIn("gender_requirement", body["schemes"][0])

    def test_search_matches_scheme_id_or_name(self) -> None:
        by_id = self.client.get("/api/v1/catalog", params={"q": "TN-REV-001"})
        self.assertEqual(by_id.status_code, 200)
        self.assertEqual(by_id.json()["scheme_count"], 1)
        self.assertEqual(by_id.json()["schemes"][0]["scheme_id"], "TN-REV-001")

        by_name = self.client.get("/api/v1/catalog", params={"q": "Pudhumai Penn"})
        self.assertEqual(by_name.status_code, 200)
        self.assertEqual(by_name.json()["scheme_count"], 1)
        self.assertEqual(by_name.json()["schemes"][0]["scheme_id"], "TN-SW-001")

    def test_filters_use_catalog_values_only(self) -> None:
        core = self.client.get("/api/v1/catalog", params={"ml_scope": "CORE"})
        self.assertEqual(core.json()["scheme_count"], 6)
        self.assertTrue(all(item["ml_scope"] == "CORE" for item in core.json()["schemes"]))

        female = self.client.get("/api/v1/catalog", params={"gender": "Female"})
        self.assertGreaterEqual(female.json()["scheme_count"], 1)
        self.assertTrue(all(item["gender_requirement"] == "Female" for item in female.json()["schemes"]))

        unspecified = self.client.get("/api/v1/catalog", params={"student": UNSPECIFIED_FILTER})
        self.assertGreaterEqual(unspecified.json()["scheme_count"], 1)
        self.assertTrue(all(item["student_status_requirement"] is None for item in unspecified.json()["schemes"]))

    def test_openapi_lists_catalog_route(self) -> None:
        paths = self.client.get("/openapi.json").json()["paths"]
        self.assertIn("/api/v1/catalog", paths)
        self.assertIn("get", paths["/api/v1/catalog"])
        self.assertIn("/api/v1/schemes", paths)


if __name__ == "__main__":
    unittest.main()
