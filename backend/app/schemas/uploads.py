"""Pydantic models for optional supporting-document uploads. Not identity verification."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

UploadCategory = Literal[
    "identity_proof_demo",
    "address_proof",
    "education_certificate",
    "income_certificate",
    "community_certificate",
    "other_supporting",
]

UPLOAD_CATEGORIES: tuple[UploadCategory, ...] = (
    "identity_proof_demo",
    "address_proof",
    "education_certificate",
    "income_certificate",
    "community_certificate",
    "other_supporting",
)

UPLOAD_DISCLAIMER = (
    "Do not upload Aadhaar, PAN, passport, or other sensitive identity documents. "
    "This is an academic research prototype. Uploaded files are optional supporting "
    "evidence only. Uploaded does not mean verified or officially accepted."
)

ALLOWED_CONTENT_TYPES: dict[str, str] = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
}


class UploadLinkUpdate(BaseModel):
    scheme_id: str | None = None


UploadReviewStatus = Literal["pending", "verified", "rejected"]


class SupportingUpload(BaseModel):
    id: str
    category: UploadCategory
    display_name: str
    stored_filename: str
    content_type: str
    size_bytes: int = Field(..., ge=0)
    scheme_id: str | None = None
    scheme_name: str | None = None
    review_status: UploadReviewStatus = "pending"
    created_at: str
    disclaimer: str


class SupportingUploadListResponse(BaseModel):
    uploads: list[SupportingUpload]
    count: int = Field(..., ge=0)
    disclaimer: str
