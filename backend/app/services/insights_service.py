"""Build eligibility insights from the owned wallet and existing hybrid engine.

Does not retrain the model, change ranking, or save recommendation history.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.schemas.compare import NOT_RECOMMENDED_LABEL, PREDICTED_ELIGIBLE_LABEL
from app.schemas.insights import INSIGHTS_DISCLAIMER, InsightReviewItem, InsightScheme, InsightsResponse
from app.schemas.recommendation import RecommendedScheme
from app.services.profile_completeness_service import calculate_profile_completeness
from app.services.recommendation_service import recommend_for_citizen
from app.services.rule_engine_service import evaluate_documented_rule
from app.services.scheme_service import get_scheme_service
from app.services.wallet_service import require_wallet_for_user, wallet_to_citizen_features


def _recommended_insight(item: RecommendedScheme) -> InsightScheme:
    return InsightScheme(
        scheme_id=item.scheme_id,
        scheme_name=item.scheme_name,
        official_source_url=item.official_source_url,
        status_label=PREDICTED_ELIGIBLE_LABEL,
        predicted_eligible=True,
        reason=item.reason,
        rule_reasons=list(item.rule_reasons),
        rule_eligible=item.rule_result.eligible,
        ml_prediction=item.ml_prediction,
        eligible_probability=item.eligible_probability,
        not_eligible_probability=item.not_eligible_probability,
        agreement=item.agreement,
    )


def _review_items(
    incomplete_fields: list[str],
    has_disagreement: bool,
) -> list[InsightReviewItem]:
    items = [
        InsightReviewItem(
            code="verify_profile",
            text="Verify that the saved socio-economic profile is current before relying on this research check.",
        )
    ]
    if incomplete_fields:
        items.append(
            InsightReviewItem(
                code="complete_profile",
                text="Complete missing profile fields so this prototype can evaluate the saved wallet more completely.",
            )
        )
    items.append(
        InsightReviewItem(
            code="review_official_source",
            text="Review official scheme requirements on the government website before applying.",
        )
    )
    if has_disagreement:
        items.append(
            InsightReviewItem(
                code="review_disagreement",
                text=(
                    "For some schemes, the documented rule and the Decision Tree differ. "
                    "The documented rule is the reference result. Review the documented scheme conditions."
                ),
            )
        )
    return items


def build_eligibility_insights(session: Session, user_id: str) -> InsightsResponse:
    wallet = require_wallet_for_user(session, user_id)
    citizen = wallet_to_citizen_features(wallet)
    recommendation = recommend_for_citizen(citizen)
    completeness = calculate_profile_completeness(wallet)
    catalog = get_scheme_service()

    recommended = [_recommended_insight(item) for item in recommendation.recommendations]
    recommended_ids = {item.scheme_id for item in recommended}
    other: list[InsightScheme] = []
    for evaluated in recommendation.evaluated_schemes:
        if evaluated.scheme_id in recommended_ids:
            continue
        record = catalog.require_core(evaluated.scheme_id)
        rule = evaluate_documented_rule(evaluated.scheme_id, citizen)
        other.append(
            InsightScheme(
                scheme_id=evaluated.scheme_id,
                scheme_name=evaluated.scheme_name,
                official_source_url=record.official_source_url,
                status_label=NOT_RECOMMENDED_LABEL,
                predicted_eligible=False,
                reason=evaluated.reason,
                rule_reasons=list(rule.rule_reasons),
                rule_eligible=bool(evaluated.rule_eligible),
                ml_prediction=evaluated.ml_prediction,
                eligible_probability=evaluated.eligible_probability,
                not_eligible_probability=evaluated.not_eligible_probability,
                agreement=bool(evaluated.agreement),
            )
        )

    schemes = [*recommended, *other]
    return InsightsResponse(
        total_schemes_evaluated=recommendation.total_schemes_evaluated,
        predicted_eligible_count=recommendation.eligible_scheme_count,
        not_recommended_count=len(other),
        recommended_schemes=recommended,
        other_schemes=other,
        completeness=completeness,
        review_items=_review_items(completeness.incomplete_fields, any(not item.agreement for item in schemes)),
        disclaimer=INSIGHTS_DISCLAIMER,
    )
