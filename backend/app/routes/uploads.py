"""Authenticated supporting-document routes. Users may only access their own files."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db, require_db
from app.deps import get_current_user
from app.models.user import UserRecord
from app.schemas.uploads import SupportingUpload, SupportingUploadListResponse, UploadLinkUpdate
from app.services.upload_service import (
    create_upload,
    delete_upload,
    get_upload,
    get_upload_file,
    list_uploads,
    update_upload_link,
)

router = APIRouter(prefix="/api/v1", tags=["uploads"])

_PROTOTYPE_NOTE = (
    "Requires a JWT. Users may upload only non-sensitive supporting files for "
    "this research prototype. Aadhaar, PAN, passport, and biometric documents "
    "are not allowed. Uploaded does not mean verified or officially accepted."
)


@router.get(
    "/uploads",
    response_model=SupportingUploadListResponse,
    summary="List the authenticated user's supporting documents",
    description=_PROTOTYPE_NOTE,
)
def read_uploads(
    scheme_id: str | None = Query(default=None),
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> SupportingUploadListResponse:
    return list_uploads(require_db(session), current_user.id, scheme_id)


@router.post(
    "/uploads",
    response_model=SupportingUpload,
    status_code=201,
    summary="Upload one optional supporting document for the authenticated user",
    description=_PROTOTYPE_NOTE,
)
async def create_supporting_upload(
    category: str = Form(...),
    scheme_id: str | None = Form(default=None),
    file: UploadFile = File(...),
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> SupportingUpload:
    payload = await file.read()
    return create_upload(
        require_db(session),
        current_user.id,
        category,
        file.filename,
        payload,
        scheme_id,
    )


@router.get(
    "/uploads/{upload_id}",
    response_model=SupportingUpload,
    summary="Return metadata for one owned supporting document",
    description=_PROTOTYPE_NOTE,
)
def read_upload(
    upload_id: str,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> SupportingUpload:
    return get_upload(require_db(session), current_user.id, upload_id)


@router.get(
    "/uploads/{upload_id}/file",
    summary="Download one owned supporting document",
    description=_PROTOTYPE_NOTE,
)
def download_upload(
    upload_id: str,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> FileResponse:
    path, item = get_upload_file(require_db(session), current_user.id, upload_id)
    return FileResponse(
        path=path,
        media_type=item.content_type,
        filename=item.display_name,
        content_disposition_type="attachment",
    )


@router.patch(
    "/uploads/{upload_id}",
    response_model=SupportingUpload,
    summary="Link or unlink an owned upload to a recommended CORE scheme",
    description=_PROTOTYPE_NOTE,
)
def patch_upload_link(
    upload_id: str,
    payload: UploadLinkUpdate,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> SupportingUpload:
    return update_upload_link(require_db(session), current_user.id, upload_id, payload.scheme_id)


@router.delete(
    "/uploads/{upload_id}",
    status_code=204,
    summary="Delete one owned supporting document",
    description=_PROTOTYPE_NOTE,
)
def remove_upload(
    upload_id: str,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> None:
    delete_upload(require_db(session), current_user.id, upload_id)
