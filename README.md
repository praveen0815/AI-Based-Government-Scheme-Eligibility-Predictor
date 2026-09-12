# AI-Based Government Scheme Eligibility Predictor

Final-year academic research prototype. Citizens store a socio-economic profile in a unified data wallet. FastAPI scores six CORE Tamil Nadu welfare schemes with a saved Decision Tree, compares that prediction with documented rules, and explains why a scheme was recommended.

The citizen portal is branded **Scheme Predictor** / **SchemeWise AI**. Predictions are research results only. They are not government approval, identity verification, or a final eligibility decision.

This repository is at **Phase 44: administrator portal**. Phases 1–43 remain in place. The Hybrid Rule + ML engine remains the only eligibility authority. Phase 44 adds a JWT role-checked `/admin` portal for user, document, and eligibility monitoring. Document review does not change predictions. No new ML algorithms, datasets, payment, Aadhaar, government application APIs, or messaging services were added.

## Stack

| Layer | Technology |
| --- | --- |
| ML / data | Python, Pandas, NumPy, Scikit-learn |
| Backend | Python, FastAPI |
| Database | PostgreSQL (owner-scoped application data) |
| Frontend | React, TypeScript, Vite, Tailwind CSS |

## Repository layout

```
.
├── dataset/          # Official catalog and synthetic CORE eligibility rows
├── ml/               # Rules, generators, validators, and baseline models
├── backend/          # FastAPI application
├── frontend/         # React citizen portal
├── docs/             # Project documentation
└── README.md
```

## Current status

- `dataset/raw/schemes.csv` holds 13 official Tamil Nadu scheme rows. Six are CORE for ML.
- Synthetic CORE citizens and rule-derived labels are in `dataset/raw/citizens.csv` and `dataset/processed/eligibility_dataset.csv`.
- The selected prototype model is the Decision Tree at `ml/models/baseline/decision_tree.joblib`.
- FastAPI exposes public prediction, recommendation, catalog, and evaluation APIs, plus JWT-protected wallet, history, documents, readiness, insights, notifications, settings, system-evaluation, and application-tracking routes.
- The React portal covers the academic demo flow: Login → Dashboard → Wallet → Check Eligibility → hybrid results / Why this result? → Eligibility Simulator → Applications → History → Compare → PDF → Documents → Readiness → Insights → Notifications → Voice Assistant → Schemes discovery → System Evaluation → Research Dashboard.
- English and Tamil use the existing `useI18n()` dictionaries.

See `docs/final_system_flow.md` for the complete architecture and user flow. Phase 43 QA notes are in `docs/phase43_results.md`.

## Setup

Requires **Python 3.12**. Use `py -3.12` when more than one Python version is installed. Do not use 3.13 for ML runs. Recorded ML environment: Python 3.12.10, scikit-learn 1.9.0, pandas 3.0.5, numpy 2.5.2.

### Backend

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --app-dir .
```

Health check: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Portal: [http://localhost:5173](http://localhost:5173)

Copy `frontend/.env.example` to `frontend/.env` if needed. Default API base URL is `http://127.0.0.1:8000`.

### PostgreSQL (Windows)

1. Install PostgreSQL or run a local container. Replace `USERNAME` and `PASSWORD` with values you choose. Do not commit them.

```powershell
docker run --name scheme-predictor-pg -e POSTGRES_USER=USERNAME -e POSTGRES_PASSWORD=PASSWORD -e POSTGRES_DB=scheme_predictor -p 5432:5432 -d postgres:16
```

If Docker Desktop was stopped, start it and then:

```powershell
docker start scheme-predictor-pg
```

Auth, Google sign-in, wallet, and history return HTTP 503 until this container is running. From the project root you can also use `docker compose up -d`.

2. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` and `JWT_SECRET_KEY`. Do not commit `.env`.
3. Create the application database if you installed PostgreSQL locally, for example `scheme_predictor`. Use a separate `scheme_predictor_test` database for automated tests.
4. Install backend dependencies and create tables (this does not drop existing tables):

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m app.db.init_db
```

Use a separate `scheme_predictor_test` database for tests via `TEST_DATABASE_URL`. Do not commit `.env`.

## Architecture

```
React citizen portal
 ↓
FastAPI
 ↓
JWT owner  →  PostgreSQL wallet / history / documents / readiness / notifications / applications
 ↓
Hybrid Rule Engine + Decision Tree
 ↓
CORE scheme recommendations
```

Public routes include `/predict`, `/recommend`, `/schemes`, `/catalog`, `/evaluation/*`, and `/health`. Authenticated routes require a Bearer JWT and load only the caller's owned rows.

## Phase status

Phases 1–43 are complete. Phase 44 adds an administrator portal on the existing JWT: role-checked `/admin` pages and `/api/v1/admin/*` APIs. Citizens cannot open admin routes. Document verification is separate from eligibility. Hybrid scoring, ranking, and citizen API contracts were not rewritten.

Still out of scope:

- Aadhaar / government identity
- OTP, email verification, SMS, or push notifications
- LLM features
- Payment or deployment infrastructure
