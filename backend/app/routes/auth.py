"""Academic prototype authentication routes. Not government identity verification."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db, require_db
from app.models.user import UserRecord
from app.deps import get_current_user
from app.schemas.auth import (
    ChangePasswordRequest,
    GoogleAuthRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserPublic,
)
from app.services.auth_service import (
    authenticate_or_create_google_user,
    authenticate_user,
    change_password,
    delete_account,
    public_user,
    register_user,
    update_profile,
)
from app.services.google_token_service import verify_google_credential
from app.services.token_service import access_token_expires_in_seconds, create_access_token

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

_PROTOTYPE_NOTE = (
    "Academic research prototype authentication. This is not a government "
    "identity verification system."
)


@router.post(
    "/register",
    response_model=UserPublic,
    status_code=201,
    summary="Register a portal account",
    description=_PROTOTYPE_NOTE,
)
def register(payload: RegisterRequest, session: Session | None = Depends(get_db)) -> UserPublic:
    return register_user(require_db(session), payload.full_name, payload.email, payload.password)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Log in and receive a JWT",
    description=_PROTOTYPE_NOTE,
)
def login(payload: LoginRequest, session: Session | None = Depends(get_db)) -> TokenResponse:
    user = authenticate_user(require_db(session), payload.email, payload.password)
    return TokenResponse(
        access_token=create_access_token(user.id),
        token_type="bearer",
        expires_in=access_token_expires_in_seconds(),
        user=public_user(user),
    )


@router.post(
    "/google",
    response_model=TokenResponse,
    summary="Sign in with a verified Google ID token",
    description=(
        f"{_PROTOTYPE_NOTE} The backend verifies the Google credential and "
        "issues the same application JWT used by email/password login."
    ),
)
def google_login(payload: GoogleAuthRequest, session: Session | None = Depends(get_db)) -> TokenResponse:
    identity = verify_google_credential(payload.credential)
    user = authenticate_or_create_google_user(
        require_db(session),
        google_sub=identity.google_sub,
        email=identity.email,
        full_name=identity.full_name,
    )
    return TokenResponse(
        access_token=create_access_token(user.id),
        token_type="bearer",
        expires_in=access_token_expires_in_seconds(),
        user=public_user(user),
    )


@router.get(
    "/me",
    response_model=UserPublic,
    summary="Return the authenticated user",
    description=_PROTOTYPE_NOTE,
)
def read_me(current_user: UserRecord = Depends(get_current_user)) -> UserPublic:
    return public_user(current_user)


@router.patch(
    "/me",
    response_model=UserPublic,
    summary="Update the authenticated user's display name",
    description=_PROTOTYPE_NOTE,
)
def patch_me(
    payload: UpdateProfileRequest,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> UserPublic:
    return update_profile(require_db(session), current_user, payload.full_name)


@router.post(
    "/change-password",
    status_code=204,
    summary="Change the authenticated user's password",
    description=_PROTOTYPE_NOTE,
)
def change_my_password(
    payload: ChangePasswordRequest,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> None:
    change_password(require_db(session), current_user, payload.current_password, payload.new_password)


@router.delete(
    "/me",
    status_code=204,
    summary="Delete the authenticated account and owned application data",
    description=(
        f"{_PROTOTYPE_NOTE} This removes the user row and associated wallet "
        "and recommendation history. Global scheme and model data are not deleted."
    ),
)
def delete_me(
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> None:
    delete_account(require_db(session), current_user)
