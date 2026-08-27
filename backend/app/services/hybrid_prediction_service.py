"""Hybrid documented-rule + Decision Tree comparison. Does not retrain."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.schemas.prediction import API_DISCLAIMER, PredictionLabel
from app.services.explanation_service import explain_citizen_prediction
from app.services.model_service import get_model_service
from app.services.rule_engine_service import RuleEvaluation, evaluate_documented_rule

AGREE_TEXT = "Rule and ML prediction agree."
DISAGREE_TEXT = (
    "Rule and ML prediction differ. The documented rule result is shown as the reference result."
)
DISAGREE_REVIEW_TEXT = (
    "Rule and ML prediction differ. Please review the documented scheme conditions."
)


@dataclass(frozen=True)
class HybridPrediction:
    scheme_id: str
    rule: RuleEvaluation
    ml_prediction: PredictionLabel
    eligible_probability: float
    not_eligible_probability: float
    ml_explanation: str
    agreement: bool
    explanation: str
    disclaimer: str

    @property
    def reference_prediction(self) -> PredictionLabel:
        return "eligible" if self.rule.rule_eligible else "not_eligible"


def _rule_line(rule: RuleEvaluation) -> str:
    joined = "; ".join(rule.rule_reasons) if rule.rule_reasons else rule.reason_text
    if rule.rule_eligible:
        return f"Documented scheme conditions satisfied: {joined}."
    return f"Documented scheme conditions not satisfied: {joined}."


def _ml_line(prediction: PredictionLabel, probability: float) -> str:
    label = "Eligible" if prediction == "eligible" else "Not eligible"
    return f"Decision Tree prediction: {label} (model probability: {probability:.2f})"


def _agreement_text(agreement: bool) -> str:
    return AGREE_TEXT if agreement else DISAGREE_TEXT


def compare_rule_and_ml(scheme_id: str, citizen: dict[str, Any]) -> HybridPrediction:
    rule = evaluate_documented_rule(scheme_id, citizen)
    pipeline = get_model_service().pipeline()
    ml = explain_citizen_prediction(citizen=citizen, scheme_id=scheme_id, pipeline=pipeline)
    ml_prediction: PredictionLabel = ml["prediction"]
    eligible_probability = float(ml["probability_eligible"])
    not_eligible_probability = float(ml["probability_not_eligible"])
    agreement = (ml_prediction == "eligible") == rule.rule_eligible
    explanation = " ".join(
        [
            _rule_line(rule),
            _ml_line(ml_prediction, eligible_probability),
            _agreement_text(agreement) if agreement else DISAGREE_REVIEW_TEXT,
            str(ml["human_readable"]),
        ]
    )
    return HybridPrediction(
        scheme_id=scheme_id,
        rule=rule,
        ml_prediction=ml_prediction,
        eligible_probability=eligible_probability,
        not_eligible_probability=not_eligible_probability,
        ml_explanation=str(ml["human_readable"]),
        agreement=agreement,
        explanation=explanation,
        disclaimer=API_DISCLAIMER,
    )
