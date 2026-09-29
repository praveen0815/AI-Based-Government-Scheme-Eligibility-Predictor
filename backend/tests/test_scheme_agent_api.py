"""Scheme agent tests. The agent coordinates existing APIs and does not score eligibility itself."""

from __future__ import annotations

import os
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

from app.schemas.applications import ApplicationItem, ApplicationListResponse
from app.schemas.completeness import ProfileCompletenessResponse
from app.schemas.documents import DocumentProgressResponse, SchemeDocumentSummary
from app.schemas.readiness import ReadinessProgressResponse
from app.schemas.recommendation import RecommendResponse
from app.schemas.scheme_agent import AgentRunRequest
from app.schemas.scheme_assistant import AssistantHistoryTurn
from app.schemas.uploads import SupportingUploadListResponse
from app.schemas.wallet import CitizenWalletResponse
from app.services.llm_service import LlmUnavailableError, set_llm_provider
from app.services.scheme_agent_service import classify_intent, run_agent
from app.services.scheme_agent_tools import AgentToolRejectedError, run_tool, set_recommend_fn


WALLET = CitizenWalletResponse(
    citizen_id="11111111-2222-3333-4444-555555555555",
    age=20,
    gender="female",
    is_student=True,
    first_higher_education_course=True,
    school_background="government_6_to_12",
    marital_status="never_married",
    is_orphan=False,
    is_destitute=False,
    occupation_category="other",
    wet_land_acres=0.0,
    dry_land_acres=0.0,
    created_at=datetime(2026, 8, 14, tzinfo=timezone.utc),
    updated_at=datetime(2026, 8, 14, tzinfo=timezone.utc),
)


def _recommend_payload() -> RecommendResponse:
    return RecommendResponse(
        total_schemes_evaluated=6,
        eligible_scheme_count=1,
        ranking_rule="eligible_probability descending, then scheme_id ascending",
        recommendations=[],
        evaluated_schemes=[
            {
                "scheme_id": "TN-SW-001",
                "scheme_name": "Pudhumai Penn",
                "prediction": "eligible",
                "eligible_probability": 1.0,
                "not_eligible_probability": 0.0,
                "reason": "Predicted eligible because documented student conditions were met.",
                "rule_eligible": True,
                "ml_prediction": "eligible",
                "agreement": True,
            }
        ],
        disclaimer="A prediction is not government approval or a final eligibility determination.",
    )


class RecordingProvider:
    def __init__(self, reply: str = "Tool results say the wallet is complete.") -> None:
        self.user = ""
        self.calls = 0
        self.reply = reply

    def generate(self, *, system: str, user: str) -> str:
        self.calls += 1
        self.user = user
        return self.reply


class FailingProvider:
    def generate(self, *, system: str, user: str) -> str:
        _ = system, user
        raise LlmUnavailableError("provider down")


class SchemeAgentServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self._url = os.environ.pop("ASSISTANT_LLM_API_URL", None)
        self._key = os.environ.pop("ASSISTANT_LLM_API_KEY", None)
        set_llm_provider(None)
        set_recommend_fn(None)

    def tearDown(self) -> None:
        set_llm_provider(None)
        set_recommend_fn(None)
        if self._url is None:
            os.environ.pop("ASSISTANT_LLM_API_URL", None)
        else:
            os.environ["ASSISTANT_LLM_API_URL"] = self._url
        if self._key is None:
            os.environ.pop("ASSISTANT_LLM_API_KEY", None)
        else:
            os.environ["ASSISTANT_LLM_API_KEY"] = self._key

    def test_classifies_each_supported_intent(self) -> None:
        cases = {
            "Check my profile completeness": "PROFILE_COMPLETENESS",
            "Find schemes for me": "FIND_SCHEMES",
            "Check my eligibility": "CHECK_ELIGIBILITY",
            "What documents are missing?": "DOCUMENT_READINESS",
            "Show my application status": "APPLICATION_STATUS",
            "What is this scheme about?": "EXPLAIN_SCHEME",
            "What documents are required for Pudhumai Penn?": "EXPLAIN_SCHEME",
            "What can you do?": "GENERAL_HELP",
            "Hello there": "CLARIFY",
            "Submit my application to the government": "UNSUPPORTED",
        }
        for message, intent in cases.items():
            with self.subTest(message=message):
                self.assertEqual(classify_intent(message), intent)

    def test_write_tools_are_rejected(self) -> None:
        with self.assertRaises(AgentToolRejectedError):
            run_tool("update_wallet", session=None, user_id="user-1")
        with self.assertRaises(AgentToolRejectedError):
            run_tool("submit_application", session=None, user_id="user-1")
        with self.assertRaises(AgentToolRejectedError):
            run_tool("not_a_real_tool", session=None, user_id="user-1")

    def test_profile_completeness_uses_existing_wallet_fields_only(self) -> None:
        with patch("app.services.scheme_agent_tools.get_wallet_for_user", return_value=WALLET):
            with patch(
                "app.services.scheme_agent_tools.calculate_profile_completeness",
                return_value=ProfileCompletenessResponse(
                    percentage=82, completed_fields=9, total_fields=11, incomplete_fields=["occupation_category"]
                ),
            ):
                response = run_agent(object(), "owner-1", AgentRunRequest(message="Check my profile completeness"))
        self.assertEqual(response.intent, "PROFILE_COMPLETENESS")
        self.assertIn("get_profile_completeness", response.tools_used)
        self.assertIn("occupation_category", response.reply)
        self.assertTrue(any(action.path == "/wallet" for action in response.actions))
        self.assertNotIn(WALLET.citizen_id, response.reply)

    def test_find_schemes_uses_catalog_knowledge_not_eligibility(self) -> None:
        response = run_agent(None, "owner-1", AgentRunRequest(message="Find schemes for me"))
        self.assertEqual(response.intent, "FIND_SCHEMES")
        self.assertIn("search_schemes", response.tools_used)
        self.assertIn("TN-SW-001", response.reply)
        self.assertIn("not an eligibility", response.reply.lower())
        self.assertTrue(any(item.source_url for item in response.sources))

    def test_eligibility_comes_only_from_existing_recommender(self) -> None:
        called = {"n": 0}

        def fake_recommend(citizen: dict) -> RecommendResponse:
            called["n"] += 1
            self.assertEqual(citizen["age"], 20)
            payload = _recommend_payload()
            payload.recommendations = []
            return RecommendResponse(
                total_schemes_evaluated=6,
                eligible_scheme_count=1,
                ranking_rule=payload.ranking_rule,
                recommendations=[
                    {
                        "scheme_id": "TN-SW-001",
                        "scheme_name": "Pudhumai Penn",
                        "department": "Social Welfare",
                        "prediction": "eligible",
                        "status_label": "Predicted eligible",
                        "eligible_probability": 1.0,
                        "not_eligible_probability": 0.0,
                        "reason": "Predicted eligible because documented student conditions were met.",
                        "official_source_url": "https://www.tnsocialwelfare.tn.gov.in/en/specilisationswoman-welfare/pudhumai-penn",
                        "rule_result": {
                            "eligible": True,
                            "reasons": ["student"],
                            "rule_status": "verified",
                            "verification_notes": None,
                        },
                        "rule_reasons": ["student"],
                        "ml_prediction": "eligible",
                        "agreement": True,
                    }
                ],
                evaluated_schemes=payload.evaluated_schemes,
                disclaimer=payload.disclaimer,
            )

        set_recommend_fn(fake_recommend)
        with patch("app.services.scheme_agent_tools.get_wallet_for_user", return_value=WALLET):
            response = run_agent(object(), "owner-1", AgentRunRequest(message="Check my eligibility"))
        self.assertEqual(called["n"], 1)
        self.assertEqual(response.intent, "CHECK_ELIGIBILITY")
        self.assertIn("check_eligibility", response.tools_used)
        self.assertIn("Predicted eligible", response.reply)
        self.assertIn("not government approval", response.reply.lower())
        self.assertTrue(any(action.path == "/check" for action in response.actions))

    def test_eligibility_without_wallet_does_not_invent_a_result(self) -> None:
        with patch("app.services.scheme_agent_tools.get_wallet_for_user", return_value=None):
            response = run_agent(object(), "owner-1", AgentRunRequest(message="Am I eligible?"))
        self.assertEqual(response.intent, "CHECK_ELIGIBILITY")
        self.assertIn("no data wallet", response.reply.lower())
        self.assertNotIn("you are officially approved", response.reply.lower())
        self.assertTrue(any(action.path == "/wallet" for action in response.actions))

    def test_document_readiness_uses_existing_states(self) -> None:
        progress = DocumentProgressResponse(
            schemes=[
                SchemeDocumentSummary(
                    scheme_id="TN-SW-001",
                    scheme_name="Pudhumai Penn",
                    official_source_url="https://example.com",
                    documents_need_verification=True,
                    ready_count=0,
                    item_count=2,
                    progress_percent=0,
                    has_saved_progress=False,
                )
            ],
            schemes_with_progress=0,
            overall_ready_count=0,
            overall_item_count=2,
            overall_progress_percent=0,
            disclaimer="Preparation is not government approval.",
        )
        readiness = ReadinessProgressResponse(schemes=[], schemes_being_prepared=0, overall_progress_percent=0, disclaimer="x")
        uploads = SupportingUploadListResponse(uploads=[], count=0, disclaimer="Uploaded does not mean verified.")
        with (
            patch("app.services.scheme_agent_tools.list_document_progress", return_value=progress),
            patch("app.services.scheme_agent_tools.list_readiness", return_value=readiness),
            patch("app.services.scheme_agent_tools.list_uploads", return_value=uploads),
        ):
            response = run_agent(object(), "owner-1", AgentRunRequest(message="What documents are missing?"))
        self.assertEqual(response.intent, "DOCUMENT_READINESS")
        self.assertIn("need official verification", response.reply.lower())
        self.assertIn("ocr", response.reply.lower())
        self.assertTrue(any(action.path == "/documents" for action in response.actions))

    def test_application_status_is_owner_scoped_and_not_a_government_submission(self) -> None:
        listed = ApplicationListResponse(
            applications=[
                ApplicationItem(
                    application_id="app-1",
                    scheme_id="TN-SW-001",
                    scheme_name="Pudhumai Penn",
                    status="planning",
                    application_date=None,
                    created_at="2026-09-28T00:00:00+00:00",
                    updated_at="2026-09-28T00:00:00+00:00",
                )
            ],
            count=1,
        )
        with patch("app.services.scheme_agent_tools.list_applications", return_value=listed) as mocked:
            response = run_agent(object(), "owner-1", AgentRunRequest(message="Show my application status"))
        mocked.assert_called_once()
        self.assertEqual(mocked.call_args.args[1], "owner-1")
        self.assertEqual(response.intent, "APPLICATION_STATUS")
        self.assertIn("planning", response.reply)
        self.assertIn("personal tracking", response.reply.lower())
        self.assertIn("does not submit", response.reply.lower())

    def test_explain_scheme_shows_unverified_source(self) -> None:
        response = run_agent(
            None,
            "owner-1",
            AgentRunRequest(message="What documents are required for Pudhumai Penn?"),
        )
        self.assertEqual(response.intent, "EXPLAIN_SCHEME")
        self.assertIn("get_scheme_knowledge", response.tools_used)
        self.assertTrue(response.sources)
        self.assertEqual(response.scheme_id, "TN-SW-001")
        documents = next(item for item in response.sources if item.field_key == "required_documents")
        self.assertEqual(documents.verification_status, "unverified")
        self.assertIn("not confirmed", response.reply.lower())

    def test_unsupported_and_clarify_do_not_call_write_or_eligibility_tools(self) -> None:
        blocked = run_agent(None, "owner-1", AgentRunRequest(message="Update my wallet age to 30"))
        self.assertEqual(blocked.intent, "UNSUPPORTED")
        self.assertEqual(blocked.tools_used, [])
        unclear = run_agent(None, "owner-1", AgentRunRequest(message="Maybe later"))
        self.assertEqual(unclear.intent, "CLARIFY")

    def test_tamil_selection_uses_tamil_copy(self) -> None:
        response = run_agent(None, "owner-1", AgentRunRequest(message="உதவி", language="ta"))
        self.assertEqual(response.language, "ta")
        self.assertEqual(response.intent, "GENERAL_HELP")
        self.assertIn("தகுதி", response.reply)

    def test_missing_llm_configuration_still_runs_tools(self) -> None:
        response = run_agent(None, "owner-1", AgentRunRequest(message="Find schemes for me"))
        self.assertTrue(response.agent_ran)
        self.assertFalse(response.llm_used)
        self.assertEqual(response.provider, "template")
        self.assertIn("not configured", (response.notice or "").lower())

    def test_llm_failure_falls_back_after_tools_run(self) -> None:
        os.environ["ASSISTANT_LLM_API_URL"] = "https://example.com/v1"
        os.environ["ASSISTANT_LLM_API_KEY"] = "test-key"
        set_llm_provider(FailingProvider())
        response = run_agent(None, "owner-1", AgentRunRequest(message="Find schemes for me"))
        self.assertTrue(response.agent_ran)
        self.assertFalse(response.llm_used)
        self.assertIn("unavailable", (response.notice or "").lower())
        self.assertIn("TN-SW-001", response.reply)

    def test_llm_is_called_only_with_tool_summaries(self) -> None:
        os.environ["ASSISTANT_LLM_API_URL"] = "https://example.com/v1"
        os.environ["ASSISTANT_LLM_API_KEY"] = "test-key"
        provider = RecordingProvider()
        set_llm_provider(provider)
        response = run_agent(None, "owner-1", AgentRunRequest(message="Find schemes for me"))
        self.assertEqual(provider.calls, 1)
        self.assertIn("FIND_SCHEMES", provider.user)
        self.assertIn("search_schemes", provider.user)
        self.assertTrue(response.llm_used)
        self.assertNotIn("ASSISTANT_LLM_API_KEY", response.reply)

    def test_history_can_identify_a_scheme_for_explain(self) -> None:
        response = run_agent(
            None,
            "owner-1",
            AgentRunRequest(
                message="What documents are required?",
                history=[AssistantHistoryTurn(role="user", content="Tell me about TN-SW-001")],
            ),
        )
        self.assertEqual(response.scheme_id, "TN-SW-001")
        self.assertEqual(response.intent, "EXPLAIN_SCHEME")


class SchemeAgentContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        from fastapi.testclient import TestClient

        from app.main import app

        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def test_agent_routes_require_authentication(self) -> None:
        self.assertEqual(self.client.get("/api/v1/scheme-agent/status").status_code, 401)
        self.assertEqual(
            self.client.post(
                "/api/v1/scheme-agent/run",
                json={"message": "Find schemes for me", "language": "en"},
            ).status_code,
            401,
        )

    def test_request_schema_does_not_accept_another_user_id(self) -> None:
        payload = AgentRunRequest.model_validate(
            {"message": "Check my eligibility", "language": "en", "user_id": "someone-else"}
        )
        self.assertFalse(hasattr(payload, "user_id") and getattr(payload, "user_id", None) == "someone-else")
        dumped = payload.model_dump()
        self.assertNotIn("user_id", dumped)

    def test_existing_scanner_knowledge_assistant_and_eligibility_routes_are_unchanged(self) -> None:
        catalog = self.client.get("/api/v1/catalog")
        self.assertEqual(catalog.status_code, 200)
        self.assertEqual(catalog.json()["scheme_count"], 13)
        knowledge = self.client.get("/api/v1/scheme-knowledge/TN-SW-001")
        self.assertEqual(knowledge.status_code, 200)
        self.assertEqual(self.client.get("/api/v1/document-scans/types").status_code, 401)
        self.assertEqual(self.client.get("/api/v1/scheme-assistant/status").status_code, 401)
        self.assertEqual(self.client.post("/api/v1/recommend", json={"age": 20}).status_code, 422)

    def test_openapi_lists_agent_and_existing_routes(self) -> None:
        paths = self.client.get("/openapi.json").json()["paths"]
        self.assertIn("/api/v1/scheme-agent/status", paths)
        self.assertIn("/api/v1/scheme-agent/run", paths)
        self.assertIn("/api/v1/scheme-assistant/chat", paths)
        self.assertIn("/api/v1/scheme-knowledge", paths)
        self.assertIn("/api/v1/document-scans", paths)
        self.assertNotIn("/api/v1/scheme-agent/write", paths)
