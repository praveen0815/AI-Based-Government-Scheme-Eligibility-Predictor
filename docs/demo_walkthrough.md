# Demo walkthrough

Use this script for S7 / final-year review. Do **not** insert a demo user into the application database automatically. Create the account in the UI during the demonstration.

This system is an academic AI research prototype. Predictions are not government approval.

## Start the services

1. Start PostgreSQL (local install or the existing Docker container).
2. Start FastAPI from `backend/` with the project virtual environment:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --app-dir .
```

3. Start the React portal:

```powershell
cd frontend
npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173).

## Demo account

Register a new account in the UI. Do not reuse a real personal password.

Suggested local-only values (change them):

- Full name: `Demo Reviewer`
- Email: `demo.reviewer@example.com`
- Password: choose an 8+ character password and do not record it in this repository

After registration, log in. The portal opens **My Wallet**.

## Sample citizen profile

Enter these socio-economic fields. They match the documented Pudhumai Penn CORE rule and are synthetic.

| Field | Value |
| --- | --- |
| Age | 20 |
| Gender | Female |
| Marital status | Never married |
| Student status | Yes |
| First higher-education course | Yes |
| School background | Government school, Classes 6 to 12 |
| Orphan status | No |
| Destitute status | No |
| Occupation category | Other |
| Wet land | 0 |
| Dry land | 0 |

Save the wallet, then click **Find Eligible Schemes**.

## Expected recommendation

**Pudhumai Penn** (`TN-SW-001`) should appear as **Predicted eligible**.

Open **View Official Government Source**. Tell the evaluator that the URL comes from the official catalog file and was not invented.

## Show a recommendation change

1. Click **Edit Profile**.
2. Change Gender to Male.
3. Save the wallet.
4. Click **Find Eligible Schemes** again.
5. Pudhumai Penn should no longer appear. Tamil Pudhalvan may appear if the other student fields still match.

Do not change the Decision Tree or eligibility rules to force this result.

## Other pages to show

- **Schemes** — six CORE schemes, CORE badge, and official sources.
- **Evaluation** — banner *Research Evaluation — Synthetic, Rule-Derived Dataset*. Point to Decision Tree F1 = 1.00 and immediately say it measures agreement with rule-derived labels, not real-world accuracy.
- **Logout**, then try **My Wallet** — the page should require login.
- Log in again and confirm the wallet is still there.

## What to tell the evaluator

- This is an academic research prototype, not a government portal.
- Citizens are synthetic. Labels come from documented scheme rules.
- The wallet is not Aadhaar and is not a government identity system.
- Predicted eligible is not approval.
- Only six CORE schemes are scored.
- Official information must be verified with the respective department.
