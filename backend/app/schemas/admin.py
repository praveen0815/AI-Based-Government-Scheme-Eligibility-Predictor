"""Admin portal payloads. Never include passwords, JWTs, or Google tokens."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.applications import ApplicationItem
from app.schemas.completeness import ProfileCompletenessResponse
from app.schemas.history import RecommendationHistoryItem
from app.schemas.recommendation import EvaluatedScheme
from app.schemas.uploads import UploadReviewStatus
from app.schemas.wallet import CitizenWalletResponse

ADMIN_DISCLAIMER = (
    "Administrator monitoring for this academic research prototype. "
    "Eligibility values are existing Hybrid Rule + ML predictions only. "
    "They are not government approval, and document review does not change eligibility."
)


class AdminDocumentStatusUpdate(BaseModel):
    review_status: UploadReviewStatus


class AdminActivityItem(BaseModel):
    activity_type: Literal["history", "upload", "application", "wallet"]
    occurred_at: str
    user_id: str
    user_name: str
    user_email: str
    summary: str


class AdminOverviewResponse(BaseModel):
    total_users: int = Field(..., ge=0)
    active_users: int = Field(..., ge=0)
    total_document_uploads: int = Field(..., ge=0)
    pending_document_reviews: int = Field(..., ge=0)
    verified_documents: int = Field(..., ge=0)
    rejected_documents: int = Field(..., ge=0)
    eligible_scheme_results: int = Field(..., ge=0)
    not_eligible_scheme_results: int = Field(..., ge=0)
    cannot_fully_evaluate_users: int = Field(..., ge=0)
    recent_activity: list[AdminActivityItem]
    disclaimer: str


class AdminUserSummary(BaseModel):
    user_id: str
    full_name: str
    email: str
    has_wallet: bool
    is_admin: bool
    created_at: str | None = None
    last_activity_at: str | None = None


class AdminUserListResponse(BaseModel):
    users: list[AdminUserSummary]
    count: int = Field(..., ge=0)
    disclaimer: str


class AdminWalletView(BaseModel):
    citizen_id: str
    age: int
    gender: str
    is_student: bool
    first_higher_education_course: bool
    school_background: str
    marital_status: str
    is_orphan: bool
    is_destitute: bool
    occupation_category: str
    wet_land_acres: float
    dry_land_acres: float


class AdminEligibilityView(BaseModel):
    has_wallet: bool
    prediction_label: Literal["eligible", "not_eligible", "cannot_fully_evaluate", "not_evaluated"]
    eligible_scheme_count: int = Field(..., ge=0)
    evaluated_schemes: list[EvaluatedScheme]
    incomplete_fields: list[str]
    last_checked_at: str | None = None
    disclaimer: str


class AdminUserDetailResponse(BaseModel):
    user: AdminUserSummary
    wallet: AdminWalletView | None
    completeness: ProfileCompletenessResponse | None
    eligibility: AdminEligibilityView
    applications: list[ApplicationItem]
    history: list[RecommendationHistoryItem]
    disclaimer: str


class AdminDocumentItem(BaseModel):
    id: str
    owner_user_id: str
    owner_name: str
    owner_email: str
    category: str
    display_name: str
    content_type: str
    size_bytes: int = Field(..., ge=0)
    scheme_id: str | None = None
    scheme_name: str | None = None
    review_status: UploadReviewStatus
    created_at: str


class AdminDocumentListResponse(BaseModel):
    documents: list[AdminDocumentItem]
    count: int = Field(..., ge=0)
    disclaimer: str


class AdminEligibilityRow(BaseModel):
    user_id: str
    full_name: str
    email: str
    has_wallet: bool
    prediction_label: Literal["eligible", "not_eligible", "cannot_fully_evaluate", "not_evaluated"]
    eligible_scheme_count: int = Field(..., ge=0)
    evaluated_schemes: list[EvaluatedScheme]
    incomplete_fields: list[str]
    last_checked_at: str | None = None


class AdminEligibilityListResponse(BaseModel):
    users: list[AdminEligibilityRow]
    count: int = Field(..., ge=0)
    disclaimer: str


VoiceAuditOutcome = Literal["ok", "denied", "ambiguous", "error", "cancelled", "not_found"]


class AdminVoiceAuditCreate(BaseModel):
    intent: str = Field(..., min_length=1, max_length=64)
    outcome: VoiceAuditOutcome
    target_user_id: str | None = Field(default=None, max_length=36)
    transcript_hash: str | None = Field(default=None, min_length=64, max_length=64)
    transcript: str | None = Field(default=None, max_length=500)


class AdminVoiceAuditResponse(BaseModel):
    id: str
    admin_user_id: str
    intent: str
    outcome: VoiceAuditOutcome
    target_user_id: str | None = None
    transcript_hash: str
    created_at: str
    disclaimer: str


def wallet_view(wallet: CitizenWalletResponse) -> AdminWalletView:
    return AdminWalletView(
        citizen_id=wallet.citizen_id,
        age=wallet.age,
        gender=wallet.gender,
        is_student=wallet.is_student,
        first_higher_education_course=wallet.first_higher_education_course,
        school_background=wallet.school_background,
        marital_status=wallet.marital_status,
        is_orphan=wallet.is_orphan,
        is_destitute=wallet.is_destitute,
        occupation_category=wallet.occupation_category,
        wet_land_acres=float(wallet.wet_land_acres),
        dry_land_acres=float(wallet.dry_land_acres),
    )
