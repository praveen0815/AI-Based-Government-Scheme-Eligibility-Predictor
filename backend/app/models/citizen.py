"""Citizen socio-economic data wallet. Does not store eligibility results."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.paths import ensure_ml_src_on_path

ensure_ml_src_on_path()

from ml_config import (  # noqa: E402
    AGE_MAX,
    AGE_MIN,
    GENDER_VALUES,
    LAND_MIN,
    MARITAL_STATUS_VALUES,
    OCCUPATION_CATEGORY_VALUES,
    SCHOOL_BACKGROUND_VALUES,
)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _in_clause(values: tuple[str, ...]) -> str:
    return ", ".join(f"'{value}'" for value in values)


class CitizenProfileRecord(Base):
    __tablename__ = "citizen_profiles"
    __table_args__ = (
        CheckConstraint(f"age >= {AGE_MIN} AND age <= {AGE_MAX}", name="ck_citizen_age"),
        CheckConstraint(f"wet_land_acres >= {LAND_MIN}", name="ck_citizen_wet_land"),
        CheckConstraint(f"dry_land_acres >= {LAND_MIN}", name="ck_citizen_dry_land"),
        CheckConstraint(f"gender IN ({_in_clause(GENDER_VALUES)})", name="ck_citizen_gender"),
        CheckConstraint(
            f"school_background IN ({_in_clause(SCHOOL_BACKGROUND_VALUES)})",
            name="ck_citizen_school",
        ),
        CheckConstraint(
            f"marital_status IN ({_in_clause(MARITAL_STATUS_VALUES)})",
            name="ck_citizen_marital",
        ),
        CheckConstraint(
            f"occupation_category IN ({_in_clause(OCCUPATION_CATEGORY_VALUES)})",
            name="ck_citizen_occupation",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    citizen_id: Mapped[str] = mapped_column(String(36), unique=True, index=True, default=lambda: str(uuid4()))
    user_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=True,
    )
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    gender: Mapped[str] = mapped_column(String(32), nullable=False)
    is_student: Mapped[bool] = mapped_column(Boolean, nullable=False)
    first_higher_education_course: Mapped[bool] = mapped_column(Boolean, nullable=False)
    school_background: Mapped[str] = mapped_column(String(64), nullable=False)
    marital_status: Mapped[str] = mapped_column(String(32), nullable=False)
    is_orphan: Mapped[bool] = mapped_column(Boolean, nullable=False)
    is_destitute: Mapped[bool] = mapped_column(Boolean, nullable=False)
    occupation_category: Mapped[str] = mapped_column(String(64), nullable=False)
    wet_land_acres: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    dry_land_acres: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utc_now,
        onupdate=_utc_now,
        nullable=False,
    )
