# Backend

FastAPI service (version **15.0.0**) for CORE-scheme prediction, recommendation, evaluation metrics, an authenticated academic socio-economic data wallet, scheme comparison, and on-demand PDF reports.

This is a research prototype. Predictions are not government approval. This authentication system is implemented for the academic research prototype. It is not a government identity verification system.

CORS is limited to `http://localhost:5173` and `http://127.0.0.1:5173`. Allowed methods include GET, POST, PUT, DELETE, and OPTIONS. Allowed headers include `Content-Type` and `Authorization`. Credentials are not enabled.

## Setup

Requires **Python 3.12**.

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Copy `.env.example` to the project-root `.env` or `backend/.env`. Set `DATABASE_URL` and `JWT_SECRET_KEY`. Start PostgreSQL (Docker Desktop must be running):

```powershell
docker start scheme-predictor-pg
# or, from the project root:
# docker compose up -d
```

Then create or migrate tables:

```powershell
python -m app.db.init_db
```

This runs `create_all`, adds `citizen_profiles.user_id` if it is missing, and adds `users.google_sub` for Google Sign-In. It does not drop tables. Alembic is not used. Set `GOOGLE_CLIENT_ID` to the same Web client ID used by `VITE_GOOGLE_CLIENT_ID`.

## Run the API

```powershell
uvicorn app.main:app --reload --app-dir .
```

| URL | Purpose |
| --- | --- |
| `http://127.0.0.1:8000/health` | API and database health |
| `http://127.0.0.1:8000/api/v1/auth/register` | Create a prototype account |
| `http://127.0.0.1:8000/api/v1/auth/login` | Issue a JWT |
| `http://127.0.0.1:8000/api/v1/auth/google` | Verify a Google ID token and issue a JWT |
| `http://127.0.0.1:8000/api/v1/wallets` | Create the caller's data wallet (JWT) |
| `http://127.0.0.1:8000/api/v1/predict` | One citizen + one CORE scheme (public) |
| `http://127.0.0.1:8000/api/v1/recommend` | One citizen + all six CORE schemes (public) |
| `http://127.0.0.1:8000/api/v1/compare` | Compare 2–3 CORE schemes (JWT + wallet) |
| `http://127.0.0.1:8000/api/v1/reports/recommendations` | Download a recommendation PDF (JWT + wallet) |
| `http://127.0.0.1:8000/api/v1/evaluation/overview` | Research dashboard overview (public) |
| `http://127.0.0.1:8000/docs` | Swagger UI |

Prediction and recommendation still work if PostgreSQL is down. Auth and wallet routes return HTTP 503 if the database is unavailable, or 401 if the JWT is missing.

## Tests

```powershell
python -m unittest discover -s tests -v
```

Wallet and auth database tests use only `TEST_DATABASE_URL` and skip if that URL is unset or PostgreSQL is unavailable. They do not write to the application database.
