"""Pydantic models for citizen-reviewed OCR extraction. Not document verification."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from app.schemas.uploads import UploadReviewStatus
from app.schemas.wallet import CitizenWalletResponse

ScanDocumentType = Literal["education_certificate"]
ScanStatus = Literal["pending_review", "confirmed", "cancelled", "failed"]
FieldClarity = Literal["extracted", "unclear", "missing"]

SCANNER_DISCLAIMER = (
    "OCR extraction is a research-prototype helper only. Extracted values are "
    "untrusted until you review and confirm them. Scanning does not verify, "
    "approve, or authenticate a document, and it does not change eligibility."
)

SUPPORTED_SCAN_TYPES: tuple[ScanDocumentType, ...] = ("education_certificate",)

EDUCATION_WALLET_FIELDS: tuple[str, ...] = (
    "age",
    "is_student",
    "first_higher_education_course",
    "school_background",
)


class ExtractedField(BaseModel):
    name: str
    value: Any | None = None
    clarity: FieldClarity
    current_wallet_value: Any | None = None


class DocumentScanCreate(BaseModel):
    upload_id: str = Field(..., min_length=1)
    document_type: ScanDocumentType


class DocumentScanConfirmRequest(BaseModel):
    fields: dict[str, Any] = Field(default_factory=dict)


class DocumentScanResponse(BaseModel):
    id: str
    upload_id: str
    document_type: ScanDocumentType
    status: ScanStatus
    review_status: UploadReviewStatus
    fields: list[ExtractedField]
    applied_fields: list[str] = Field(default_factory=list)
    wallet: CitizenWalletResponse | None = None
    disclaimer: str
    created_at: str


class SupportedScanType(BaseModel):
    document_type: ScanDocumentType
    wallet_fields: list[str]
    note: str


class SupportedScanTypesResponse(BaseModel):
    types: list[SupportedScanType]
    unsupported_notes: list[str]
    disclaimer: str
