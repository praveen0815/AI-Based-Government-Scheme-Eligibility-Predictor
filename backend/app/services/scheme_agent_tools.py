"""Allowlisted read-only tools. The agent cannot update data or call arbitrary APIs."""

from __future__ import annotations

from typing import Any, Callable

from sqlalchemy.orm import Session

from app.schemas.scheme_agent import ALLOWED_AGENT_TOOLS
from app.services.application_service import list_applications
from app.services.document_checklist_service import get_scheme_checklist, list_document_progress
from app.services.profile_completeness_service import calculate_profile_completeness
from app.services.readiness_service import list_readiness
from app.services.recommendation_service import recommend_for_citizen
from app.services.scheme_knowledge_service import SchemeKnowledgeNotFoundError, get_scheme_knowledge, list_scheme_knowledge
from app.services.scheme_service import get_scheme_service
from app.services.upload_service import list_uploads
from app.services.wallet_service import get_wallet_for_user, wallet_to_citizen_features

WRITE_TOOLS = frozenset(
    {
        "update_wallet",
        "create_wallet",
        "delete_wallet",
        "create_upload",
        "delete_upload",
        "update_document_status",
        "update_readiness",
        "create_application",
        "update_application",
        "delete_application",
        "update_scheme_knowledge",
        "submit_application",
        "confirm_scan",
        "create_scan",
    }
)


class AgentToolRejectedError(Exception):
    """Raised when a tool is outside the read-only allowlist."""


class AgentToolError(Exception):
    """Raised when an allowed tool cannot complete."""


_recommend: Callable[[dict[str, Any]], Any] = recommend_for_citizen


def set_recommend_fn(fn: Callable[[dict[str, Any]], Any] | None) -> None:
    """Test hook. Pass None to restore the existing Hybrid Rule + ML service."""
    global _recommend
    _recommend = recommend_for_citizen if fn is None else fn


def run_tool(
    name: str,
    *,
    session: Session | None,
    user_id: str,
    scheme_id: str | None = None,
    query: str | None = None,
) -> dict[str, Any]:
    if name in WRITE_TOOLS or name not in ALLOWED_AGENT_TOOLS:
        raise AgentToolRejectedError(f"The scheme agent cannot run '{name}'. It is read-only.")
    handlers: dict[str, Callable[..., dict[str, Any]]] = {
        "get_profile_completeness": _profile_completeness,
        "search_schemes": _search_schemes,
        "check_eligibility": _check_eligibility,
        "get_scheme_knowledge": _scheme_knowledge,
        "get_document_readiness": _document_readiness,
        "get_application_status": _application_status,
    }
    return handlers[name](session=session, user_id=user_id, scheme_id=scheme_id, query=query)


def _need_session(session: Session | None) -> Session:
    if session is None:
        raise AgentToolError("The data wallet database is not available.")
    return session


def _profile_completeness(
    *,
    session: Session | None,
    user_id: str,
    scheme_id: str | None = None,
    query: str | None = None,
) -> dict[str, Any]:
    _ = scheme_id, query
    wallet = get_wallet_for_user(_need_session(session), user_id)
    if wallet is None:
        return {"has_wallet": False, "percentage": 0, "incomplete_fields": [], "completed_fields": 0, "total_fields": 11}
    completeness = calculate_profile_completeness(wallet)
    return {
        "has_wallet": True,
        "percentage": completeness.percentage,
        "incomplete_fields": list(completeness.incomplete_fields),
        "completed_fields": completeness.completed_fields,
        "total_fields": completeness.total_fields,
    }


def _search_schemes(
    *,
    session: Session | None,
    user_id: str,
    scheme_id: str | None = None,
    query: str | None = None,
) -> dict[str, Any]:
    _ = user_id
    needle = (query or "").strip()
    if scheme_id:
        record = get_scheme_knowledge(session, scheme_id)
        return {
            "scheme_count": 1,
            "schemes": [_knowledge_card(record)],
            "disclaimer": record.disclaimer,
        }
    listed = list_scheme_knowledge(session, q=needle or None)
    schemes = listed.schemes
    if not needle:
        core_ids = {item.scheme_id for item in get_scheme_service().ml_core_schemes()}
        schemes = [item for item in listed.schemes if item.scheme_id in core_ids]
    return {
        "scheme_count": len(schemes),
        "schemes": [_knowledge_card(item) for item in schemes[:8]],
        "disclaimer": listed.disclaimer,
    }


def _check_eligibility(
    *,
    session: Session | None,
    user_id: str,
    scheme_id: str | None = None,
    query: str | None = None,
) -> dict[str, Any]:
    _ = query
    wallet = get_wallet_for_user(_need_session(session), user_id)
    if wallet is None:
        return {"has_wallet": False}
    result = _recommend(wallet_to_citizen_features(wallet))
    recommendations = [
        {
            "scheme_id": item.scheme_id,
            "scheme_name": item.scheme_name,
            "prediction": item.prediction,
            "status_label": item.status_label,
            "reason": item.reason,
            "official_source_url": item.official_source_url,
            "rule_eligible": item.rule_result.eligible,
            "ml_prediction": item.ml_prediction,
            "agreement": item.agreement,
        }
        for item in result.recommendations
    ]
    evaluated = [
        {
            "scheme_id": item.scheme_id,
            "scheme_name": item.scheme_name,
            "prediction": item.prediction,
            "reason": item.reason,
            "rule_eligible": item.rule_eligible,
            "ml_prediction": item.ml_prediction,
            "agreement": item.agreement,
        }
        for item in result.evaluated_schemes
        if scheme_id is None or item.scheme_id == scheme_id
    ]
    if scheme_id:
        recommendations = [item for item in recommendations if item["scheme_id"] == scheme_id]
    return {
        "has_wallet": True,
        "total_schemes_evaluated": result.total_schemes_evaluated,
        "eligible_scheme_count": result.eligible_scheme_count,
        "recommendations": recommendations,
        "evaluated_schemes": evaluated,
        "disclaimer": result.disclaimer,
    }


def _scheme_knowledge(
    *,
    session: Session | None,
    user_id: str,
    scheme_id: str | None = None,
    query: str | None = None,
) -> dict[str, Any]:
    _ = user_id, query
    if not scheme_id:
        raise AgentToolError("A scheme ID is required before scheme knowledge can be retrieved.")
    try:
        record = get_scheme_knowledge(session, scheme_id)
    except SchemeKnowledgeNotFoundError as exc:
        raise AgentToolError(str(exc)) from exc
    return {
        "scheme_id": record.scheme_id,
        "scheme_name": record.scheme_name,
        "official_source_url": record.official_source_url,
        "items": [
            {
                "field_key": item.field_key,
                "label": item.label,
                "value": item.value,
                "verification_status": item.verification_status,
                "content_state": item.content_state,
                "source_url": item.source_url,
                "last_verified_at": item.last_verified_at,
            }
            for item in record.items
        ],
        "disclaimer": record.disclaimer,
    }


def _document_readiness(
    *,
    session: Session | None,
    user_id: str,
    scheme_id: str | None = None,
    query: str | None = None,
) -> dict[str, Any]:
    _ = query
    db = _need_session(session)
    progress = list_document_progress(db, user_id)
    readiness = list_readiness(db, user_id)
    uploads = list_uploads(db, user_id, scheme_id)
    checklist = None
    if scheme_id and any(item.scheme_id == scheme_id for item in progress.schemes):
        detail = get_scheme_checklist(db, user_id, scheme_id)
        checklist = {
            "scheme_id": detail.scheme_id,
            "scheme_name": detail.scheme_name,
            "documents_need_verification": detail.documents_need_verification,
            "required_documents_text": detail.required_documents_text,
            "progress_percent": detail.progress_percent,
            "items": [
                {"label": item.label, "status": item.status, "source": item.source} for item in detail.items
            ],
        }
    return {
        "schemes_with_progress": progress.schemes_with_progress,
        "overall_progress_percent": progress.overall_progress_percent,
        "checklists": [
            {
                "scheme_id": item.scheme_id,
                "scheme_name": item.scheme_name,
                "progress_percent": item.progress_percent,
                "ready_count": item.ready_count,
                "item_count": item.item_count,
                "documents_need_verification": item.documents_need_verification,
            }
            for item in progress.schemes
        ],
        "checklist": checklist,
        "readiness": [
            {
                "scheme_id": item.scheme_id,
                "scheme_name": item.scheme_name,
                "stage": item.stage,
                "progress_percent": item.progress_percent,
            }
            for item in readiness.schemes
        ],
        "uploads": [
            {
                "category": item.category,
                "review_status": item.review_status,
                "scheme_id": item.scheme_id,
            }
            for item in uploads.uploads
        ],
        "upload_disclaimer": uploads.disclaimer,
        "checklist_disclaimer": progress.disclaimer,
        "readiness_disclaimer": readiness.disclaimer,
    }


def _application_status(
    *,
    session: Session | None,
    user_id: str,
    scheme_id: str | None = None,
    query: str | None = None,
) -> dict[str, Any]:
    _ = query
    listed = list_applications(_need_session(session), user_id)
    rows = listed.applications
    if scheme_id:
        rows = [item for item in rows if item.scheme_id == scheme_id]
    return {
        "count": len(rows),
        "applications": [
            {
                "scheme_id": item.scheme_id,
                "scheme_name": item.scheme_name,
                "status": item.status,
                "application_date": item.application_date.isoformat() if item.application_date else None,
            }
            for item in rows
        ],
        "disclaimer": listed.disclaimer,
    }


def _knowledge_card(record: Any) -> dict[str, Any]:
    return {
        "scheme_id": record.scheme_id,
        "scheme_name": record.scheme_name,
        "department": record.department,
        "official_source_url": record.official_source_url,
        "ml_scope": record.ml_scope,
        "verification": [
            {
                "field_key": item.field_key,
                "verification_status": item.verification_status,
                "source_url": item.source_url,
            }
            for item in record.items
            if item.field_key in {"description", "official_source_url"}
        ],
    }
