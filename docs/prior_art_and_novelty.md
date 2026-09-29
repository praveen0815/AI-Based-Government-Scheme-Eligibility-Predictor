# Prior Art and Novelty

Mentor briefing for *State Government Sponsored Scheme Eligibility Predictor Engine Utilizing Unified Socio-Economic Data Wallets*. This note describes only what the current repository implements. It is not a literature survey and does not invent papers, metrics, or features.

---

## 1. Prior Art

These are established technical approaches. Our project uses them; it does not invent them.

- **Rule-based eligibility.** Official Tamil Nadu department pages and portals publish yes/no conditions (age, gender, student status, occupation, land, and similar). A deterministic checker can apply those conditions.
- **ML-based eligibility prediction.** Supervised classifiers can learn eligible / not-eligible labels from citizen–scheme examples.
- **Scheme recommendation / discovery.** Catalog search, filters, and ranked lists of schemes are common in aggregators and department directories.
- **Hybrid Rule + ML.** Expert rules and a learned model can be run on the same input and compared.
- **Profile-based matching.** A stored socio-economic profile can be reused instead of re-entering the same fields on every scheme page.

Each of those building blocks already exists as a general method.

---

## 2. Research Gap

Typical systems do one of the following in isolation: show official rules, train an ML score, or let a user browse a catalog.

What this implementation integrates, and what makes it useful as an academic prototype, is the *serving contract*:

1. Documented CORE rules are the **reference eligibility result** at API time, not only a training-label generator.
2. The Decision Tree is kept as an **independent predictor** and compared openly (agreement is never hidden).
3. One owner-scoped socio-economic wallet is reused for prediction, recommendation, comparison, insights, documents, and application *tracking*.
4. Missing profile fields are labelled as **cannot fully evaluate**, not as “add this to become eligible.”
5. A citizen workflow and a separate admin console sit on the same hybrid result, with a read-only research layer that reports Rule-vs-ML agreement on the existing synthetic test records.

The gap we address is therefore **integration and authority**, not a new classifier or a new government rule.

---

## 3. Novelty of Our Project

Strongest points that the **current code** supports:

1. **Rule-authoritative Hybrid Rule + ML at serving time.** For each CORE scheme the API runs the documented rule engine and the saved Decision Tree. `prediction` is the rule result. If they differ, the response states that the documented rule is the reference. `/recommend` includes a scheme only when the rule says eligible; ranking still uses model probability.

2. **Unified, reusable socio-economic wallet.** `citizen_profiles` stores socio-economic fields and `user_id` only. It does not store eligibility labels or model scores. The same profile is reused by wallet recommend, compare, insights, PDF, completeness, and admin review.

3. **Eligibility evaluation is separated from recommendation and catalog discovery.** `POST /predict` is one scheme. `POST /recommend` evaluates all CORE schemes, then ranks rule-eligible ones. Catalog search reads official scheme metadata and does not compute a second eligibility engine.

4. **Explainable results and explicit incomplete-information handling.** Responses expose `rule_reasons`, `ml_prediction`, `agreement`, and a composed explanation. Wallet completeness lists missing fields. Incomplete profiles are shown as “required to fully evaluate,” including in admin eligibility monitoring. This is not treated as an eligibility score.

5. **Citizen workflow on one authority, plus a separate Admin Console.** Implemented path: wallet / check → hybrid results → documents / readiness → personal application tracking (not government submit). Citizens use `AppShell`; administrators use `AdminShell` + `AdminRoute` (`is_admin`). Admin pages review users, documents, applications, and eligibility; they do not edit CORE rules.

6. **Research / evaluation layer with Rule-vs-ML agreement.** Read-only evaluation APIs, `/evaluation`, `/research-dashboard`, `/system-evaluation`, and `GET /api/v1/evaluation/hybrid` present the existing Phase 4/5 agreement study (synthetic, citizen-grouped test set). Live traffic does not retrain the tree.

---

## 4. Key Novelty Statement

Our contribution is a **rule-authoritative hybrid serving architecture**: documented CORE rules decide eligibility; a Decision Tree is compared, not substituted; and one reusable socio-economic wallet drives explanation, incomplete-field handling, citizen follow-up, admin monitoring, and a published Rule-vs-ML evaluation. We do not claim a new ML algorithm or official government decision-making.

---

## 5. What We Do NOT Claim

We do **not** claim to have invented:

- Rule-based eligibility checking
- Machine-learning classification
- Scheme recommendation or catalog search
- Hybrid Rule + ML as a general idea
- Citizen profiles, admin consoles, or evaluation dashboards as standalone concepts

We also do not claim government accuracy, real application outcomes, Aadhaar/identity verification, or that this prototype is an official department system. Labels and scores in this repository measure **agreement with documented CORE rules on synthetic citizens**.

Do not say “first,” “unique,” or “never done before.” Say **our architecture** or **our implementation**.

---

## 6. Evidence from Our Implementation

| Novelty point | Evidence in the current code |
| --- | --- |
| 1. Rule-authoritative hybrid | `backend/app/services/hybrid_prediction_service.py` (`reference_prediction`, `DISAGREE_TEXT`); `backend/app/services/rule_engine_service.py` (wraps `ml/src/eligibility_rules.py`); `backend/app/services/recommendation_service.py` (recommend only if `hybrid.rule.rule_eligible`); `POST /api/v1/predict`, `POST /api/v1/recommend` |
| 2. Unified wallet | `backend/app/models/citizen.py` (`citizen_profiles`; docstring: does not store eligibility results); wallet routes under `/api/v1/wallets/*`; frontend `/wallet` |
| 3. Eligibility vs recommend vs catalog | `backend/app/routes/prediction.py`; `backend/app/services/recommendation_service.py`; catalog/search via `scheme_service` / `/api/v1/schemes` (and related catalog APIs); frontend `/check`, `/results`, `/schemes` |
| 4. Explanation + incomplete fields | Hybrid `explanation` + `rule_reasons`; `backend/app/services/explanation_service.py`; `backend/app/services/profile_completeness_service.py`; frontend `WhyThisScheme.tsx`; admin `cannot_fully_evaluate` in `admin_service.py` |
| 5. Citizen workflow + Admin Console | Frontend routes: `/wallet`, `/check`, `/documents`, `/readiness`, `/applications`; `application_tracking` APIs (personal tracking only); `PortalLayout.tsx` (`AdminShell` vs `AppShell`); `AdminRoute.tsx`; `/admin/*` |
| 6. Research layer + Rule-vs-ML | `backend/app/routes/evaluation.py` (`GET /api/v1/evaluation/hybrid`); `evaluation_service.py` `hybrid()`; frontend `/evaluation`, `/research-dashboard`, `/system-evaluation`; `docs/rule_vs_ml_comparison.md` as the recorded source |

---

**Mentor check:** Yes. The current implementation provides enough evidence for the six points above. The defensible claim is the **integrated, rule-authoritative architecture**, not novelty of ML, rules, or recommendation as individual technologies.
