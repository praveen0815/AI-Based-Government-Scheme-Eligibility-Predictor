"""Citizen data-wallet persistence. Does not store eligibility results."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy.exc import IntegrityError, InterfaceError, OperationalError
from sqlalchemy.orm import Session

from app.db.session import DatabaseUnavailableError as DatabaseUnavailableError
from app.models.citizen import CitizenProfileRecord
from app.schemas.prediction import CitizenProfile
from app.schemas.wallet import CitizenWalletResponse


class WalletNotFoundError(Exception):
    """Raised when the wallet is missing or is not owned by the caller."""


class WalletConflictError(Exception):
    """Raised when a citizen_id collides or the user already has a wallet."""


def _to_response(record: CitizenProfileRecord) -> CitizenWalletResponse:
    return CitizenWalletResponse(
        citizen_id=record.citizen_id,
        age=int(record.age),
        gender=record.gender,
        is_student=bool(record.is_student),
        first_higher_education_course=bool(record.first_higher_education_course),
        school_background=record.school_background,
        marital_status=record.marital_status,
        is_orphan=bool(record.is_orphan),
        is_destitute=bool(record.is_destitute),
        occupation_category=record.occupation_category,
        wet_land_acres=float(record.wet_land_acres),
        dry_land_acres=float(record.dry_land_acres),
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


def _apply_profile(record: CitizenProfileRecord, profile: CitizenProfile) -> None:
    record.age = profile.age
    record.gender = profile.gender
    record.is_student = profile.is_student
    record.first_higher_education_course = profile.first_higher_education_course
    record.school_background = profile.school_background
    record.marital_status = profile.marital_status
    record.is_orphan = profile.is_orphan
    record.is_destitute = profile.is_destitute
    record.occupation_category = profile.occupation_category
    record.wet_land_acres = profile.wet_land_acres
    record.dry_land_acres = profile.dry_land_acres


def _commit(session: Session, conflict_message: str) -> None:
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise WalletConflictError(conflict_message) from exc
    except (OperationalError, InterfaceError) as exc:
        session.rollback()
        raise DatabaseUnavailableError("The data wallet database is unavailable.") from exc


def _owned_record(session: Session, citizen_id: str, user_id: str) -> CitizenProfileRecord:
    try:
        record = (
            session.query(CitizenProfileRecord)
            .filter(CitizenProfileRecord.citizen_id == citizen_id)
            .one_or_none()
        )
    except (OperationalError, InterfaceError) as exc:
        raise DatabaseUnavailableError("The data wallet database is unavailable.") from exc
    if record is None or record.user_id != user_id:
        raise WalletNotFoundError("No data wallet was found for that citizen ID.")
    return record


def create_wallet(session: Session, profile: CitizenProfile, user_id: str) -> CitizenWalletResponse:
    existing = get_wallet_for_user(session, user_id)
    if existing is not None:
        raise WalletConflictError("A data wallet already exists for this account.")
    record = CitizenProfileRecord(citizen_id=str(uuid4()), user_id=user_id)
    _apply_profile(record, profile)
    session.add(record)
    _commit(session, "A data wallet with this citizen ID already exists.")
    session.refresh(record)
    return _to_response(record)


def get_wallet_for_user(session: Session, user_id: str) -> CitizenWalletResponse | None:
    try:
        record = (
            session.query(CitizenProfileRecord)
            .filter(CitizenProfileRecord.user_id == user_id)
            .one_or_none()
        )
    except (OperationalError, InterfaceError) as exc:
        raise DatabaseUnavailableError("The data wallet database is unavailable.") from exc
    if record is None:
        return None
    return _to_response(record)


def require_wallet_for_user(session: Session, user_id: str) -> CitizenWalletResponse:
    wallet = get_wallet_for_user(session, user_id)
    if wallet is None:
        raise WalletNotFoundError("No data wallet was found for that citizen ID.")
    return wallet


def get_wallet(session: Session, citizen_id: str, user_id: str) -> CitizenWalletResponse:
    return _to_response(_owned_record(session, citizen_id, user_id))


def update_wallet(
    session: Session,
    citizen_id: str,
    profile: CitizenProfile,
    user_id: str,
) -> CitizenWalletResponse:
    record = _owned_record(session, citizen_id, user_id)
    _apply_profile(record, profile)
    record.updated_at = datetime.now(timezone.utc)
    _commit(session, "A data wallet with this citizen ID already exists.")
    session.refresh(record)
    return _to_response(record)


def delete_wallet(session: Session, citizen_id: str, user_id: str) -> None:
    record = _owned_record(session, citizen_id, user_id)
    session.delete(record)
    _commit(session, "A data wallet with this citizen ID already exists.")


def wallet_to_citizen_features(wallet: CitizenWalletResponse) -> dict:
    return CitizenProfile(
        age=wallet.age,
        gender=wallet.gender,
        is_student=wallet.is_student,
        first_higher_education_course=wallet.first_higher_education_course,
        school_background=wallet.school_background,
        marital_status=wallet.marital_status,
        is_orphan=wallet.is_orphan,
        is_destitute=wallet.is_destitute,
        occupation_category=wallet.occupation_category,
        wet_land_acres=wallet.wet_land_acres,
        dry_land_acres=wallet.dry_land_acres,
    ).to_citizen_features()
