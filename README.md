# AI-Based Government Scheme Eligibility Predictor

Final-year academic research prototype. Citizens store a socio-economic profile in a unified data wallet. FastAPI scores six CORE Tamil Nadu welfare schemes with a saved Decision Tree, compares that prediction with documented rules, and explains why a scheme was recommended.

The citizen portal is branded **Scheme Predictor** / **SchemeWise AI**. Predictions are research results only. They are not government approval, identity verification, or a final eligibility decision.

This repository is at **Phase 30: final integration and demo readiness**. Phases 1–29 remain in place. No new ML algorithms, datasets, payment, Aadhaar, government APIs, or messaging services were added.

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
- FastAPI exposes public prediction, recommendation, catalog, and evaluation APIs, plus JWT-protected wallet, history, documents, readiness, insights, notifications, settings, and system-evaluation routes.
- The React portal covers the academic demo flow: Login → Dashboard → Wallet → Check Eligibility → hybrid results / Why this result? → History → Compare → PDF → Documents → Readiness → Insights → Notifications → System Evaluation.
- English and Tamil use the existing `useI18n()` dictionaries.

See `docs/final_system_flow.md` for the complete architecture and user flow.

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

<<<<<<< HEAD
2. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` and `JWT_SECRET_KEY`.
3. Create tables:
=======
If Docker Desktop was stopped, start it and then:

```powershell
docker start scheme-predictor-pg
```

Auth, Google sign-in, wallet, and history return HTTP 503 until this container is running. From the project root you can also use `docker compose up -d`.

2. Create the application database if you installed PostgreSQL locally, for example `scheme_predictor`. Create a separate `scheme_predictor_test` database for automated tests.
3. Copy `.env.example` to `.env` and set `DATABASE_URL` with your username and password:

4. Install backend dependencies and create tables (this does not drop existing tables):
>>>>>>> ab6e8af (Update README to remove sensitive information)

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
JWT owner  →  PostgreSQL wallet / history / documents / readiness / notifications
 ↓
Hybrid Rule Engine + Decision Tree
 ↓
CORE scheme recommendations
```

Public routes include `/predict`, `/recommend`, `/schemes`, `/catalog`, `/evaluation/*`, and `/health`. Authenticated routes require a Bearer JWT and load only the caller's owned rows.

## Phase status

Phases 1–29 are complete. Phase 30 is the final integration and demo-readiness pass: navigation, login landing on Dashboard, unused duplicate UI cleanup, and documentation. Business logic, APIs, ML, and datasets were not rewritten.

Still out of scope:

- Aadhaar / government identity
- OTP, email verification, SMS, or push notifications
- LLM features
- Payment or deployment infrastructure
