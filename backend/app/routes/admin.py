"""Administrator routes. JWT plus server-side admin role. Not a second login system."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db, require_db
from app.deps import get_current_admin
from app.models.user import UserRecord
from app.schemas.admin import (
    AdminDocumentItem,
    AdminDocumentListResponse,
    AdminDocumentStatusUpdate,
    AdminEligibilityListResponse,
    AdminOverviewResponse,
    AdminUserDetailResponse,
    AdminUserListResponse,
    AdminVoiceAuditCreate,
    AdminVoiceAuditResponse,
)
from app.services.admin_service import (
    get_admin_overview,
    get_admin_user,
    list_admin_documents,
    list_admin_eligibility,
    list_admin_users,
    update_admin_document_status,
)
from app.services.voice_audit_service import create_voice_audit, resolve_transcript_hash

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

_NOTE = (
    "Requires a JWT from an administrator account. Document review is separate "
    "from the Hybrid Rule + ML eligibility engine and never changes predictions."
)


@router.get(
    "/overview",
    response_model=AdminOverviewResponse,
    summary="Administrator dashboard snapshot",
    description=_NOTE,
)
def read_admin_overview(
    current_admin: UserRecord = Depends(get_current_admin),
    session: Session | None = Depends(get_db),
) -> AdminOverviewResponse:
    _ = current_admin
    return get_admin_overview(require_db(session))


@router.get(
    "/users",
    response_model=AdminUserListResponse,
    summary="Search registered users",
    description=_NOTE,
)
def read_admin_users(
    q: str | None = Query(default=None, max_length=200),
    current_admin: UserRecord = Depends(get_current_admin),
    session: Session | None = Depends(get_db),
) -> AdminUserListResponse:
    _ = current_admin
    return list_admin_users(require_db(session), q)


@router.get(
    "/users/{user_id}",
    response_model=AdminUserDetailResponse,
    summary="View one user's wallet, completeness, eligibility, and activity",
    description=_NOTE,
)
def read_admin_user(
    user_id: str,
    current_admin: UserRecord = Depends(get_current_admin),
    session: Session | None = Depends(get_db),
) -> AdminUserDetailResponse:
    _ = current_admin
    return get_admin_user(require_db(session), user_id)


@router.get(
    "/documents",
    response_model=AdminDocumentListResponse,
    summary="List uploaded supporting documents for review",
    description=_NOTE,
)
def read_admin_documents(
    current_admin: UserRecord = Depends(get_current_admin),
    session: Session | None = Depends(get_db),
) -> AdminDocumentListResponse:
    _ = current_admin
    return list_admin_documents(require_db(session))


@router.patch(
    "/documents/{upload_id}",
    response_model=AdminDocumentItem,
    summary="Update supporting-document review status only",
    description=_NOTE,
)
def patch_admin_document(
    upload_id: str,
    payload: AdminDocumentStatusUpdate,
    current_admin: UserRecord = Depends(get_current_admin),
    session: Session | None = Depends(get_db),
) -> AdminDocumentItem:
    _ = current_admin
    return update_admin_document_status(require_db(session), upload_id, payload.review_status)


@router.get(
    "/eligibility",
    response_model=AdminEligibilityListResponse,
    summary="Monitor existing Hybrid Rule + ML results per user",
    description=_NOTE,
)
def read_admin_eligibility(
    current_admin: UserRecord = Depends(get_current_admin),
    session: Session | None = Depends(get_db),
) -> AdminEligibilityListResponse:
    _ = current_admin
    return list_admin_eligibility(require_db(session))


@router.post(
    "/audit/voice",
    response_model=AdminVoiceAuditResponse,
    summary="Record an administrator voice lookup without storing speech",
    description=_NOTE,
)
def create_admin_voice_audit(
    payload: AdminVoiceAuditCreate,
    current_admin: UserRecord = Depends(get_current_admin),
    session: Session | None = Depends(get_db),
) -> AdminVoiceAuditResponse:
    try:
        transcript_hash = resolve_transcript_hash(
            transcript_hash=payload.transcript_hash,
            transcript=payload.transcript,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return create_voice_audit(
        require_db(session),
        admin_user_id=current_admin.id,
        intent=payload.intent,
        outcome=payload.outcome,
        target_user_id=payload.target_user_id,
        transcript_hash=transcript_hash,
    )
