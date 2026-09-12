"""Voice capability contract tests. Does not change Hybrid Rule + ML scoring."""

from __future__ import annotations

import unittest

from fastapi.testclient import TestClient

from app.main import app
from app.services.voice_stt_service import CloudSttRejectedError, CloudSttUnavailableError, transcribe_audio, voice_status


class VoiceContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def test_unauthenticated_voice_routes_return_401(self) -> None:
        self.assertEqual(self.client.get("/api/v1/voice/status").status_code, 401)
        self.assertEqual(
            self.client.post(
                "/api/v1/voice/transcribe",
                files={"file": ("speech.webm", b"abc", "audio/webm")},
                data={"language": "ta-IN"},
            ).status_code,
            401,
        )

    def test_openapi_lists_voice_routes(self) -> None:
        paths = self.client.get("/openapi.json").json()["paths"]
        self.assertIn("/api/v1/voice/status", paths)
        self.assertIn("/api/v1/voice/transcribe", paths)


class VoiceSttServiceTests(unittest.TestCase):
    def test_status_defaults_to_browser_and_never_retains_audio(self) -> None:
        status = voice_status()
        self.assertEqual(status.stt_provider, "browser")
        self.assertEqual(status.tts_provider, "browser_neural")
        self.assertFalse(status.cloud_stt_available)
        self.assertFalse(status.audio_retained)

    def test_transcribe_without_config_is_unavailable(self) -> None:
        with self.assertRaises(CloudSttUnavailableError):
            transcribe_audio(audio=b"abc", content_type="audio/webm", language="ta-IN", https_request=True)

    def test_transcribe_rejects_empty_or_disallowed_audio(self) -> None:
        with self.assertRaises(CloudSttRejectedError):
            transcribe_audio(audio=b"", content_type="audio/webm", language="ta-IN", https_request=True)
        with self.assertRaises(CloudSttRejectedError):
            transcribe_audio(audio=b"abc", content_type="application/pdf", language="ta-IN", https_request=True)


if __name__ == "__main__":
    unittest.main()
