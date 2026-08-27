# Phase 8 results

Date: **2026-08-14**.

## 1. Phase objective

Build a clean React citizen portal that collects socio-economic information, calls `POST /api/v1/recommend`, and shows predicted-eligible schemes with explanations, benefits, documents, application method, and official source links.

This is an **AI research prototype**. It is not an official government portal.

## 2. Frontend architecture

```
                         CITIZEN
                            │
                            ▼
                  ┌──────────────────┐
                  │   React Portal   │
                  │                  │
                  │ Citizen Profile  │
                  └────────┬─────────┘
                           │
                           │ HTTP
                           ▼
                  ┌──────────────────┐
                  │     FastAPI      │
                  │                  │
                  │ /recommend       │
                  └────────┬─────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │ Scheme Catalog   │
                  │    CORE only     │
                  └────────┬─────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │  Decision Tree   │
                  │      Model       │
                  └────────┬─────────┘
                           │
                           ▼
                  Eligibility Results
                           │
                           ▼
                  Explanation Service
                           │
                           ▼
                  Recommendation List
                           │
                           ▼
                  ┌──────────────────┐
                  │   React Results  │
                  │      Cards       │
                  └──────────────────┘
```

The frontend does not implement CORE eligibility rules. FastAPI plus the saved Decision Tree remain the source of prediction.

## 3. Pages created

| Route | Page |
| --- | --- |
| `/` | Landing page |
| `/check` | Citizen information form |
| `/results` | Recommendation results |
| `/schemes` | Supported CORE schemes (informational) |

Opening `/results` without a current API result redirects to `/check`.

## 4. Components created

`Header`, `Footer`, `Disclaimer`, `FormField`, `SelectField`, `BooleanField`, `SchemeCard`, `LoadingState`, `ErrorState`, `EmptyRecommendations`.

## 5. API integration

`frontend/src/services/api.ts` reads `VITE_API_BASE_URL` and exposes:

- `recommendSchemes(citizenProfile)` → `POST /api/v1/recommend`
- `fetchCoreSchemes()` → `GET /api/v1/schemes`

Request field names match the FastAPI `CitizenProfile` schema. Types were taken from `backend/app/schemas/recommendation.py`.

## 6. Form fields

Age, gender, student status, first higher-education course, school background, marital status, orphan status, destitute status, occupation, wet land, dry land.

Friendly labels are shown. Exact backend values are submitted. `scheme_id` is not collected.

## 7. Validation

Client-side checks run before the request:

- age 0–120
- land >= 0
- every field required

Invalid forms are not sent to the API.

## 8. Recommendation display

Results say **Predicted eligible**, never “officially eligible”. Cards show the reason, benefits, documents, application method, and a disclaimer on the page (not only in the footer).

## 9. Official source links

`View Official Government Source` uses `official_source_url` from the API (copied from `schemes.csv`). Links open in a new tab with `rel="noopener noreferrer"`. Empty or `NEEDS VERIFICATION` catalog values are shown as-is.

## 10. Error handling

Friendly messages cover network failure, timeout, HTTP 422, 500, 503, and malformed JSON. Stack traces and filesystem paths are not shown.

## 11. CORS change

Smallest backend change: allow only

- `http://localhost:5173`
- `http://127.0.0.1:5173`

Methods: `GET`, `POST`, `OPTIONS`. Credentials off. No `*`. See `backend/app/cors.py` and `docs/api_design.md`.

## 12. Responsive design

Centered `max-w-5xl` layout, stacked scheme cards, two-column land fields that collapse on small screens, and readable type sizes.

## 13. Testing results

Backend: `python -m unittest discover -s tests -v`

| Result | Count |
| --- | --- |
| Total | 35 |
| Passed | 35 |
| Failed | 0 |
| Skipped | 0 |

Frontend: `npm test`

| Result | Count |
| --- | --- |
| Total | 21 |
| Passed | 21 |
| Failed | 0 |

## 14. Build and visual verification

`npm run build` succeeded (Vite production build). ESLint reported 0 errors.

Automated tests cover home, form, validation, submit payload, loading, one and many recommendations, zero recommendations, official URL, edit/back, API 422, and backend errors. Live screenshots were not captured in this phase; run `npm run dev` with the backend to review the UI.

## 15. Limitations

- No login or saved profiles. Refreshing `/results` returns the user to the form.
- Predictions use synthetic, rule-derived training data.
- The portal is not a government service.
- CORS is for local Vite only.

## 16. Next phase

After approval, Phase 9 can add optional persistence (PostgreSQL) or a documented demo walkthrough. Do not add authentication, an LLM, or deployment until that is explicitly approved.
