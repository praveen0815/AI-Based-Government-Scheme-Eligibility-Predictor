"""System evaluation and API timing tests. Does not retrain or change existing contracts."""

from __future__ import annotations

import os
import unittest

from fastapi.testclient import TestClient

from app.db.session import check_database, load_database_env, reset_engine
from app.performance import classify_endpoint
from app.services.performance_service import get_performance_service, reset_performance_service

SENSITIVE_MARKERS = (
    "password",
    "password_hash",
    "access_token",
    "google_sub",
    "Authorization",
    "jwt",
)


def _postgres_ready() -> bool:
    load_database_env()
    test_url = (os.environ.get("TEST_DATABASE_URL") or "").strip()
    if not test_url:
        return False
    os.environ["SCHEME_PREDICTOR_USE_TEST_DB"] = "1"
    reset_engine()
    return check_database()


class PerformanceClassifierTests(unittest.TestCase):
    def test_maps_only_the_requested_research_endpoints(self) -> None:
        self.assertEqual(classify_endpoint("POST", "/api/v1/predict"), "/predict")
        self.assertEqual(classify_endpoint("POST", "/api/v1/recommend"), "/recommend")
        self.assertEqual(classify_endpoint("GET", "/api/v1/schemes"), "/schemes")
        self.assertEqual(classify_endpoint("GET", "/api/v1/insights"), "/insights")
        self.assertEqual(classify_endpoint("GET", "/api/v1/evaluation/overview"), "/evaluation")
        self.assertEqual(classify_endpoint("GET", "/api/v1/evaluation/hybrid"), "/evaluation")
        self.assertIsNone(classify_endpoint("GET", "/api/v1/catalog"))
        self.assertIsNone(classify_endpoint("GET", "/api/v1/system-evaluation"))
        self.assertIsNone(classify_endpoint("GET", "/health"))
        self.assertIsNone(classify_endpoint("GET", "/api/v1/schemes/TN-SW-001"))


class PerformanceApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        from app.main import app

        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def setUp(self) -> None:
        reset_performance_service()

    def test_unauthenticated_summary_returns_401(self) -> None:
        self.assertEqual(self.client.get("/api/v1/system-evaluation").status_code, 401)

    def test_openapi_lists_system_evaluation_route(self) -> None:
        paths = self.client.get("/openapi.json").json()["paths"]
        self.assertIn("/api/v1/system-evaluation", paths)
        self.assertIn("get", paths["/api/v1/system-evaluation"])
        self.assertIn("/api/v1/evaluation/overview", paths)
        self.assertIn("/api/v1/predict", paths)

    def test_existing_evaluation_contract_is_unchanged(self) -> None:
        response = self.client.get("/api/v1/evaluation/overview")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["dataset_citizen_count"], 5000)
        self.assertEqual(body["selected_model"], "Decision Tree")
        text = str(body).lower()
        for marker in SENSITIVE_MARKERS:
            self.assertNotIn(marker.lower(), text)

    def test_middleware_records_schemes_and_evaluation_without_secrets(self) -> None:
        schemes = self.client.get("/api/v1/schemes")
        self.assertEqual(schemes.status_code, 200)
        evaluation = self.client.get("/api/v1/evaluation/overview")
        self.assertEqual(evaluation.status_code, 200)
        insights = self.client.get("/api/v1/insights")
        self.assertEqual(insights.status_code, 401)

        snapshot = get_performance_service().snapshot()
        by_endpoint = {row["endpoint"]: row for row in snapshot["endpoints"]}
        self.assertEqual(by_endpoint["/schemes"]["request_count"], 1)
        self.assertEqual(by_endpoint["/schemes"]["error_count"], 0)
        self.assertGreaterEqual(by_endpoint["/schemes"]["average_ms"], 0)
        self.assertEqual(by_endpoint["/evaluation"]["request_count"], 1)
        self.assertEqual(by_endpoint["/insights"]["request_count"], 1)
        self.assertEqual(by_endpoint["/insights"]["error_count"], 1)
        self.assertEqual(by_endpoint["/predict"]["request_count"], 0)
        text = str(snapshot).lower()
        for marker in SENSITIVE_MARKERS:
            self.assertNotIn(marker.lower(), text)
        self.assertNotIn("wet_land", text)
        self.assertNotIn("aadhaar", text)


class PerformanceDatabaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        if not _postgres_ready():
            raise unittest.SkipTest("PostgreSQL test database is not configured or unavailable")
        from fastapi.testclient import TestClient

        from app.main import app

        reset_engine()
        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)
        reset_engine()

    def setUp(self) -> None:
        reset_performance_service()

    def _register_and_login(self) -> str:
        email = "perf.owner@example.com"
        self.client.post(
            "/api/v1/auth/register",
            json={"full_name": "Perf Owner", "email": email, "password": "research-pass"},
        )
        login = self.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "research-pass"},
        )
        if login.status_code != 200:
            self.skipTest("Authentication is unavailable in this test database")
        return login.json()["access_token"]

    def test_authenticated_summary_separates_ml_and_live_metrics(self) -> None:
        token = self._register_and_login()
        self.client.get("/api/v1/schemes")
        response = self.client.get(
            "/api/v1/system-evaluation",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("Academic Research Prototype", body["prototype_notice"])
        self.assertIn("not live API timings", body["ml_metrics_note"])
        self.assertIn("in-process", body["api_metrics_note"])
        self.assertEqual(body["dataset"]["dataset_citizen_count"], 5000)
        tree = next(item for item in body["models"] if item["selected"])
        self.assertEqual(tree["model"], "Decision Tree")
        self.assertIn("accuracy", tree)
        self.assertIn("agreement_percentage", body["hybrid"])
        endpoints = {row["endpoint"]: row for row in body["api_performance"]["endpoints"]}
        self.assertEqual(set(endpoints), {"/predict", "/recommend", "/schemes", "/evaluation", "/insights"})
        self.assertGreaterEqual(endpoints["/schemes"]["request_count"], 1)
        self.assertIn(body["health"]["status"], {"ok", "degraded"})
        self.assertTrue(body["health"]["model_loaded"])
        self.assertTrue(body["health"]["evaluation_ready"])
        text = str(body).lower()
        for marker in ("password_hash", "google_sub", "access_token", "wet_land"):
            self.assertNotIn(marker, text)
