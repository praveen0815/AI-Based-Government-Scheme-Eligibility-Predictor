"""On-demand PDF reports. Files are generated in memory and not stored."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.db.session import get_db, require_db
from app.deps import get_current_user
from app.models.user import UserRecord
from app.schemas.report import RecommendationReportRequest
from app.services.compare_service import compare_core_schemes
from app.services.profile_completeness_service import calculate_profile_completeness
from app.services.recommendation_service import recommend_for_citizen
from app.services.report_service import generate_recommendation_report_pdf
from app.services.wallet_service import require_wallet_for_user, wallet_to_citizen_features

router = APIRouter(prefix="/api/v1", tags=["reports"])

_PROTOTYPE_NOTE = (
    "Requires a JWT. The report is generated from the caller's wallet, the "
    "existing recommendation service, and optional CORE comparison IDs. "
    "Eligibility labels supplied by the client are ignored. The PDF is not stored."
)


@router.post(
    "/reports/recommendations",
    summary="Download a recommendation PDF for the authenticated user's wallet",
    description=_PROTOTYPE_NOTE,
    responses={
        200: {
            "content": {"application/pdf": {}},
            "description": "Generated research recommendation report",
        }
    },
)
def create_recommendation_report(
    payload: RecommendationReportRequest,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> Response:
    wallet = require_wallet_for_user(require_db(session), current_user.id)
    features = wallet_to_citizen_features(wallet)
    recommendation = recommend_for_citizen(features)
    comparison = None
    if payload.compare_scheme_ids:
        comparison = compare_core_schemes(features, list(payload.compare_scheme_ids))
    pdf_bytes = generate_recommendation_report_pdf(
        user=current_user,
        wallet=wallet,
        completeness=calculate_profile_completeness(wallet),
        recommendation=recommendation,
        comparison=comparison,
        language=payload.language,
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="schemewise-recommendation-report.pdf"',
            "Cache-Control": "no-store",
        },
    )
