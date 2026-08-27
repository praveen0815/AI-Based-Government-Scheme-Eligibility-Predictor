"""User registration and login. This is not government identity verification."""

from __future__ import annotations

from uuid import uuid4

from sqlalchemy.exc import IntegrityError, InterfaceError, OperationalError
from sqlalchemy.orm import Session

from app.db.init_db import ensure_google_auth_columns
from app.db.session import DatabaseUnavailableError
from app.models.citizen import CitizenProfileRecord
from app.models.documents import DocumentChecklistProgressRecord
from app.models.readiness import ApplicationReadinessRecord
from app.models.history import RecommendationHistoryRecord
from app.services.upload_service import delete_uploads_for_user
from app.models.user import UserRecord
from app.schemas.auth import UserPublic
from app.services.password_service import hash_password, verify_password


class EmailAlreadyRegisteredError(Exception):
    """Raised when the normalized email is already stored."""


class InvalidCredentialsError(Exception):
    """Raised for unknown email or wrong password. Same message for both."""


class PasswordChangeError(Exception):
    """Raised for a rejected password change. Safe client message only."""


def normalize_email(email: str) -> str:
    return email.strip().lower()


def _to_public(user: UserRecord) -> UserPublic:
    created_at = user.created_at.isoformat() if user.created_at is not None else None
    return UserPublic(
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        has_password=bool(user.password_hash),
        has_google=bool(user.google_sub),
        created_at=created_at,
    )


def get_user_by_id(session: Session, user_id: str) -> UserRecord | None:
    try:
        return session.query(UserRecord).filter(UserRecord.id == user_id).one_or_none()
    except (OperationalError, InterfaceError) as exc:
        raise DatabaseUnavailableError("The data wallet database is unavailable.") from exc


def get_user_by_email(session: Session, email: str) -> UserRecord | None:
    try:
        return session.query(UserRecord).filter(UserRecord.email == normalize_email(email)).one_or_none()
    except (OperationalError, InterfaceError) as exc:
        raise DatabaseUnavailableError("The data wallet database is unavailable.") from exc


def register_user(session: Session, full_name: str, email: str, password: str) -> UserPublic:
    record = UserRecord(
        id=str(uuid4()),
        email=normalize_email(email),
        password_hash=hash_password(password),
        full_name=full_name.strip(),
    )
    session.add(record)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise EmailAlreadyRegisteredError("Email already registered") from exc
    except (OperationalError, InterfaceError) as exc:
        session.rollback()
        raise DatabaseUnavailableError("The data wallet database is unavailable.") from exc
    session.refresh(record)
    return _to_public(record)


def get_user_by_google_sub(session: Session, google_sub: str) -> UserRecord | None:
    try:
        return session.query(UserRecord).filter(UserRecord.google_sub == google_sub).one_or_none()
    except (OperationalError, InterfaceError) as exc:
        raise DatabaseUnavailableError("The data wallet database is unavailable.") from exc


def authenticate_user(session: Session, email: str, password: str) -> UserRecord:
    user = get_user_by_email(session, email)
    if user is None or not user.password_hash or not verify_password(password, user.password_hash):
        raise InvalidCredentialsError("Invalid email or password")
    return user


def _ensure_google_user_schema(session: Session) -> None:
    bind = session.get_bind()
    if bind is None:
        raise DatabaseUnavailableError("The data wallet database is unavailable.")
    try:
        ensure_google_auth_columns(bind)
    except (OperationalError, InterfaceError) as exc:
        raise DatabaseUnavailableError("The data wallet database is unavailable.") from exc


def authenticate_or_create_google_user(
    session: Session,
    *,
    google_sub: str,
    email: str,
    full_name: str,
) -> UserRecord:
    """Link or create a local user from verified Google claims only."""
    _ensure_google_user_schema(session)
    existing_sub = get_user_by_google_sub(session, google_sub)
    if existing_sub is not None:
        return existing_sub

    existing_email = get_user_by_email(session, email)
    if existing_email is not None:
        if existing_email.google_sub and existing_email.google_sub != google_sub:
            raise EmailAlreadyRegisteredError("Email already registered")
        existing_email.google_sub = google_sub
        try:
            session.commit()
        except IntegrityError as exc:
            session.rollback()
            raise EmailAlreadyRegisteredError("Email already registered") from exc
        except (OperationalError, InterfaceError) as exc:
            session.rollback()
            raise DatabaseUnavailableError("The data wallet database is unavailable.") from exc
        session.refresh(existing_email)
        return existing_email

    record = UserRecord(
        id=str(uuid4()),
        email=normalize_email(email),
        password_hash=None,
        google_sub=google_sub,
        full_name=full_name.strip() or normalize_email(email).split("@")[0],
    )
    session.add(record)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise EmailAlreadyRegisteredError("Email already registered") from exc
    except (OperationalError, InterfaceError) as exc:
        session.rollback()
        raise DatabaseUnavailableError("The data wallet database is unavailable.") from exc
    session.refresh(record)
    return record


def update_profile(session: Session, user: UserRecord, full_name: str) -> UserPublic:
    user.full_name = full_name.strip()
    try:
        session.commit()
    except (OperationalError, InterfaceError) as exc:
        session.rollback()
        raise DatabaseUnavailableError("The data wallet database is unavailable.") from exc
    session.refresh(user)
    return _to_public(user)


def change_password(session: Session, user: UserRecord, current_password: str, new_password: str) -> None:
    if not user.password_hash:
        raise PasswordChangeError("Password change is not available for this account.")
    if not verify_password(current_password, user.password_hash):
        raise PasswordChangeError("Current password is incorrect.")
    if current_password == new_password:
        raise PasswordChangeError("Choose a different new password.")
    user.password_hash = hash_password(new_password)
    try:
        session.commit()
    except (OperationalError, InterfaceError) as exc:
        session.rollback()
        raise DatabaseUnavailableError("The data wallet database is unavailable.") from exc


def delete_account(session: Session, user: UserRecord) -> None:
    """Remove the JWT owner and their wallet/history. Does not touch global data."""
    try:
        session.query(RecommendationHistoryRecord).filter(
            RecommendationHistoryRecord.user_id == user.id
        ).delete(synchronize_session=False)
        session.query(DocumentChecklistProgressRecord).filter(
            DocumentChecklistProgressRecord.user_id == user.id
        ).delete(synchronize_session=False)
        session.query(ApplicationReadinessRecord).filter(
            ApplicationReadinessRecord.user_id == user.id
        ).delete(synchronize_session=False)
        delete_uploads_for_user(session, user.id)
        session.query(CitizenProfileRecord).filter(CitizenProfileRecord.user_id == user.id).delete(
            synchronize_session=False
        )
        session.delete(user)
        session.commit()
    except (OperationalError, InterfaceError) as exc:
        session.rollback()
        raise DatabaseUnavailableError("The data wallet database is unavailable.") from exc


def public_user(user: UserRecord) -> UserPublic:
    return _to_public(user)
