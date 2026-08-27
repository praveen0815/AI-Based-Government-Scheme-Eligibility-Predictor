"""Evaluate all CORE schemes for one citizen. Does not retrain or reload the model."""

from __future__ import annotations

from typing import Any

from app.paths import ensure_ml_src_on_path
from app.schemas.prediction import RuleResultPayload
from app.schemas.recommendation import (
    RANKING_RULE,
    RECOMMENDATION_DISCLAIMER,
    EvaluatedScheme,
    RecommendResponse,
    RecommendedScheme,
)
from app.services.hybrid_prediction_service import HybridPrediction, compare_rule_and_ml
from app.services.scheme_service import SchemeRecord, get_scheme_service

ensure_ml_src_on_path()

from ml_config import CORE_SCHEME_IDS  # noqa: E402


def _rank_eligible(items: list[RecommendedScheme]) -> list[RecommendedScheme]:
    """Deterministic ranking: higher model probability first, then scheme_id."""
    return sorted(
        items,
        key=lambda item: (-item.eligible_probability, item.scheme_id),
    )


def _rule_payload(hybrid: HybridPrediction) -> RuleResultPayload:
    return RuleResultPayload(
        eligible=hybrid.rule.rule_eligible,
        reasons=hybrid.rule.rule_reasons,
        rule_status=hybrid.rule.rule_status,
        verification_notes=hybrid.rule.verification_notes,
    )


def _to_recommended(record: SchemeRecord, hybrid: HybridPrediction) -> RecommendedScheme:
    return RecommendedScheme(
        scheme_id=record.scheme_id,
        scheme_name=record.scheme_name,
        department=record.department,
        scheme_category=record.scheme_category,
        description=record.description,
        prediction="eligible",
        status_label="Predicted eligible",
        eligible_probability=hybrid.eligible_probability,
        not_eligible_probability=hybrid.not_eligible_probability,
        reason=hybrid.explanation,
        benefit=record.benefit_description,
        required_documents=record.required_documents,
        application_method=record.application_method,
        official_source_url=record.official_source_url,
        rule_result=_rule_payload(hybrid),
        rule_reasons=hybrid.rule.rule_reasons,
        ml_prediction=hybrid.ml_prediction,
        agreement=hybrid.agreement,
    )


def recommend_for_citizen(citizen: dict[str, Any]) -> RecommendResponse:
    catalog = get_scheme_service()

    evaluated: list[EvaluatedScheme] = []
    recommendations: list[RecommendedScheme] = []

    for scheme_id in CORE_SCHEME_IDS:
        record = catalog.require_core(scheme_id)
        hybrid = compare_rule_and_ml(scheme_id, citizen)
        evaluated.append(
            EvaluatedScheme(
                scheme_id=record.scheme_id,
                scheme_name=record.scheme_name,
                prediction=hybrid.reference_prediction,
                eligible_probability=hybrid.eligible_probability,
                not_eligible_probability=hybrid.not_eligible_probability,
                reason=hybrid.explanation,
                rule_eligible=hybrid.rule.rule_eligible,
                ml_prediction=hybrid.ml_prediction,
                agreement=hybrid.agreement,
            )
        )
        if hybrid.rule.rule_eligible:
            recommendations.append(_to_recommended(record, hybrid))

    return RecommendResponse(
        total_schemes_evaluated=len(CORE_SCHEME_IDS),
        eligible_scheme_count=len(recommendations),
        ranking_rule=RANKING_RULE,
        recommendations=_rank_eligible(recommendations),
        evaluated_schemes=evaluated,
        disclaimer=RECOMMENDATION_DISCLAIMER,
    )
