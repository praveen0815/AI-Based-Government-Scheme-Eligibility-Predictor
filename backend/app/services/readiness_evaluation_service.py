"""Scheme-specific application readiness evaluation.

Eligibility comes only from the documented rule engine. Readiness is reported separately:
missing profile information, missing mandatory documents and unverified official requirements
are distinct states, and missing information is never reported as ineligibility. The Decision
Tree is attached only as an independent comparison. Nothing is written to the database.
"""

from __future__ import annotations

from sqlalchemy.exc import InterfaceError, OperationalError
from sqlalchemy.orm import Session

from app.db.session import DatabaseUnavailableError
from app.models.readiness import ApplicationReadinessRecord
from app.paths import ensure_ml_src_on_path
from app.schemas.readiness import (
    READINESS_STAGES,
    STAGES_CLAIMING_READY,
    DocumentsSection,
    EligibilityOutcome,
    EligibilitySection,
    EvaluatedCondition,
    EvaluatedDocument,
    ManualStageSection,
    MlComparison,
    ProfileSection,
    ReadinessEvaluationListResponse,
    ReadinessState,
    SchemeReadinessEvaluation,
)
from app.schemas.requirements import SchemeRequirements
from app.schemas.wallet import CitizenWalletResponse
from app.services.document_checklist_service import saved_document_statuses
from app.services.hybrid_prediction_service import compare_rule_and_ml
from app.services.model_service import ModelUnavailableError
from app.services.rule_engine_service import RuleEvaluation, evaluate_documented_rule, unverified_items_for
from app.services.scheme_requirements_service import get_scheme_requirements
from app.services.scheme_service import CatalogUnavailableError, get_scheme_service
from app.services.wallet_service import get_wallet_for_user, wallet_to_citizen_features

ensure_ml_src_on_path()

from ml_config import CORE_SCHEME_IDS  # noqa: E402

UNSPECIFIED_LEVEL_ITEM = "whether each listed document is mandatory or optional is not stated by the source"
_DOCUMENT_STATUSES = {"not_started", "ready", "needs_verification"}


class ReadinessEvaluationNotFoundError(Exception):
    """Raised when the scheme is not a rule-evaluated CORE catalog scheme."""


def _manual_stages(session: Session, user_id: str) -> dict[str, str]:
    try:
        rows = (
            session.query(ApplicationReadinessRecord)
            .filter(ApplicationReadinessRecord.user_id == user_id)
            .all()
        )
    except (OperationalError, InterfaceError) as exc:
        raise DatabaseUnavailableError("The application readiness database is unavailable.") from exc
    return {row.scheme_id: row.stage for row in rows if row.stage in READINESS_STAGES}


def _missing_profile_fields(wallet: CitizenWalletResponse | None, required: list[str]) -> list[str]:
    if wallet is None:
        return list(required)
    values = wallet.model_dump()
    return [name for name in required if values.get(name) is None]


def _conditions(
    requirements: SchemeRequirements, rule: RuleEvaluation | None
) -> list[EvaluatedCondition]:
    checks = rule.condition_checks if rule is not None else []
    aligned = len(checks) == len(requirements.conditions)
    evaluated: list[EvaluatedCondition] = []
    for index, condition in enumerate(requirements.conditions):
        outcome = "unknown"
        reason = None
        if rule is not None and aligned:
            passed, reason = checks[index]
            outcome = "met" if passed else "not_met"
        evaluated.append(
            EvaluatedCondition(
                key=condition.key,
                label=condition.label,
                outcome=outcome,  # type: ignore[arg-type]
                rule_reason=reason,
                profile_fields=condition.profile_fields,
                verification_status=condition.verification_status,
                basis=condition.basis,
                note=condition.note,
            )
        )
    return evaluated


def _ml_comparison(scheme_id: str, features: dict, rule: RuleEvaluation) -> MlComparison | None:
    try:
        hybrid = compare_rule_and_ml(scheme_id, features)
    except ModelUnavailableError:
        return None
    return MlComparison(
        prediction=hybrid.ml_prediction,
        eligible_probability=hybrid.eligible_probability,
        agrees_with_rule=(hybrid.ml_prediction == "eligible") == rule.rule_eligible,
    )


def _documents(requirements: SchemeRequirements, saved: dict[str, str]) -> DocumentsSection:
    items = [
        EvaluatedDocument(
            key=document.key,
            label=document.label,
            requirement=document.requirement,
            verification_status=document.verification_status,
            citizen_status=saved.get(document.key) if saved.get(document.key) in _DOCUMENT_STATUSES else "not_started",  # type: ignore[arg-type]
        )
        for document in requirements.documents
    ]
    return DocumentsSection(
        documents_status=requirements.documents_status,
        items=items,
        mandatory_missing=[
            item.label for item in items if item.requirement == "mandatory" and item.citizen_status != "ready"
        ],
        requirement_level_unspecified=any(item.requirement == "unspecified" for item in items),
    )


def _evaluate(
    session: Session,
    scheme_id: str,
    wallet: CitizenWalletResponse | None,
    saved_documents: dict[str, str],
    manual_stage: str | None,
) -> SchemeReadinessEvaluation:
    try:
        record = get_scheme_service().require_core(scheme_id)
    except CatalogUnavailableError as exc:
        raise ReadinessEvaluationNotFoundError("No readiness evaluation is available for that scheme.") from exc
    requirements = get_scheme_requirements(session, scheme_id)
    missing_fields = _missing_profile_fields(wallet, requirements.required_profile_fields)

    rule: RuleEvaluation | None = None
    ml: MlComparison | None = None
    outcome: EligibilityOutcome = "insufficient_information"
    if not missing_fields and wallet is not None:
        features = wallet_to_citizen_features(wallet)
        rule = evaluate_documented_rule(scheme_id, features)
        outcome = "eligible_under_rules" if rule.rule_eligible else "ineligible_under_rules"
        ml = _ml_comparison(scheme_id, features, rule)
    conditions = _conditions(requirements, rule)
    documents = _documents(requirements, saved_documents)

    unverified = list(requirements.unverified_items)
    if documents.requirement_level_unspecified:
        unverified.append(UNSPECIFIED_LEVEL_ITEM)

    blocking: list[str] = []
    state: ReadinessState
    if outcome == "insufficient_information":
        state = "insufficient_information"
        if wallet is None:
            blocking.append("No saved profile. Create your data wallet so the documented rules can be checked.")
        else:
            blocking.append("Profile information missing: " + ", ".join(missing_fields) + ".")
    elif outcome == "ineligible_under_rules":
        state = "ineligible_under_rules"
        blocking.extend(
            f"Documented condition not met: {condition.label}."
            for condition in conditions
            if condition.outcome == "not_met"
        )
    else:
        if documents.mandatory_missing:
            blocking.append("Mandatory documents not marked ready: " + ", ".join(documents.mandatory_missing) + ".")
        if unverified:
            blocking.append(
                "Some official requirements are not yet confirmed. Check the official source before applying."
            )
        if documents.mandatory_missing:
            state = "missing_mandatory_documents"
        elif unverified:
            state = "unverified_requirements"
        else:
            state = "eligible_under_rules"

    stage_consistent = not (manual_stage in STAGES_CLAIMING_READY and state != "eligible_under_rules")
    return SchemeReadinessEvaluation(
        scheme_id=record.scheme_id,
        scheme_name=record.scheme_name,
        readiness_state=state,
        blocking_reasons=blocking,
        eligibility=EligibilitySection(
            outcome=outcome,
            rule_status=record.eligibility_rule_status,
            conditions=conditions,
            verification_notes=(
                rule.verification_notes
                if rule is not None
                else ("; ".join(unverified_items_for(record)) or None)
            ),
        ),
        profile=ProfileSection(
            has_wallet=wallet is not None,
            required_fields=requirements.required_profile_fields,
            missing_fields=missing_fields,
        ),
        documents=documents,
        unverified_requirements=unverified,
        application_steps=[step.text for step in requirements.application_steps],
        official_source_url=record.official_source_url,
        ml_comparison=ml,
        manual_stage=ManualStageSection(
            stage=manual_stage,  # type: ignore[arg-type]
            consistent_with_evaluation=stage_consistent,
            note=(
                None
                if stage_consistent
                else "Your saved preparation stage says you are ready, but this evaluation still has open items."
            ),
        ),
        last_checked=requirements.last_checked,
    )


def evaluate_scheme_readiness(session: Session, user_id: str, scheme_id: str) -> SchemeReadinessEvaluation:
    if scheme_id not in CORE_SCHEME_IDS:
        raise ReadinessEvaluationNotFoundError("No readiness evaluation is available for that scheme.")
    wallet = get_wallet_for_user(session, user_id)
    return _evaluate(
        session,
        scheme_id,
        wallet,
        saved_document_statuses(session, user_id, scheme_id),
        _manual_stages(session, user_id).get(scheme_id),
    )


def list_readiness_evaluations(session: Session, user_id: str) -> ReadinessEvaluationListResponse:
    wallet = get_wallet_for_user(session, user_id)
    stages = _manual_stages(session, user_id)
    schemes = [
        _evaluate(session, scheme_id, wallet, saved_document_statuses(session, user_id, scheme_id), stages.get(scheme_id))
        for scheme_id in CORE_SCHEME_IDS
    ]
    return ReadinessEvaluationListResponse(schemes=schemes, count=len(schemes))
