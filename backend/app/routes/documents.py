"""Authenticated document-preparation routes. Users may only access their own rows."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db, require_db
from app.deps import get_current_user
from app.models.user import UserRecord
from app.schemas.documents import DocumentProgressResponse, DocumentStatusUpdate, SchemeDocumentChecklist
from app.services.document_checklist_service import (
    get_scheme_checklist,
    list_document_progress,
    update_item_status,
)

router = APIRouter(prefix="/api/v1", tags=["documents"])

_PROTOTYPE_NOTE = (
    "Requires a JWT. A user can only read or update their own document "
    "preparation progress for CORE schemes that appear in their recommendation "
    "history. This is not government approval. Files and identity numbers are not stored."
)


@router.get(
    "/documents",
    response_model=DocumentProgressResponse,
    summary="Summarize document preparation for recommended CORE schemes",
    description=_PROTOTYPE_NOTE,
)
def read_document_progress(
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> DocumentProgressResponse:
    return list_document_progress(require_db(session), current_user.id)


@router.get(
    "/documents/schemes/{scheme_id}",
    response_model=SchemeDocumentChecklist,
    summary="Return the document checklist for one recommended CORE scheme",
    description=_PROTOTYPE_NOTE,
)
def read_scheme_checklist(
    scheme_id: str,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> SchemeDocumentChecklist:
    return get_scheme_checklist(require_db(session), current_user.id, scheme_id)


@router.patch(
    "/documents/schemes/{scheme_id}/items/{item_key}",
    response_model=SchemeDocumentChecklist,
    summary="Update one checklist item status for the authenticated user",
    description=_PROTOTYPE_NOTE,
)
def patch_checklist_item(
    scheme_id: str,
    item_key: str,
    payload: DocumentStatusUpdate,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> SchemeDocumentChecklist:
    return update_item_status(require_db(session), current_user.id, scheme_id, item_key, payload.status)
