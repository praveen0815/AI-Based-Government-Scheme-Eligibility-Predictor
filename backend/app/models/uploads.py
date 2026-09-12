"""Supporting-document metadata. Stores files only, never identity numbers."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class SupportingUploadRecord(Base):
    __tablename__ = "supporting_uploads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    category: Mapped[str] = mapped_column(String(40), nullable=False)
    display_name: Mapped[str] = mapped_column(String(200), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(80), nullable=False)
    content_type: Mapped[str] = mapped_column(String(80), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    scheme_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    review_status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now, nullable=False)
