"""SQLAlchemy engine and session factory. One engine per process."""

from __future__ import annotations

import os
from collections.abc import Generator

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.paths import project_root

_engine: Engine | None = None
_session_factory: sessionmaker[Session] | None = None
_loaded_env = False


def load_database_env() -> None:
    global _loaded_env
    if _loaded_env:
        return
    root = project_root()
    load_dotenv(root / ".env")
    load_dotenv(root / "backend" / ".env")
    _loaded_env = True


def get_database_url() -> str | None:
    load_database_env()
    if os.environ.get("SCHEME_PREDICTOR_USE_TEST_DB") == "1":
        url = os.environ.get("TEST_DATABASE_URL")
    else:
        url = os.environ.get("DATABASE_URL")
    if not url:
        return None
    return url.strip() or None


def get_engine() -> Engine | None:
    global _engine
    url = get_database_url()
    if not url:
        return None
    if _engine is None:
        _engine = create_engine(
            url,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 5},
        )
    return _engine


def get_session_factory() -> sessionmaker[Session] | None:
    global _session_factory
    engine = get_engine()
    if engine is None:
        return None
    if _session_factory is None:
        _session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    return _session_factory


def reset_engine() -> None:
    """Test helper. Disposes the cached engine so a new URL can be used."""
    global _engine, _session_factory
    if _engine is not None:
        _engine.dispose()
    _engine = None
    _session_factory = None


def check_database() -> bool:
    engine = get_engine()
    if engine is None:
        return False
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


class DatabaseUnavailableError(Exception):
    """Raised when PostgreSQL is not configured or cannot be reached."""


def get_db() -> Generator[Session | None, None, None]:
    """Yield a session, or None if PostgreSQL is not configured.

    Returning None (instead of raising) lets FastAPI still validate the
    request body and return HTTP 422 for invalid wallet data.
    """
    factory = get_session_factory()
    if factory is None:
        yield None
        return
    session = factory()
    try:
        yield session
    finally:
        session.close()


def require_db(session: Session | None) -> Session:
    if session is None:
        raise DatabaseUnavailableError(
            "The data wallet database is not configured or is unavailable."
        )
    return session
