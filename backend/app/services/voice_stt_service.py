"""Optional cloud speech-to-text. Audio stays in memory and is discarded."""

from __future__ import annotations

from typing import Final

import httpx

from app.schemas.voice import VOICE_DISCLAIMER, VoiceStatusResponse, VoiceTranscribeResponse
from app.settings import is_production, voice_stt_api_key, voice_stt_api_url, voice_stt_configured

MAX_AUDIO_BYTES: Final[int] = 2 * 1024 * 1024
ALLOWED_AUDIO_TYPES: Final[frozenset[str]] = frozenset(
    {"audio/webm", "audio/wav", "audio/wave", "audio/mpeg", "audio/mp3", "audio/ogg", "audio/mp4"}
)


class CloudSttUnavailableError(Exception):
    """Raised when optional cloud speech is not configured or the provider failed."""


class CloudSttRejectedError(Exception):
    """Raised when the audio payload is unsafe or too large."""


def voice_status(*, https_request: bool = False) -> VoiceStatusResponse:
    _ = https_request
    cloud = voice_stt_configured()
    return VoiceStatusResponse(
        stt_provider="cloud" if cloud else "browser",
        tts_provider="browser_neural",
        cloud_stt_available=cloud,
        https_required=is_production() or cloud,
        audio_retained=False,
        disclaimer=VOICE_DISCLAIMER,
    )


def transcribe_audio(*, audio: bytes, content_type: str, language: str, https_request: bool) -> VoiceTranscribeResponse:
    if len(audio) == 0 or len(audio) > MAX_AUDIO_BYTES:
        raise CloudSttRejectedError("Audio must be between 1 byte and 2 MB.")
    media_type = (content_type or "").split(";")[0].strip().lower()
    if media_type and media_type not in ALLOWED_AUDIO_TYPES:
        raise CloudSttRejectedError("That audio type is not supported.")
    if is_production() and not https_request:
        raise CloudSttRejectedError("Cloud speech requires HTTPS.")
    url = voice_stt_api_url()
    key = voice_stt_api_key()
    if not url or not key:
        raise CloudSttUnavailableError("Cloud speech is not configured.")
    try:
        response = httpx.post(
            url,
            headers={"Authorization": f"Bearer {key}"},
            files={"file": ("speech.webm", audio, media_type or "audio/webm")},
            data={"language": language},
            timeout=20.0,
        )
        response.raise_for_status()
        payload = response.json()
        transcript = str(payload.get("transcript") or payload.get("text") or "").strip()
    except (httpx.HTTPError, ValueError, TypeError) as exc:
        raise CloudSttUnavailableError("Cloud speech is temporarily unavailable.") from exc
    if not transcript:
        raise CloudSttUnavailableError("Cloud speech returned an empty transcript.")
    return VoiceTranscribeResponse(
        transcript=transcript,
        language=language,
        provider="cloud",
        audio_retained=False,
        disclaimer=VOICE_DISCLAIMER,
    )
