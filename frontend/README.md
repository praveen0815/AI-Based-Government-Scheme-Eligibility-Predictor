# Citizen portal

React frontend for **SchemeWise AI**. Citizens enter socio-economic information, the FastAPI backend scores the six CORE schemes, and the portal shows predicted-eligible schemes with reasons and official source links.

This is **SchemeWise AI**, an academic research prototype (frontend version **16.0.0**). The portal supports English and Tamil. It is not an official Government of Tamil Nadu website and does not grant or deny benefits.

## Tech stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router 6

## Folder structure

```
frontend/
├── src/
│   ├── components/     # Header, form controls, scheme cards, states
│   ├── pages/          # Home, form, results, schemes, evaluation, data wallet
│   ├── services/       # API client
│   ├── types/          # Request/response types matching FastAPI
│   ├── context/        # Auth, language, and in-memory recommendation state
│   ├── i18n/           # English and Tamil dictionaries
│   ├── utils/          # Validation and catalog text helpers
│   ├── test/           # Vitest + Testing Library
│   ├── App.tsx
│   └── main.tsx
├── .env.example
├── package.json
└── README.md
```

## Environment

Copy `.env.example` to `.env`:

```
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Do not put secrets or API keys in the frontend.

## Install and run

The FastAPI backend must be running first.

Backend:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --app-dir .
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

| URL | Purpose |
| --- | --- |
| http://localhost:5173 | Citizen portal |
| http://127.0.0.1:8000 | FastAPI |
| http://127.0.0.1:8000/docs | Swagger |

## API endpoints used

| Method | Path | Used by |
| --- | --- | --- |
| `POST` | `/api/v1/recommend` | One-off eligibility form (public) |
| `GET` | `/api/v1/schemes` | Supported schemes page |
| `POST` | `/api/v1/auth/register` | Create account |
| `POST` | `/api/v1/auth/login` | Log in |
| `POST` | `/api/v1/auth/google` | Sign in with a Google ID token |
| `GET` | `/api/v1/auth/me` | Current user |
| `POST` | `/api/v1/wallets` | Create data wallet (JWT) |
| `GET` | `/api/v1/wallets/me` | Load the signed-in user's wallet |
| `PUT` | `/api/v1/wallets/{citizen_id}` | Update data wallet |
| `DELETE` | `/api/v1/wallets/{citizen_id}` | Delete data wallet |
| `POST` | `/api/v1/wallets/{citizen_id}/recommend` | Recommend from saved wallet |
| `GET` | `/api/v1/evaluation/*` | Public research dashboard |

The frontend does **not** implement scheme eligibility rules. It only collects citizen data and displays the API result.

## Tests and build

```powershell
npm test
npm run build
npx eslint .
```

## Troubleshooting CORS

The Vite app and FastAPI run on different origins. The backend allowlist is only:

- `http://localhost:5173`
- `http://127.0.0.1:5173`

If the browser blocks the request:

1. Confirm the backend is running on port 8000.
2. Open the portal on port 5173, not another Vite port.
3. Confirm `VITE_API_BASE_URL` points at `http://127.0.0.1:8000`.
4. Do not expect a wildcard CORS policy.

## Authentication

Routes: `/login`, `/register`. `/wallet` requires a session.

Email/password login is unchanged. Login and Register also offer **Continue with Google** when `VITE_GOOGLE_CLIENT_ID` is set. The Google credential is sent once to `/api/v1/auth/google` and is not stored. The application JWT is stored in `sessionStorage` so a refresh in the same tab keeps the user signed in. The token is sent as `Authorization: Bearer <token>` from `frontend/src/services/api.ts`. HTTP 401 clears the session and returns the user to login.

This authentication system is implemented for the academic research prototype. It is not a government identity verification system.

## Evaluation dashboard

Route: `/evaluation` (public)

The page loads Phase 4/5 metrics from `/api/v1/evaluation/*`. Numbers come from the backend. The UI does not hard-code model scores. The Decision Tree is labelled the selected prototype model, not a government-accurate model.

See `docs/evaluation_dashboard_design.md`.

## Data wallet

Route: `/wallet` (protected)

1. Log in. The backend identifies the user from the JWT.
2. If no wallet exists, the page shows **Create My Wallet**.
3. **Save Wallet** calls `POST /api/v1/wallets`.
4. **Edit Profile** saves with `PUT /api/v1/wallets/{citizen_id}`.
5. **Find Eligible Schemes** calls `POST /api/v1/wallets/{citizen_id}/recommend` and does **not** resend the profile.
6. **Delete Wallet** asks for confirmation, then calls `DELETE`.

`citizen_id` is shown as an internal Wallet ID, not as a login credential.

Wallet create/update/recommend requires PostgreSQL behind FastAPI. Configure `DATABASE_URL`, `JWT_SECRET_KEY`, and `GOOGLE_CLIENT_ID` on the backend. The frontend uses `VITE_API_BASE_URL` and optional `VITE_GOOGLE_CLIENT_ID`.

## Out of scope

Aadhaar, OTP, government login, LLMs, and deployment are not part of this portal.
