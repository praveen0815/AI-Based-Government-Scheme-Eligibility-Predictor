"""Admin voice audit. Hash transcripts and never persist audio or raw speech."""

from __future__ import annotations

import hashlib
import re
from typing import Literal

from sqlalchemy.exc import InterfaceError, OperationalError
from sqlalchemy.orm import Session

from app.db.session import DatabaseUnavailableError
from app.models.voice_audit import VoiceAuditRecord
from app.schemas.admin import ADMIN_DISCLAIMER, AdminVoiceAuditResponse

VoiceAuditOutcome = Literal["ok", "denied", "ambiguous", "error", "cancelled", "not_found"]
_HASH_PATTERN = re.compile(r"^[a-f0-9]{64}$")


def hash_transcript(text: str) -> str:
    return hashlib.sha256(text.strip().lower().encode("utf-8")).hexdigest()


def resolve_transcript_hash(*, transcript_hash: str | None, transcript: str | None) -> str:
    if transcript_hash and _HASH_PATTERN.fullmatch(transcript_hash.strip().lower()):
        return transcript_hash.strip().lower()
    if transcript:
        return hash_transcript(transcript)
    raise ValueError("A transcript hash is required.")


def create_voice_audit(
    session: Session,
    *,
    admin_user_id: str,
    intent: str,
    outcome: VoiceAuditOutcome,
    target_user_id: str | None,
    transcript_hash: str,
) -> AdminVoiceAuditResponse:
    record = VoiceAuditRecord(
        admin_user_id=admin_user_id,
        intent=intent.strip()[:64],
        outcome=outcome,
        target_user_id=target_user_id,
        transcript_hash=transcript_hash,
    )
    try:
        session.add(record)
        session.commit()
        session.refresh(record)
    except (OperationalError, InterfaceError) as exc:
        session.rollback()
        raise DatabaseUnavailableError("The administrator database is unavailable.") from exc
    return AdminVoiceAuditResponse(
        id=record.id,
        admin_user_id=record.admin_user_id,
        intent=record.intent,
        outcome=record.outcome,
        target_user_id=record.target_user_id,
        transcript_hash=record.transcript_hash,
        created_at=record.created_at.isoformat(),
        disclaimer=ADMIN_DISCLAIMER,
    )
