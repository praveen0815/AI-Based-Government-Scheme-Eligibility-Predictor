"""Deterministic prediction explanations. No LLM is used.

Human-readable text is built from the citizen's actual feature values and the
documented CORE scheme rules. Model-specific factors come from the fitted
pipeline (coefficients, decision path, or global importances).
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.tree import DecisionTreeClassifier

from eligibility_rules import evaluate_scheme
from ml_config import FEATURE_COLUMNS

SCHEME_TITLES = {
    "TN-SW-001": "Pudhumai Penn",
    "TN-SW-002": "Tamil Pudhalvan",
    "TN-SW-004": "Dharmambal widow remarriage",
    "TN-SW-006": "Annai Therasa orphan-girl marriage",
    "TN-REV-001": "Chief Minister's Uzhavar Pathukappu Thittam",
    "TN-REV-002": "Un-married Women Pension",
}

PROBABILITY_DISCLAIMER = (
    "These values are model prediction probabilities, not government approval "
    "and not a guarantee of eligibility."
)


def _as_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"true", "1", "yes"}


def _feature_frame(citizen: dict[str, Any], scheme_id: str) -> pd.DataFrame:
    row = {column: citizen[column] for column in FEATURE_COLUMNS if column != "scheme_id"}
    row["scheme_id"] = scheme_id
    return pd.DataFrame([row], columns=FEATURE_COLUMNS)


def human_readable_rule_explanation(citizen: dict[str, Any], scheme_id: str) -> str:
    """Explain eligibility from documented rules and this citizen's actual values."""
    title = SCHEME_TITLES.get(scheme_id, scheme_id)
    result = evaluate_scheme(scheme_id, citizen)
    age = citizen["age"]
    gender = citizen["gender"]
    school = citizen["school_background"]
    marital = citizen["marital_status"]
    occupation = citizen["occupation_category"]
    wet = float(citizen["wet_land_acres"])
    dry = float(citizen["dry_land_acres"])
    student = _as_bool(citizen["is_student"])
    first_course = _as_bool(citizen["first_higher_education_course"])
    orphan = _as_bool(citizen["is_orphan"])
    destitute = _as_bool(citizen["is_destitute"])

    if scheme_id == "TN-SW-001":
        if result.eligible:
            return (
                f"Eligible for {title} because the citizen is {gender}, is_student={student}, "
                f"first_higher_education_course={first_course}, and school_background={school}."
            )
        reasons = []
        if gender != "female":
            reasons.append(f"gender is {gender}, not female")
        if not student:
            reasons.append("the required student status is not satisfied")
        if not first_course:
            reasons.append("the first higher-education course condition is not satisfied")
        if school != "government_6_to_12":
            reasons.append(f"school_background is {school}, not government_6_to_12")
        return f"Not eligible for {title} because " + "; ".join(reasons) + "."

    if scheme_id == "TN-SW-002":
        if result.eligible:
            return (
                f"Eligible for {title} because the citizen is {gender}, is_student={student}, "
                f"first_higher_education_course={first_course}, and school_background={school}."
            )
        reasons = []
        if gender != "male":
            reasons.append(f"gender is {gender}, not male")
        if not student:
            reasons.append("the required student status is not satisfied")
        if not first_course:
            reasons.append("the first higher-education course condition is not satisfied")
        if school not in {
            "government_6_to_12",
            "government_or_aided_tamil_medium_6_to_12",
        }:
            reasons.append(f"school_background is {school}, which is not an accepted school path")
        return f"Not eligible for {title} because " + "; ".join(reasons) + "."

    if scheme_id == "TN-SW-004":
        if result.eligible:
            return (
                f"Eligible for {title} because the citizen is {gender}, "
                f"marital_status={marital}, and age={age} is 18 or above."
            )
        reasons = []
        if gender != "female":
            reasons.append(f"gender is {gender}, not female")
        if marital != "widow_remarrying":
            reasons.append(f"marital_status is {marital}, not widow_remarrying")
        if int(age) < 18:
            reasons.append(f"age is {age}, below 18")
        return f"Not eligible for {title} because " + "; ".join(reasons) + "."

    if scheme_id == "TN-SW-006":
        if result.eligible:
            return (
                f"Eligible for {title} because the citizen is {gender}, "
                f"is_orphan={orphan}, and age={age} is 18 or above."
            )
        reasons = []
        if gender != "female":
            reasons.append(f"gender is {gender}, not female")
        if not orphan:
            reasons.append("the required orphan status is not satisfied")
        if int(age) < 18:
            reasons.append(f"age is {age}, below 18")
        return f"Not eligible for {title} because " + "; ".join(reasons) + "."

    if scheme_id == "TN-REV-001":
        if result.eligible:
            return (
                f"Eligible for {title} because age={age} is within 18-65, "
                f"occupation_category={occupation}, and land satisfies the official wording "
                f"(wet={wet:.2f} or dry={dry:.2f})."
            )
        reasons = []
        if not (18 <= int(age) <= 65):
            reasons.append(f"age is {age}, outside 18-65")
        if occupation == "other":
            reasons.append("occupation_category is other, not an official main-member group")
        if wet > 2.50 and dry > 5.00:
            reasons.append(
                f"land exceeds both limits (wet={wet:.2f} > 2.50 and dry={dry:.2f} > 5.00)"
            )
        return f"Not eligible for {title} because " + "; ".join(reasons) + "."

    if scheme_id == "TN-REV-002":
        if result.eligible:
            return (
                f"Eligible for {title} because the citizen is {gender}, "
                f"marital_status={marital}, age={age} is 50 or above, and is_destitute={destitute}."
            )
        reasons = []
        if gender != "female":
            reasons.append(f"gender is {gender}, not female")
        if marital != "never_married":
            reasons.append(f"marital_status is {marital}, not never_married")
        if int(age) < 50:
            reasons.append(f"age is {age}, below 50")
        if not destitute:
            reasons.append("the required destitute status is not satisfied")
        return f"Not eligible for {title} because " + "; ".join(reasons) + "."

    return result.reason


def _decision_path_factors(pipeline: Pipeline, frame: pd.DataFrame) -> list[str]:
    tree = pipeline.named_steps["model"]
    if not isinstance(tree, DecisionTreeClassifier):
        return []
    preprocess = pipeline.named_steps["preprocess"]
    transformed = preprocess.transform(frame)
    names = list(preprocess.get_feature_names_out())
    node_indicator = tree.decision_path(transformed)
    node_index = node_indicator.indices[node_indicator.indptr[0] : node_indicator.indptr[1]]
    factors: list[str] = []
    for node_id in node_index:
        feature_idx = int(tree.tree_.feature[node_id])
        if feature_idx < 0:
            continue
        threshold = float(tree.tree_.threshold[node_id])
        value = float(transformed[0, feature_idx])
        direction = "<=" if value <= threshold else ">"
        factors.append(f"{names[feature_idx]} {direction} {threshold:.4f} (value={value:.4f})")
    return factors


def _logistic_contributions(pipeline: Pipeline, frame: pd.DataFrame) -> list[str]:
    preprocess = pipeline.named_steps["preprocess"]
    model = pipeline.named_steps["model"]
    transformed = preprocess.transform(frame)[0]
    names = list(preprocess.get_feature_names_out())
    contributions = model.coef_[0] * transformed
    ranked = sorted(
        zip(names, contributions, strict=True),
        key=lambda item: abs(item[1]),
        reverse=True,
    )
    factors: list[str] = []
    for name, contribution in ranked[:8]:
        sign = "supports eligible" if contribution > 0 else "supports not eligible"
        factors.append(f"{name}: {contribution:+.4f} ({sign})")
    return factors


def _random_forest_global_factors(pipeline: Pipeline) -> list[str]:
    preprocess = pipeline.named_steps["preprocess"]
    model = pipeline.named_steps["model"]
    names = list(preprocess.get_feature_names_out())
    ranked = sorted(
        zip(names, model.feature_importances_, strict=True),
        key=lambda item: item[1],
        reverse=True,
    )
    return [
        f"{name}: global importance {importance:.4f} (model-level, not this row only)"
        for name, importance in ranked[:8]
    ]


def explain_prediction(
    citizen: dict[str, Any],
    scheme_id: str,
    pipeline: Pipeline,
    model_name: str,
) -> dict[str, Any]:
    """Return a structured explanation for one citizen-scheme prediction."""
    frame = _feature_frame(citizen, scheme_id)
    predicted = int(pipeline.predict(frame)[0])
    if hasattr(pipeline, "predict_proba"):
        proba = pipeline.predict_proba(frame)[0]
        probability_not_eligible = float(proba[0])
        probability_eligible = float(proba[1])
    else:
        probability_eligible = float(predicted)
        probability_not_eligible = 1.0 - probability_eligible

    prediction_label = "eligible" if predicted == 1 else "not_eligible"
    confidence = probability_eligible if predicted == 1 else probability_not_eligible

    if model_name == "decision_tree":
        important_factors = _decision_path_factors(pipeline, frame)
        factor_method = "decision_tree_path"
    elif model_name == "logistic_regression":
        important_factors = _logistic_contributions(pipeline, frame)
        factor_method = "logistic_coefficient_contributions"
    elif model_name == "random_forest":
        important_factors = _random_forest_global_factors(pipeline)
        factor_method = "random_forest_global_importance"
    else:
        important_factors = []
        factor_method = "none"

    rule = evaluate_scheme(scheme_id, citizen)
    return {
        "scheme_id": scheme_id,
        "scheme_name": SCHEME_TITLES.get(scheme_id, scheme_id),
        "model_name": model_name,
        "prediction": prediction_label,
        "confidence": round(confidence, 4),
        "probability_eligible": round(probability_eligible, 4),
        "probability_not_eligible": round(probability_not_eligible, 4),
        "important_factors": important_factors,
        "factor_method": factor_method,
        "human_readable": human_readable_rule_explanation(citizen, scheme_id),
        "rule_label": "eligible" if rule.eligible else "not_eligible",
        "agrees_with_rule_engine": predicted == int(rule.eligible),
        "disclaimer": PROBABILITY_DISCLAIMER,
    }
