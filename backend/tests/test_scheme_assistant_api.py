"""Scheme assistant tests. Does not score eligibility or change scanner/knowledge APIs."""

from __future__ import annotations

import os
import unittest

from app.schemas.scheme_assistant import AssistantChatRequest, AssistantHistoryTurn
from app.services.llm_service import LlmUnavailableError, set_llm_provider
from app.services.scheme_assistant_service import chat


class RecordingProvider:
    def __init__(self, reply: str = "Retrieved knowledge says the monthly benefit is Rs. 1,000.") -> None:
        self.system = ""
        self.user = ""
        self.calls = 0
        self.reply = reply

    def generate(self, *, system: str, user: str) -> str:
        self.calls += 1
        self.system = system
        self.user = user
        return self.reply


class FailingProvider:
    def generate(self, *, system: str, user: str) -> str:
        _ = system, user
        raise LlmUnavailableError("provider down")


class SchemeAssistantServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self._url = os.environ.pop("ASSISTANT_LLM_API_URL", None)
        self._key = os.environ.pop("ASSISTANT_LLM_API_KEY", None)
        set_llm_provider(None)

    def tearDown(self) -> None:
        set_llm_provider(None)
        if self._url is None:
            os.environ.pop("ASSISTANT_LLM_API_URL", None)
        else:
            os.environ["ASSISTANT_LLM_API_URL"] = self._url
        if self._key is None:
            os.environ.pop("ASSISTANT_LLM_API_KEY", None)
        else:
            os.environ["ASSISTANT_LLM_API_KEY"] = self._key

    def test_scheme_answer_retrieves_knowledge_and_shows_unverified_source(self) -> None:
        response = chat(
            None,
            "user-1",
            AssistantChatRequest(message="What documents are required for Pudhumai Penn?", language="en"),
        )
        self.assertEqual(response.intent, "scheme")
        self.assertEqual(response.scheme_id, "TN-SW-001")
        self.assertFalse(response.llm_used)
        self.assertEqual(response.provider, "template")
        self.assertIn("not configured", (response.notice or "").lower())
        self.assertTrue(response.sources)
        documents = next(item for item in response.sources if item.field_key == "required_documents")
        self.assertEqual(documents.verification_status, "unverified")
        self.assertEqual(documents.content_state, "unverified_placeholder")
        self.assertIsNone(documents.last_verified_at)
        self.assertTrue((documents.source_url or "").startswith("https://www.tnsocialwelfare.tn.gov.in"))
        self.assertIn("not confirmed", response.reply.lower())
        self.assertNotIn("2026-08-14", response.reply)
        self.assertIn("does not predict", response.disclaimer.lower())

    def test_missing_or_unverified_information_is_not_invented(self) -> None:
        response = chat(
            None,
            "user-1",
            AssistantChatRequest(message="What documents are required for TN-SW-002?", language="en"),
        )
        self.assertEqual(response.scheme_id, "TN-SW-002")
        self.assertIn("not confirmed", response.reply.lower())
        self.assertNotIn("I will invent", response.reply)
        self.assertTrue(all(item.last_verified_at is None or item.verification_status == "verified" for item in response.sources))

    def test_ambiguous_question_asks_for_a_scheme(self) -> None:
        response = chat(
            None,
            "user-1",
            AssistantChatRequest(message="What documents are required?", language="en"),
        )
        self.assertEqual(response.intent, "clarify")
        self.assertFalse(response.llm_used)
        self.assertIn("which scheme", response.reply.lower())
        self.assertTrue(any(action.path == "/schemes" for action in response.actions))

    def test_history_can_identify_the_scheme(self) -> None:
        response = chat(
            None,
            "user-1",
            AssistantChatRequest(
                message="What documents are required?",
                language="en",
                history=[AssistantHistoryTurn(role="user", content="Tell me about TN-SW-001")],
            ),
        )
        self.assertEqual(response.scheme_id, "TN-SW-001")
        self.assertEqual(response.intent, "scheme")

    def test_tamil_selection_uses_tamil_copy(self) -> None:
        response = chat(
            None,
            "user-1",
            AssistantChatRequest(message="புதுமைப் பெண் திட்டம் என்ன?", language="ta", scheme_id="TN-SW-001"),
        )
        self.assertEqual(response.language, "ta")
        self.assertIn("மூல", response.reply)
        self.assertIn("தகுதி முடிவு அல்ல", response.reply)

    def test_eligibility_question_is_not_answered_independently(self) -> None:
        response = chat(
            None,
            "user-1",
            AssistantChatRequest(message="Am I eligible for Pudhumai Penn?", language="en"),
        )
        self.assertEqual(response.intent, "eligibility")
        self.assertFalse(response.llm_used)
        self.assertEqual(response.provider, "template")
        self.assertIn("hybrid rule", response.reply.lower())
        self.assertIn("cannot decide", response.reply.lower())
        self.assertNotIn("you are eligible.", response.reply.lower())
        self.assertNotIn("predicted eligible", response.reply.lower())
        self.assertTrue(any(action.path == "/check" for action in response.actions))
        self.assertTrue(any(action.path == "/wallet" for action in response.actions))

    def test_missing_llm_configuration_uses_template_fallback(self) -> None:
        response = chat(
            None,
            "user-1",
            AssistantChatRequest(message="What is this scheme about?", language="en", scheme_id="TN-SW-001"),
        )
        self.assertFalse(response.llm_used)
        self.assertEqual(response.provider, "template")
        self.assertIn("not configured", (response.notice or "").lower())
        self.assertIn("Pudhumai Penn", response.reply)

    def test_llm_is_called_only_after_knowledge_retrieval(self) -> None:
        os.environ["ASSISTANT_LLM_API_URL"] = "https://example.com/v1"
        os.environ["ASSISTANT_LLM_API_KEY"] = "test-key"
        provider = RecordingProvider()
        set_llm_provider(provider)
        response = chat(
            None,
            "user-1",
            AssistantChatRequest(message="What is this scheme about?", language="en", scheme_id="TN-SW-001"),
        )
        self.assertEqual(provider.calls, 1)
        self.assertIn("TN-SW-001", provider.user)
        self.assertIn("required_documents", provider.user)
        self.assertIn("verification_status", provider.user)
        self.assertTrue(response.llm_used)
        self.assertEqual(response.provider, "llm")
        self.assertTrue(response.sources)
        self.assertIn("official catalog knowledge", response.disclaimer.lower())

    def test_llm_failure_falls_back_to_template(self) -> None:
        os.environ["ASSISTANT_LLM_API_URL"] = "https://example.com/v1"
        os.environ["ASSISTANT_LLM_API_KEY"] = "test-key"
        set_llm_provider(FailingProvider())
        response = chat(
            None,
            "user-1",
            AssistantChatRequest(message="Explain the application process for TN-SW-001", language="en"),
        )
        self.assertFalse(response.llm_used)
        self.assertEqual(response.provider, "template")
        self.assertIn("unavailable", (response.notice or "").lower())
        self.assertIn("Penkalvi", response.reply)


class SchemeAssistantContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        from fastapi.testclient import TestClient

        from app.main import app

        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def test_assistant_routes_require_authentication(self) -> None:
        self.assertEqual(self.client.get("/api/v1/scheme-assistant/status").status_code, 401)
        self.assertEqual(
            self.client.post(
                "/api/v1/scheme-assistant/chat",
                json={"message": "What is this scheme about?", "language": "en"},
            ).status_code,
            401,
        )

    def test_existing_scanner_knowledge_catalog_and_eligibility_routes_are_unchanged(self) -> None:
        catalog = self.client.get("/api/v1/catalog")
        self.assertEqual(catalog.status_code, 200)
        self.assertEqual(catalog.json()["scheme_count"], 13)
        knowledge = self.client.get("/api/v1/scheme-knowledge/TN-SW-001")
        self.assertEqual(knowledge.status_code, 200)
        self.assertEqual(knowledge.json()["scheme_id"], "TN-SW-001")
        schemes = self.client.get("/api/v1/schemes")
        self.assertEqual(schemes.status_code, 200)
        self.assertEqual(schemes.json()["scheme_count"], 6)
        self.assertEqual(self.client.get("/api/v1/document-scans/types").status_code, 401)
        self.assertEqual(self.client.post("/api/v1/recommend", json={"age": 20}).status_code, 422)

    def test_openapi_lists_assistant_and_existing_routes(self) -> None:
        paths = self.client.get("/openapi.json").json()["paths"]
        self.assertIn("/api/v1/scheme-assistant/status", paths)
        self.assertIn("/api/v1/scheme-assistant/chat", paths)
        self.assertIn("/api/v1/scheme-knowledge", paths)
        self.assertIn("/api/v1/scheme-knowledge/{scheme_id}", paths)
        self.assertIn("/api/v1/document-scans", paths)
        self.assertIn("/api/v1/catalog", paths)
        self.assertNotIn("/api/v1/scheme-agent", paths)
