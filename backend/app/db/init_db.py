"""Create application tables and apply safe ownership columns.

Does not drop existing tables. Alembic is not used in this project.
"""

from __future__ import annotations

from sqlalchemy import text

from app.db.base import Base
from app.db.session import get_engine
from app.models import citizen as _citizen_model  # noqa: F401
from app.models import documents as _documents_model  # noqa: F401
from app.models import history as _history_model  # noqa: F401
from app.models import readiness as _readiness_model  # noqa: F401
from app.models import uploads as _uploads_model  # noqa: F401
from app.models import user as _user_model  # noqa: F401


def ensure_wallet_ownership_column(engine) -> None:
    """Add user_id to existing citizen_profiles rows without destroying data.

    Phase 9 wallets that have no owner remain in the table with NULL user_id.
    Authenticated APIs treat those rows as not found (HTTP 404).
    """
    statements = (
        "ALTER TABLE citizen_profiles ADD COLUMN IF NOT EXISTS user_id VARCHAR(36)",
        """
        CREATE UNIQUE INDEX IF NOT EXISTS ux_citizen_profiles_user_id
        ON citizen_profiles (user_id)
        """,
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM information_schema.key_column_usage
                WHERE table_name = 'citizen_profiles'
                  AND column_name = 'user_id'
                  AND constraint_name IN (
                      SELECT constraint_name
                      FROM information_schema.table_constraints
                      WHERE table_name = 'citizen_profiles'
                        AND constraint_type = 'FOREIGN KEY'
                  )
            ) THEN
                ALTER TABLE citizen_profiles
                    ADD CONSTRAINT fk_citizen_profiles_user_id
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
            END IF;
        END $$;
        """,
    )
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def ensure_google_auth_columns(engine) -> None:
    """Add Google account linking without destroying existing password users."""
    statements = (
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255)",
        """
        CREATE UNIQUE INDEX IF NOT EXISTS ux_users_google_sub
        ON users (google_sub)
        """,
        "ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL",
    )
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def ensure_application_schema(engine) -> None:
    ensure_wallet_ownership_column(engine)
    ensure_google_auth_columns(engine)


def init_db() -> None:
    engine = get_engine()
    if engine is None:
        raise RuntimeError(
            "DATABASE_URL is not set. Copy .env.example to .env and configure PostgreSQL."
        )
    Base.metadata.create_all(bind=engine)
    ensure_application_schema(engine)


if __name__ == "__main__":
    init_db()
    print("Created application tables if they did not already exist.")
