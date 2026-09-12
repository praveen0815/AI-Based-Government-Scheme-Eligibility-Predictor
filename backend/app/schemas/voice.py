"""Voice assistant capability payloads. Never include audio or transcripts in status."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

VOICE_DISCLAIMER = (
    "Nira uses push-to-talk speech in this academic prototype. "
    "Audio is not stored. Cloud speech is optional and requires HTTPS when enabled."
)


class VoiceStatusResponse(BaseModel):
    stt_provider: Literal["browser", "cloud"]
    tts_provider: Literal["browser_neural"]
    cloud_stt_available: bool
    https_required: bool
    audio_retained: bool = False
    disclaimer: str


class VoiceTranscribeResponse(BaseModel):
    transcript: str
    language: str
    provider: str
    audio_retained: bool = False
    disclaimer: str
