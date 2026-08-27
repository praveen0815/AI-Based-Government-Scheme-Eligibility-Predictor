# Phase 13 — Frontend UI/UX redesign

Date: **2026-08-14**.

Frontend version: **13.0.0**. Backend version is unchanged.

This phase is a visual and information-architecture redesign of the React citizen portal. Machine-learning models, datasets, eligibility labels, FastAPI contracts, JWT authentication, wallet ownership, and evaluation calculations were not modified.

## Old UI problems

The Phase 12 portal was functional, but it still read as a basic academic form:

- Teal utility styling and mixed product naming
- One long flat eligibility form
- Little visual hierarchy for a live demo
- Repeated disclaimer wording
- Limited empty, loading, and error states
- A home page that did not introduce the product clearly

## New design system

Product name: **SchemeWise AI**.

Primary description: Government Scheme Discovery & Eligibility Research Platform.

Tokens live in `frontend/tailwind.config.js`:

| Token | Value | Use |
| --- | --- | --- |
| `brand-900` / `brand-800` | `#172554` / `#1E3A8A` | Brand surfaces |
| `action` | `#2563EB` | Primary actions |
| `success` | `#15803D` | Predicted eligible / success only |
| `warning` | `#B45309` | Unverified catalog fields |
| `danger` | `#B91C1C` | Destructive actions and errors |
| `canvas` / `surface` / `line` | `#F8FAFC` / `#FFFFFF` / `#E2E8F0` | Page, cards, borders |
| `ink-900` / `700` / `500` | `#0F172A` / `#475569` / `#64748B` | Text |

Typography uses Inter with a system-safe fallback. Shared primitives include `Button`, `Badge`, `PageHeader`, `StatCard`, `EmptyState`, `StepIndicator`, `ResearchNotice`, and `BrandMark`.

The application is not styled as an official government website. There are no emblems, seals, or government logos.

## Page changes

- **Home:** product landing with hero, how-it-works, capabilities, wallet introduction, research transparency, and a final CTA.
- **Check Eligibility:** five-step guided form (Personal, Education, Family, Occupation, Review). Backend field names are unchanged.
- **Results:** scheme matches, compact profile summary, predicted-eligible cards, official sources.
- **Schemes:** search, category filter, CORE badge, expandable details. The catalog endpoint still returns CORE schemes only.
- **Login / Register:** SchemeWise account screens. JWT and sessionStorage behavior are unchanged.
- **Wallet:** profile dashboard with grouped cards and the same ownership/delete confirmation flow.
- **Evaluation:** academic research dashboard using the existing evaluation APIs. Metrics are not recalculated.

## Copy and terminology

Centralized copy lives in `frontend/src/constants/copy.ts`.

Consistent wording:

- Predicted eligible
- May match your profile
- Model prediction probability
- Research prototype
- Supported schemes
- Official source
- Documented eligibility rules

Avoided wording: approved, guaranteed, government verified, eligibility confirmed.

## Accessibility improvements

- Semantic landmarks: header, main, footer, labelled navigation
- Heading hierarchy on each page
- Labels associated with inputs; required fields use `aria-required`
- Invalid fields use `aria-invalid`; errors use `role="alert"`
- Visible focus styles use the action color
- Header menu has an accessible Open/Close control
- External official-source links use `target="_blank"` and `rel="noreferrer"`
- Status is not communicated by color alone
- `prefers-reduced-motion` disables the spinner animation

## Responsive behavior

The shell uses a maximum content width of 80rem (1280px) with consistent horizontal padding.

- Desktop: brand, navigation, and auth actions in one header row
- Tablet/mobile: stacked cards, full-width primary buttons, hamburger navigation
- Evaluation tables scroll horizontally on narrow viewports
- No frontend eligibility rules were added

## Preserved API contracts

No FastAPI, JWT, wallet-ownership, recommendation, or evaluation-calculation changes. The frontend still only collects a profile, calls the existing endpoints, and renders the response.

Unchanged endpoints include `/api/v1/predict`, `/api/v1/recommend`, `/api/v1/schemes`, wallet CRUD and wallet recommend, auth register/login/me, and all `/api/v1/evaluation/*` routes.

## Tests and build

- Frontend `npm test`: 48 passed, 0 failed
- Frontend `npm run build`: succeeded (`tsc -b && vite build`)
- Backend `python -m unittest discover -s tests -v` (project `.venv`): 78 passed, 0 failed

## Known limitations

This remains an academic prototype with synthetic citizens, rule-derived labels, and six CORE schemes. Predictions are not government approval. The wallet is a research profile store, not a government identity system.
