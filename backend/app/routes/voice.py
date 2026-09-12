"""Optional voice capability routes. JWT only. Audio is never stored."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile

from app.deps import get_current_user
from app.models.user import UserRecord
from app.schemas.voice import VoiceStatusResponse, VoiceTranscribeResponse
from app.services.voice_stt_service import (
    CloudSttRejectedError,
    CloudSttUnavailableError,
    transcribe_audio,
    voice_status,
)

router = APIRouter(prefix="/api/v1/voice", tags=["voice"])

_NOTE = (
    "Requires a JWT. Browser speech is the default. Optional cloud Tamil STT "
    "is used only when configured, never stores audio, and requires HTTPS in production."
)


def _request_is_https(request: Request) -> bool:
    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    return proto.split(",")[0].strip().lower() == "https"


@router.get(
    "/status",
    response_model=VoiceStatusResponse,
    summary="Voice speech capability for the signed-in assistant",
    description=_NOTE,
)
def read_voice_status(
    request: Request,
    current_user: UserRecord = Depends(get_current_user),
) -> VoiceStatusResponse:
    _ = current_user
    return voice_status(https_request=_request_is_https(request))


@router.post(
    "/transcribe",
    response_model=VoiceTranscribeResponse,
    summary="Optional cloud transcription. Audio is discarded after the request.",
    description=_NOTE,
)
async def create_voice_transcript(
    request: Request,
    file: UploadFile = File(...),
    language: str = Form(default="en-IN"),
    current_user: UserRecord = Depends(get_current_user),
) -> VoiceTranscribeResponse:
    _ = current_user
    audio = await file.read()
    file.file.close()
    try:
        return transcribe_audio(
            audio=audio,
            content_type=file.content_type or "",
            language=language.strip() or "en-IN",
            https_request=_request_is_https(request),
        )
    except CloudSttRejectedError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except CloudSttUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
