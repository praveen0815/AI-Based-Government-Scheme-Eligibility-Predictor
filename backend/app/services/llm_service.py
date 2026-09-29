"""OpenAI-compatible LLM client. Never logs prompts, keys, or chat text."""

from __future__ import annotations

from typing import Protocol

import httpx

from app.settings import (
    assistant_llm_api_key,
    assistant_llm_api_url,
    assistant_llm_configured,
    assistant_llm_model,
    assistant_llm_timeout_seconds,
)


class LlmUnavailableError(Exception):
    """Raised when the configured LLM provider is missing or fails."""


class LlmProvider(Protocol):
    def generate(self, *, system: str, user: str) -> str:
        """Return model text. Implementations must not log the prompts."""


_provider: LlmProvider | None = None


def llm_is_configured() -> bool:
    return assistant_llm_configured()


def llm_model_name() -> str | None:
    if not assistant_llm_configured():
        return None
    return assistant_llm_model()


def get_llm_provider() -> LlmProvider:
    global _provider
    if _provider is None:
        _provider = OpenAiCompatibleProvider()
    return _provider


def set_llm_provider(provider: LlmProvider | None) -> None:
    """Test hook. Pass None to restore the default provider."""
    global _provider
    _provider = provider


class OpenAiCompatibleProvider:
    """Calls a Chat Completions-compatible HTTP API. Works with OpenAI, Groq, or a local proxy."""

    def generate(self, *, system: str, user: str) -> str:
        url = _chat_completions_url(assistant_llm_api_url())
        key = assistant_llm_api_key()
        if not url or not key:
            raise LlmUnavailableError(
                "The scheme assistant LLM is not configured. Set ASSISTANT_LLM_API_URL and ASSISTANT_LLM_API_KEY."
            )
        try:
            response = httpx.post(
                url,
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": assistant_llm_model(),
                    "temperature": 0.2,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                },
                timeout=assistant_llm_timeout_seconds(),
            )
            response.raise_for_status()
            payload = response.json()
            text = str(payload["choices"][0]["message"]["content"]).strip()
        except LlmUnavailableError:
            raise
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
            raise LlmUnavailableError("The scheme assistant language model is temporarily unavailable.") from exc
        if not text:
            raise LlmUnavailableError("The scheme assistant language model returned an empty reply.")
        return text


def _chat_completions_url(raw: str) -> str:
    url = raw.rstrip("/")
    if not url:
        return ""
    if url.endswith("/chat/completions"):
        return url
    return f"{url}/chat/completions"
