"""Compare selected CORE schemes using the existing hybrid engine.

Does not store eligibility decisions. Does not change recommendation ranking.
"""

from __future__ import annotations

from typing import Any

from app.paths import ensure_ml_src_on_path
from app.schemas.compare import (
    COMPARE_DISCLAIMER,
    NOT_RECOMMENDED_LABEL,
    PREDICTED_ELIGIBLE_LABEL,
    ComparedScheme,
    CompareResponse,
)
from app.schemas.prediction import RuleResultPayload
from app.services.hybrid_prediction_service import HybridPrediction, compare_rule_and_ml
from app.services.scheme_service import get_scheme_service

ensure_ml_src_on_path()

from ml_config import CORE_SCHEME_IDS  # noqa: E402


class CompareSelectionError(Exception):
    """Raised when the selected schemes cannot be compared."""


def compare_core_schemes(citizen: dict[str, Any], scheme_ids: list[str]) -> CompareResponse:
    selected = [str(scheme_id) for scheme_id in scheme_ids]
    if len(selected) < 2 or len(selected) > 3:
        raise CompareSelectionError("Select 2 or 3 CORE schemes to compare.")
    if len(set(selected)) != len(selected):
        raise CompareSelectionError("Scheme IDs must be unique.")

    catalog = get_scheme_service()
    schemes: list[ComparedScheme] = []
    for scheme_id in selected:
        if scheme_id not in CORE_SCHEME_IDS:
            raise CompareSelectionError("Only CORE schemes can be compared.")
        record = catalog.require_core(scheme_id)
        hybrid = compare_rule_and_ml(scheme_id, citizen)
        recommended = bool(hybrid.rule.rule_eligible)
        schemes.append(
            ComparedScheme(
                scheme_id=record.scheme_id,
                scheme_name=record.scheme_name,
                department=record.department,
                scheme_category=record.scheme_category,
                description=record.description,
                eligibility_notes=record.eligibility_notes,
                benefit=record.benefit_description,
                required_documents=record.required_documents,
                application_method=record.application_method,
                official_source_url=record.official_source_url,
                recommended=recommended,
                status_label=PREDICTED_ELIGIBLE_LABEL if recommended else NOT_RECOMMENDED_LABEL,
                prediction=hybrid.reference_prediction,
                eligible_probability=hybrid.eligible_probability,
                not_eligible_probability=hybrid.not_eligible_probability,
                reason=hybrid.explanation,
                rule_result=_rule_payload(hybrid),
                rule_reasons=hybrid.rule.rule_reasons,
                ml_prediction=hybrid.ml_prediction,
                agreement=hybrid.agreement,
            )
        )
    return CompareResponse(
        scheme_count=len(schemes),
        schemes=schemes,
        disclaimer=COMPARE_DISCLAIMER,
    )


def _rule_payload(hybrid: HybridPrediction) -> RuleResultPayload:
    return RuleResultPayload(
        eligible=hybrid.rule.rule_eligible,
        reasons=hybrid.rule.rule_reasons,
        rule_status=hybrid.rule.rule_status,
        verification_notes=hybrid.rule.verification_notes,
    )
