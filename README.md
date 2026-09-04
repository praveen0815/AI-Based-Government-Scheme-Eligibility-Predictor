<<<<<<< HEAD
# AI-Based Government Scheme Eligibility Predictor

Final-year engineering project. Citizens will later provide socio-economic information through a unified data wallet. The system will use machine learning to predict eligibility for Tamil Nadu Government welfare schemes and explain why a scheme is recommended.

This repository is in **Phase 16: English / Tamil multilingual support**. The citizen portal is branded **SchemeWise AI**. Predictions compare the documented CORE rule engine with the saved Decision Tree. The interface and PDF report can be viewed in English or Tamil. This is an academic research prototype. It is not a government identity verification system and does not grant eligibility.

## Planned stack

| Layer | Technology |
| --- | --- |
| ML / data | Python, Pandas, NumPy, Scikit-learn |
| Backend | Python, FastAPI |
| Database | PostgreSQL (application data wallet) |
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

- Folder structure and documentation are in place.
- Backend exposes public prediction APIs plus JWT auth (`/api/v1/auth/*`, including optional Google Sign-In) and owner-scoped wallet APIs. See `docs/api_design.md` and `docs/authentication_design.md`.
- `dataset/raw/schemes.csv` holds 13 official Tamil Nadu scheme rows. Collection rules are in `docs/dataset_collection.md`.
- Phase 3 synthetic CORE data is in `dataset/raw/citizens.csv` and `dataset/processed/eligibility_dataset.csv`.
- Phase 4/5 baseline models are in `ml/models/baseline/`. The selected prototype model is the Decision Tree.
- Phase 5 comparison and limitations are in `docs/phase5_results.md` and `docs/ml_limitations.md`.
- The React portal is branded SchemeWise AI and includes `/login`, `/register`, a protected `/wallet` page, and a public `/evaluation` dashboard. See `docs/phase13_ui_redesign.md`.
- Demo script: `docs/demo_walkthrough.md`. Architecture: `docs/final_system_architecture.md`.
- Wallet routes require JWT authentication. Public `/predict`, `/recommend`, and `/evaluation` remain unauthenticated.

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

Interactive docs (FastAPI default): [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### ML environment (optional in this phase)

```powershell
cd ml
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python src/validate_scheme_dataset.py
python src/generate_synthetic_data.py
python src/validate_ml_dataset.py
python src/inspect_dataset.py
python src/train_baseline_models.py
python src/analyze_phase5.py
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Portal: [http://localhost:5173](http://localhost:5173)

Copy `frontend/.env.example` to `frontend/.env` if needed. Default API base URL is `http://127.0.0.1:8000`.

Current architecture:

```
React
 ↓
FastAPI
 ↓
PostgreSQL
 ↓
Unified Socio-Economic Data Wallet
 ↓
Recommendation Service
 ↓
Decision Tree
 ↓
CORE Government Schemes
```

Wallet routes require JWT authentication. Public eligibility checks do not.

### PostgreSQL (Windows)

1. Install PostgreSQL from the official Windows installer (include Command Line Tools), or run a local container. Replace `USERNAME` and `PASSWORD` with values you choose. Do not commit them.

```powershell
docker run --name scheme-predictor-pg -e POSTGRES_USER=USERNAME -e POSTGRES_PASSWORD=PASSWORD -e POSTGRES_DB=scheme_predictor -p 5432:5432 -d postgres:16
```

If Docker Desktop was stopped, start it and then:

```powershell
docker start scheme-predictor-pg
```

Auth, Google sign-in, wallet, and history return HTTP 503 until this container is running. From the project root you can also use `docker compose up -d`.

2. Create the application database if you installed PostgreSQL locally, for example `scheme_predictor`. Create a separate `scheme_predictor_test` database for automated tests.
3. Copy `.env.example` to `.env` and set `DATABASE_URL` with your username and password:

4. Install backend dependencies and create tables (this does not drop existing tables):

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m app.db.init_db
```

5. Start FastAPI, then the React portal.

Use a separate database for tests (`scheme_predictor_test`) via `TEST_DATABASE_URL`. Do not commit `.env`.

## Phase status

Phase 1 (complete): repository layout, backend health endpoint, dependency lists.

Phase 2 (complete): scheme catalog and collection method.

Phase 2.1 (complete): quality review and CORE feature set.

Phase 3 (complete): synthetic CORE citizens and rule-derived labels.

Phase 4 (complete): citizen-grouped split and three baselines.

Phase 5 (complete): explainability, rule-vs-ML comparison, Decision Tree selected.

Phase 6 (complete): read-only FastAPI prediction API around `ml/models/baseline/decision_tree.joblib`.

Phase 7 (complete): multi-scheme eligibility check and eligibility-based recommendation. See `docs/recommendation_engine.md` and `docs/phase7_results.md`.

Phase 8 (complete): React citizen portal. See `docs/phase8_results.md`.

Phase 9 (complete): PostgreSQL unified socio-economic data wallet. See `docs/data_wallet_design.md` and `docs/phase9_results.md`.

Phase 10 (complete): JWT authentication and wallet ownership. See `docs/authentication_design.md` and `docs/phase10_results.md`.

Phase 11 (complete): public ML evaluation dashboard. See `docs/evaluation_dashboard_design.md` and `docs/phase11_results.md`.

Phase 12 (complete): UI/UX polish, consistent disclaimers, and demo readiness. See `docs/phase12_results.md` and `docs/demo_walkthrough.md`.

Phase 13 (complete): SchemeWise AI frontend redesign and hybrid Rule + ML engine. See `docs/phase13_ui_redesign.md`, `docs/hybrid_rule_ml_design.md`, and `docs/phase13_results.md`.

Phase 14 (complete): recommendation history and profile completeness.

Phase 15 (complete): CORE scheme comparison and on-demand PDF reports. See `docs/scheme_comparison_design.md`, `docs/pdf_report_design.md`, and `docs/phase15_results.md`.

Phase 16 (complete): English ↔ Tamil UI and PDF language support. See `docs/i18n_design.md` and `docs/phase16_results.md`.

Still out of scope:

- Aadhaar / government identity
- LLM features
- Deployment
=======
# AI-Based-Government-Scheme-Eligibility-Predictor
>>>>>>> 4c36deab1ebee635aedabbc6ee95262d9b61b25e
