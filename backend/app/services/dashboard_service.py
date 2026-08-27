"""Aggregate owner-only progress for the authenticated dashboard.

Reuses wallet, history, document, and readiness data. Does not score eligibility.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.exc import InterfaceError, OperationalError
from sqlalchemy.orm import Session

from app.db.session import DatabaseUnavailableError
from app.models.documents import DocumentChecklistProgressRecord
from app.schemas.dashboard import (
    DASHBOARD_DISCLAIMER,
    JOURNEY_KEYS,
    DashboardActivityItem,
    DashboardJourneyStep,
    DashboardOverviewResponse,
    DashboardProgress,
    DashboardSummary,
    JourneyStatus,
)
from app.services.document_checklist_service import list_document_progress, recommended_core_scheme_ids
from app.services.history_service import list_history_for_user
from app.services.profile_completeness_service import calculate_profile_completeness
from app.services.readiness_service import list_readiness
from app.services.scheme_service import CatalogUnavailableError, get_scheme_service
from app.services.wallet_service import get_wallet_for_user

ACTIVITY_LIMIT = 8


def _scheme_name(scheme_id: str) -> str | None:
    try:
        return get_scheme_service().require_core(scheme_id).scheme_name
    except CatalogUnavailableError:
        return None


def _parse_iso(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed


def _journey(flags: list[bool]) -> list[DashboardJourneyStep]:
    steps: list[DashboardJourneyStep] = []
    found_current = False
    for key, reached in zip(JOURNEY_KEYS, flags, strict=True):
        status: JourneyStatus
        if reached:
            status = "completed"
        elif not found_current:
            status = "current"
            found_current = True
        else:
            status = "pending"
        steps.append(DashboardJourneyStep(key=key, status=status))
    return steps


def _document_latest_updates(session: Session, user_id: str, allowed: set[str]) -> dict[str, datetime]:
    try:
        rows = (
            session.query(DocumentChecklistProgressRecord)
            .filter(DocumentChecklistProgressRecord.user_id == user_id)
            .all()
        )
    except (OperationalError, InterfaceError) as exc:
        raise DatabaseUnavailableError("The dashboard database is unavailable.") from exc
    latest: dict[str, datetime] = {}
    for row in rows:
        if row.scheme_id not in allowed or row.updated_at is None:
            continue
        previous = latest.get(row.scheme_id)
        if previous is None or row.updated_at > previous:
            latest[row.scheme_id] = row.updated_at
    return latest


def build_dashboard_overview(session: Session, user_id: str) -> DashboardOverviewResponse:
    wallet = get_wallet_for_user(session, user_id)
    completeness_percent = 0
    if wallet is not None:
        completeness_percent = calculate_profile_completeness(wallet).percentage

    history = list_history_for_user(session, user_id)
    recommended_ids = recommended_core_scheme_ids(session, user_id)
    documents = list_document_progress(session, user_id)
    readiness = list_readiness(session, user_id)

    latest_count = history[0].recommendation_count if history else 0
    doc_percent = documents.overall_progress_percent
    readiness_percent = readiness.overall_progress_percent
    overall = round((doc_percent + readiness_percent) / 2) if recommended_ids else 0

    flags = [
        wallet is not None,
        completeness_percent == 100,
        len(history) > 0,
        len(recommended_ids) > 0,
        documents.schemes_with_progress > 0,
        readiness.schemes_being_prepared > 0,
    ]

    activity: list[DashboardActivityItem] = []
    for item in history:
        activity.append(
            DashboardActivityItem(
                kind="recommendation",
                occurred_at=item.checked_at.isoformat(),
                recommendation_count=item.recommendation_count,
                history_id=item.id,
                scheme_name=", ".join(scheme.scheme_name for scheme in item.recommended_schemes[:3]) or None,
            )
        )

    doc_updates = _document_latest_updates(session, user_id, set(recommended_ids))
    doc_percents = {row.scheme_id: row.progress_percent for row in documents.schemes}
    for scheme_id, updated_at in doc_updates.items():
        activity.append(
            DashboardActivityItem(
                kind="document",
                occurred_at=updated_at.isoformat(),
                scheme_id=scheme_id,
                scheme_name=_scheme_name(scheme_id),
                document_progress_percent=doc_percents.get(scheme_id),
            )
        )

    for scheme in readiness.schemes:
        if not scheme.has_saved_progress or scheme.updated_at is None:
            continue
        activity.append(
            DashboardActivityItem(
                kind="readiness",
                occurred_at=scheme.updated_at,
                scheme_id=scheme.scheme_id,
                scheme_name=scheme.scheme_name,
                readiness_stage=scheme.stage,
            )
        )

    activity.sort(key=lambda item: _parse_iso(item.occurred_at), reverse=True)

    return DashboardOverviewResponse(
        has_wallet=wallet is not None,
        progress=DashboardProgress(
            profile_completeness_percent=completeness_percent,
            eligibility_checked=len(history) > 0,
            latest_recommendation_count=latest_count,
            document_progress_percent=doc_percent,
            readiness_progress_percent=readiness_percent,
        ),
        journey=_journey(flags),
        summary=DashboardSummary(
            total_recommended_schemes=len(recommended_ids),
            schemes_being_prepared=readiness.schemes_being_prepared,
            schemes_with_document_progress=documents.schemes_with_progress,
            overall_preparation_progress=overall,
        ),
        activity=activity[:ACTIVITY_LIMIT],
        disclaimer=DASHBOARD_DISCLAIMER,
    )
