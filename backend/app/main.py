"""FastAPI application. Prediction API plus authenticated academic data wallets."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.cors import ALLOWED_HEADERS, ALLOWED_METHODS, allowed_origins
from app.db.base import Base
from app.db.init_db import ensure_application_schema
from app.db.session import check_database, get_database_url, get_engine
from app.logging_filters import install_secret_redacting_filter
from app.performance import PerformanceMiddleware
from app.rate_limit import AuthRateLimitMiddleware
from app.safe_errors import public_validation_errors, safe_error_detail
from app.security_headers import SecurityHeadersMiddleware
from app.settings import (
    app_environment,
    docs_enabled,
    using_development_jwt_fallback,
    validate_runtime_settings,
)
from app.routes.auth import router as auth_router
from app.routes.catalog import router as catalog_router
from app.routes.evaluation import router as evaluation_router
from app.routes.performance import router as performance_router
from app.routes.compare import router as compare_router
from app.routes.dashboard import router as dashboard_router
from app.routes.documents import router as documents_router
from app.routes.history import router as history_router
from app.routes.insights import router as insights_router
from app.routes.readiness import router as readiness_router
from app.routes.notifications import router as notifications_router
from app.routes.uploads import router as uploads_router
from app.routes.reports import router as reports_router
from app.routes.wallet import router as wallet_router
from app.services.evaluation_service import EvaluationUnavailableError, get_evaluation_service
from app.services.auth_service import (
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
    PasswordChangeError,
)
from app.services.google_token_service import GoogleAuthUnavailableError, GoogleTokenError
from app.services.compare_service import CompareSelectionError
from app.services.document_checklist_service import DocumentChecklistNotFoundError
from app.services.readiness_service import ReadinessNotFoundError
from app.services.notification_service import NotificationNotFoundError
from app.services.upload_service import UploadNotFoundError, UploadRejectedError
from app.services.history_service import HistoryNotFoundError
from app.services.wallet_service import (
    DatabaseUnavailableError,
    WalletConflictError,
    WalletNotFoundError,
)
from app.paths import ensure_ml_src_on_path
from app.routes.prediction import router as prediction_router
from app.routes.recommendation import router as recommendation_router
from app.services.model_service import ModelUnavailableError, get_model_service
from app.services.scheme_service import CatalogUnavailableError, get_scheme_service

ensure_ml_src_on_path()
install_secret_redacting_filter()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

validate_runtime_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("Application environment: %s", app_environment())
    if using_development_jwt_fallback():
        logger.warning(
            "JWT_SECRET_KEY is using the academic development fallback. "
            "Set a unique secret before any shared deployment."
        )
    if get_database_url() is None:
        logger.warning("DATABASE_URL is not configured. Wallet and authentication routes will be unavailable.")
    try:
        get_model_service().load()
        get_scheme_service().load()
        get_evaluation_service().load()
    except (ModelUnavailableError, CatalogUnavailableError, EvaluationUnavailableError):
        logger.exception("Required model or scheme catalog was not loaded at startup")
        raise
    engine = get_engine()
    if engine is not None:
        if check_database():
            try:
                Base.metadata.create_all(bind=engine)
                ensure_application_schema(engine)
            except Exception:
                logger.warning(
                    "Application tables could not be prepared. Authentication and wallet routes may return HTTP 503."
                )
        else:
            logger.warning(
                "PostgreSQL is not reachable. Authentication, wallet, and history routes will return HTTP 503 until the database is running."
            )
    yield


_DOCS_ENABLED = docs_enabled()

app = FastAPI(
    title="AI-Based Government Scheme Eligibility Predictor",
    description=(
        "Research prototype that scores CORE Tamil Nadu welfare schemes with a "
        "saved Decision Tree and stores an academic socio-economic data wallet "
        "in PostgreSQL. Predictions are not government approval. Authentication "
        "protects wallet ownership only and is not government identity verification. "
        "Evaluation routes expose Phase 4/5 research metrics only."
    ),
    version="15.0.0",
    lifespan=lifespan,
    docs_url="/docs" if _DOCS_ENABLED else None,
    redoc_url="/redoc" if _DOCS_ENABLED else None,
    openapi_url="/openapi.json" if _DOCS_ENABLED else None,
)

app.add_middleware(PerformanceMiddleware)
app.add_middleware(AuthRateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_credentials=False,
    allow_methods=list(ALLOWED_METHODS),
    allow_headers=list(ALLOWED_HEADERS),
)

app.include_router(prediction_router)
app.include_router(recommendation_router)
app.include_router(catalog_router)
app.include_router(auth_router)
app.include_router(wallet_router)
app.include_router(history_router)
app.include_router(documents_router)
app.include_router(insights_router)
app.include_router(readiness_router)
app.include_router(dashboard_router)
app.include_router(uploads_router)
app.include_router(notifications_router)
app.include_router(compare_router)
app.include_router(reports_router)
app.include_router(evaluation_router)
app.include_router(performance_router)


@app.get("/health")
def health() -> dict[str, str]:
    database = "connected" if check_database() else "unavailable"
    return {
        "status": "ok" if database == "connected" else "degraded",
        "database": database,
        "environment": app_environment(),
    }


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detail": public_validation_errors(exc.errors())})


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(
    _request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    fallback = {
        400: "The request could not be processed.",
        401: "Not authenticated",
        403: "You do not have access to this resource.",
        404: "The requested resource was not found.",
        409: "The request conflicts with the current state.",
        422: "The request was invalid.",
        429: "Too many authentication attempts. Please try again later.",
        500: "An unexpected error occurred.",
        503: "The service is temporarily unavailable.",
    }.get(exc.status_code, "The request could not be processed.")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": safe_error_detail(exc.detail, fallback)},
        headers=dict(exc.headers) if exc.headers else None,
    )


@app.exception_handler(ModelUnavailableError)
async def model_unavailable_handler(
    _request: Request, exc: ModelUnavailableError
) -> JSONResponse:
    return JSONResponse(status_code=503, content={"detail": str(exc)})


@app.exception_handler(CatalogUnavailableError)
async def catalog_unavailable_handler(
    _request: Request, exc: CatalogUnavailableError
) -> JSONResponse:
    return JSONResponse(status_code=503, content={"detail": str(exc)})


@app.exception_handler(DatabaseUnavailableError)
async def database_unavailable_handler(
    _request: Request, exc: DatabaseUnavailableError
) -> JSONResponse:
    return JSONResponse(status_code=503, content={"detail": str(exc)})


@app.exception_handler(WalletNotFoundError)
async def wallet_not_found_handler(
    _request: Request, exc: WalletNotFoundError
) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(HistoryNotFoundError)
async def history_not_found_handler(
    _request: Request, exc: HistoryNotFoundError
) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(DocumentChecklistNotFoundError)
async def document_checklist_not_found_handler(
    _request: Request, exc: DocumentChecklistNotFoundError
) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(ReadinessNotFoundError)
async def readiness_not_found_handler(
    _request: Request, exc: ReadinessNotFoundError
) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(UploadNotFoundError)
async def upload_not_found_handler(_request: Request, exc: UploadNotFoundError) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(NotificationNotFoundError)
async def notification_not_found_handler(
    _request: Request, exc: NotificationNotFoundError
) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(UploadRejectedError)
async def upload_rejected_handler(_request: Request, exc: UploadRejectedError) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.exception_handler(CompareSelectionError)
async def compare_selection_handler(
    _request: Request, exc: CompareSelectionError
) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.exception_handler(WalletConflictError)
async def wallet_conflict_handler(
    _request: Request, exc: WalletConflictError
) -> JSONResponse:
    return JSONResponse(status_code=409, content={"detail": str(exc)})


@app.exception_handler(EmailAlreadyRegisteredError)
async def email_registered_handler(
    _request: Request, exc: EmailAlreadyRegisteredError
) -> JSONResponse:
    return JSONResponse(status_code=409, content={"detail": str(exc)})


@app.exception_handler(InvalidCredentialsError)
async def invalid_credentials_handler(
    _request: Request, exc: InvalidCredentialsError
) -> JSONResponse:
    return JSONResponse(status_code=401, content={"detail": str(exc)})


@app.exception_handler(PasswordChangeError)
async def password_change_handler(
    _request: Request, exc: PasswordChangeError
) -> JSONResponse:
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.exception_handler(GoogleTokenError)
async def google_token_handler(
    _request: Request, exc: GoogleTokenError
) -> JSONResponse:
    return JSONResponse(status_code=401, content={"detail": str(exc)})


@app.exception_handler(GoogleAuthUnavailableError)
async def google_unavailable_handler(
    _request: Request, exc: GoogleAuthUnavailableError
) -> JSONResponse:
    return JSONResponse(status_code=503, content={"detail": str(exc)})


@app.exception_handler(EvaluationUnavailableError)
async def evaluation_unavailable_handler(
    _request: Request, exc: EvaluationUnavailableError
) -> JSONResponse:
    return JSONResponse(status_code=503, content={"detail": str(exc)})


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_error_handler(
    _request: Request, _exc: SQLAlchemyError
) -> JSONResponse:
    logger.exception("Unexpected database error")
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected database error occurred."},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, _exc: Exception) -> JSONResponse:
    logger.exception("Unhandled application error")
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred."},
    )
