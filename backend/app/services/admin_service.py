"""Admin monitoring over existing owner-scoped records. Does not score a second engine."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import or_
from sqlalchemy.exc import InterfaceError, OperationalError
from sqlalchemy.orm import Session

from app.db.session import DatabaseUnavailableError
from app.models.applications import ApplicationTrackingRecord
from app.models.citizen import CitizenProfileRecord
from app.models.history import RecommendationHistoryRecord
from app.models.uploads import SupportingUploadRecord
from app.models.user import UserRecord
from app.schemas.admin import (
    ADMIN_DISCLAIMER,
    AdminActivityItem,
    AdminDocumentItem,
    AdminDocumentListResponse,
    AdminEligibilityListResponse,
    AdminEligibilityRow,
    AdminEligibilityView,
    AdminOverviewResponse,
    AdminUserDetailResponse,
    AdminUserListResponse,
    AdminUserSummary,
    wallet_view,
)
from app.schemas.uploads import UploadReviewStatus
from app.services.application_service import list_applications
from app.services.auth_service import user_has_admin_access
from app.services.history_service import list_history_for_user
from app.services.profile_completeness_service import calculate_profile_completeness
from app.services.recommendation_service import recommend_for_citizen
from app.services.upload_service import UploadNotFoundError, _scheme_name
from app.services.wallet_service import get_wallet_for_user, wallet_to_citizen_features

ACTIVE_WINDOW_DAYS = 30
ACTIVITY_LIMIT = 20
REVIEW_STATUSES = {"pending", "verified", "rejected"}


def _is_recent(value: datetime | None, cutoff: datetime) -> bool:
    if value is None:
        return False
    compared = value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)
    return compared >= cutoff


class AdminUserNotFoundError(Exception):
    """Raised when an administrator requests an unknown user."""


def _iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc).isoformat()
    return value.isoformat()


def _user_summary(user: UserRecord, *, has_wallet: bool, last_activity_at: str | None) -> AdminUserSummary:
    return AdminUserSummary(
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        has_wallet=has_wallet,
        is_admin=user_has_admin_access(user),
        created_at=_iso(user.created_at),
        last_activity_at=last_activity_at,
    )


def _latest_history_time(session: Session, user_id: str) -> datetime | None:
    row = (
        session.query(RecommendationHistoryRecord.checked_at)
        .filter(RecommendationHistoryRecord.user_id == user_id)
        .order_by(RecommendationHistoryRecord.checked_at.desc())
        .first()
    )
    return row[0] if row else None


def _eligibility_for_user(session: Session, user_id: str) -> AdminEligibilityView:
    wallet = get_wallet_for_user(session, user_id)
    history = list_history_for_user(session, user_id)
    last_checked = history[0].checked_at.isoformat() if history else None
    if wallet is None:
        return AdminEligibilityView(
            has_wallet=False,
            prediction_label="not_evaluated",
            eligible_scheme_count=0,
            evaluated_schemes=[],
            incomplete_fields=[],
            last_checked_at=last_checked,
            disclaimer=ADMIN_DISCLAIMER,
        )
    completeness = calculate_profile_completeness(wallet)
    if completeness.incomplete_fields:
        return AdminEligibilityView(
            has_wallet=True,
            prediction_label="cannot_fully_evaluate",
            eligible_scheme_count=0,
            evaluated_schemes=[],
            incomplete_fields=list(completeness.incomplete_fields),
            last_checked_at=last_checked,
            disclaimer=ADMIN_DISCLAIMER,
        )
    result = recommend_for_citizen(wallet_to_citizen_features(wallet))
    eligible = [scheme for scheme in result.evaluated_schemes if scheme.prediction == "eligible"]
    return AdminEligibilityView(
        has_wallet=True,
        prediction_label="eligible" if eligible else "not_eligible",
        eligible_scheme_count=len(result.recommendations),
        evaluated_schemes=result.evaluated_schemes,
        incomplete_fields=[],
        last_checked_at=last_checked,
        disclaimer=ADMIN_DISCLAIMER,
    )


def get_admin_overview(session: Session) -> AdminOverviewResponse:
    try:
        users = session.query(UserRecord).all()
        uploads = session.query(SupportingUploadRecord).all()
        wallets = session.query(CitizenProfileRecord).all()
        histories = session.query(RecommendationHistoryRecord).all()
        applications = session.query(ApplicationTrackingRecord).all()
    except (OperationalError, InterfaceError) as exc:
        raise DatabaseUnavailableError("The administrator database is unavailable.") from exc

    cutoff = datetime.now(timezone.utc) - timedelta(days=ACTIVE_WINDOW_DAYS)
    active_ids: set[str] = set()
    for row in histories:
        if _is_recent(row.checked_at, cutoff):
            active_ids.add(row.user_id)
    for row in uploads:
        if _is_recent(row.created_at, cutoff):
            active_ids.add(row.user_id)
    for row in applications:
        if _is_recent(row.updated_at, cutoff):
            active_ids.add(row.user_id)
    for row in wallets:
        if row.user_id and _is_recent(row.updated_at, cutoff):
            active_ids.add(row.user_id)

    pending = sum(1 for row in uploads if (getattr(row, "review_status", None) or "pending") == "pending")
    verified = sum(1 for row in uploads if getattr(row, "review_status", None) == "verified")
    rejected = sum(1 for row in uploads if getattr(row, "review_status", None) == "rejected")

    eligible_scheme_results = 0
    not_eligible_scheme_results = 0
    cannot_fully_evaluate_users = 0
    for user in users:
        view = _eligibility_for_user(session, user.id)
        if view.prediction_label == "cannot_fully_evaluate" or view.prediction_label == "not_evaluated":
            cannot_fully_evaluate_users += 1
        for scheme in view.evaluated_schemes:
            if scheme.prediction == "eligible":
                eligible_scheme_results += 1
            elif scheme.prediction == "not_eligible":
                not_eligible_scheme_results += 1

    user_lookup = {user.id: user for user in users}
    activity: list[AdminActivityItem] = []
    for row in histories:
        owner = user_lookup.get(row.user_id)
        if owner is None or row.checked_at is None:
            continue
        activity.append(
            AdminActivityItem(
                activity_type="history",
                occurred_at=_iso(row.checked_at) or "",
                user_id=owner.id,
                user_name=owner.full_name,
                user_email=owner.email,
                summary=f"Eligibility check ({row.recommendation_count} predicted-eligible schemes)",
            )
        )
    for row in uploads:
        owner = user_lookup.get(row.user_id)
        if owner is None or row.created_at is None:
            continue
        activity.append(
            AdminActivityItem(
                activity_type="upload",
                occurred_at=_iso(row.created_at) or "",
                user_id=owner.id,
                user_name=owner.full_name,
                user_email=owner.email,
                summary=f"Uploaded {row.display_name}",
            )
        )
    for row in applications:
        owner = user_lookup.get(row.user_id)
        if owner is None or row.updated_at is None:
            continue
        activity.append(
            AdminActivityItem(
                activity_type="application",
                occurred_at=_iso(row.updated_at) or "",
                user_id=owner.id,
                user_name=owner.full_name,
                user_email=owner.email,
                summary=f"Application tracking {row.scheme_id} ({row.status})",
            )
        )
    for row in wallets:
        owner = user_lookup.get(row.user_id or "")
        if owner is None or row.updated_at is None:
            continue
        activity.append(
            AdminActivityItem(
                activity_type="wallet",
                occurred_at=_iso(row.updated_at) or "",
                user_id=owner.id,
                user_name=owner.full_name,
                user_email=owner.email,
                summary="Wallet profile updated",
            )
        )
    activity.sort(key=lambda item: item.occurred_at, reverse=True)

    return AdminOverviewResponse(
        total_users=len(users),
        active_users=len(active_ids),
        total_document_uploads=len(uploads),
        pending_document_reviews=pending,
        verified_documents=verified,
        rejected_documents=rejected,
        eligible_scheme_results=eligible_scheme_results,
        not_eligible_scheme_results=not_eligible_scheme_results,
        cannot_fully_evaluate_users=cannot_fully_evaluate_users,
        recent_activity=activity[:ACTIVITY_LIMIT],
        disclaimer=ADMIN_DISCLAIMER,
    )


def list_admin_users(session: Session, query: str | None = None) -> AdminUserListResponse:
    try:
        rows = session.query(UserRecord)
        needle = (query or "").strip().lower()
        if needle:
            pattern = f"%{needle}%"
            rows = rows.filter(
                or_(UserRecord.email.ilike(pattern), UserRecord.full_name.ilike(pattern))
            )
        users = rows.order_by(UserRecord.created_at.desc()).all()
        wallet_ids = {
            value
            for (value,) in session.query(CitizenProfileRecord.user_id).filter(
                CitizenProfileRecord.user_id.is_not(None)
            )
        }
    except (OperationalError, InterfaceError) as exc:
        raise DatabaseUnavailableError("The administrator database is unavailable.") from exc

    summaries = [
        _user_summary(
            user,
            has_wallet=user.id in wallet_ids,
            last_activity_at=_iso(_latest_history_time(session, user.id)),
        )
        for user in users
    ]
    return AdminUserListResponse(users=summaries, count=len(summaries), disclaimer=ADMIN_DISCLAIMER)


def get_admin_user(session: Session, user_id: str) -> AdminUserDetailResponse:
    try:
        user = session.query(UserRecord).filter(UserRecord.id == user_id).one_or_none()
    except (OperationalError, InterfaceError) as exc:
        raise DatabaseUnavailableError("The administrator database is unavailable.") from exc
    if user is None:
        raise AdminUserNotFoundError("No user was found.")
    wallet = get_wallet_for_user(session, user.id)
    completeness = calculate_profile_completeness(wallet) if wallet is not None else None
    eligibility = _eligibility_for_user(session, user.id)
    applications = list_applications(session, user.id).applications
    history = list_history_for_user(session, user.id)
    return AdminUserDetailResponse(
        user=_user_summary(
            user,
            has_wallet=wallet is not None,
            last_activity_at=_iso(_latest_history_time(session, user.id)),
        ),
        wallet=wallet_view(wallet) if wallet is not None else None,
        completeness=completeness,
        eligibility=eligibility,
        applications=applications,
        history=history,
        disclaimer=ADMIN_DISCLAIMER,
    )


def list_admin_documents(session: Session) -> AdminDocumentListResponse:
    try:
        rows = (
            session.query(SupportingUploadRecord, UserRecord)
            .join(UserRecord, UserRecord.id == SupportingUploadRecord.user_id)
            .order_by(SupportingUploadRecord.created_at.desc())
            .all()
        )
    except (OperationalError, InterfaceError) as exc:
        raise DatabaseUnavailableError("The administrator database is unavailable.") from exc
    documents = [
        AdminDocumentItem(
            id=upload.id,
            owner_user_id=owner.id,
            owner_name=owner.full_name,
            owner_email=owner.email,
            category=upload.category,
            display_name=upload.display_name,
            content_type=upload.content_type,
            size_bytes=upload.size_bytes,
            scheme_id=upload.scheme_id,
            scheme_name=_scheme_name(upload.scheme_id),
            review_status=upload.review_status
            if getattr(upload, "review_status", None) in REVIEW_STATUSES
            else "pending",
            created_at=_iso(upload.created_at) or "",
        )
        for upload, owner in rows
    ]
    return AdminDocumentListResponse(documents=documents, count=len(documents), disclaimer=ADMIN_DISCLAIMER)


def update_admin_document_status(
    session: Session,
    upload_id: str,
    review_status: UploadReviewStatus,
) -> AdminDocumentItem:
    if review_status not in REVIEW_STATUSES:
        raise UploadNotFoundError("No supporting document was found.")
    try:
        row = (
            session.query(SupportingUploadRecord)
            .filter(SupportingUploadRecord.id == upload_id)
            .one_or_none()
        )
    except (OperationalError, InterfaceError) as exc:
        raise DatabaseUnavailableError("The administrator database is unavailable.") from exc
    if row is None:
        raise UploadNotFoundError("No supporting document was found.")
    row.review_status = review_status
    try:
        session.commit()
        session.refresh(row)
        owner = session.query(UserRecord).filter(UserRecord.id == row.user_id).one_or_none()
    except (OperationalError, InterfaceError) as exc:
        session.rollback()
        raise DatabaseUnavailableError("The administrator database is unavailable.") from exc
    if owner is None:
        raise UploadNotFoundError("No supporting document was found.")
    return AdminDocumentItem(
        id=row.id,
        owner_user_id=owner.id,
        owner_name=owner.full_name,
        owner_email=owner.email,
        category=row.category,
        display_name=row.display_name,
        content_type=row.content_type,
        size_bytes=row.size_bytes,
        scheme_id=row.scheme_id,
        scheme_name=_scheme_name(row.scheme_id),
        review_status=row.review_status if row.review_status in REVIEW_STATUSES else "pending",
        created_at=_iso(row.created_at) or "",
    )


def list_admin_eligibility(session: Session) -> AdminEligibilityListResponse:
    try:
        users = session.query(UserRecord).order_by(UserRecord.created_at.desc()).all()
    except (OperationalError, InterfaceError) as exc:
        raise DatabaseUnavailableError("The administrator database is unavailable.") from exc
    rows = []
    for user in users:
        view = _eligibility_for_user(session, user.id)
        rows.append(
            AdminEligibilityRow(
                user_id=user.id,
                full_name=user.full_name,
                email=user.email,
                has_wallet=view.has_wallet,
                prediction_label=view.prediction_label,
                eligible_scheme_count=view.eligible_scheme_count,
                evaluated_schemes=view.evaluated_schemes,
                incomplete_fields=view.incomplete_fields,
                last_checked_at=view.last_checked_at,
            )
        )
    return AdminEligibilityListResponse(users=rows, count=len(rows), disclaimer=ADMIN_DISCLAIMER)
