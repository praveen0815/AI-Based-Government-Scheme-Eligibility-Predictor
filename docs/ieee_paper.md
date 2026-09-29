# Smart Scheme Eligibility Prediction Using a Hybrid Documented-Rule and Decision-Tree Architecture

**IEEE-style academic manuscript for the existing mini-project**

> This file is a camera-ready *structure* and *content* manuscript compiled only from records already in this repository. It is not a government publication. Author names and conference identifiers are omitted from the repository and must be filled in by the project team before external submission. Every numeric result below is copied from the cited project document. No new experiment was run for this manuscript.

---

**Authors:** *[To be completed by the project team]*  
**Affiliation:** Academic mini-project — State Government Sponsored Scheme Eligibility Predictor Engine  
**Manuscript type:** Undergraduate / mini-project conference paper (IEEE section layout)

---

## Abstract

Citizens who wish to check Tamil Nadu welfare-scheme eligibility must read rules that are published across several official department portals. This paper describes an academic research prototype that stores a user-owned socio-economic profile and returns an explainable eligibility result for a fixed CORE set of six schemes. Eligibility is formulated as repeated binary classification: one citizen–scheme pair maps to an eligible / not-eligible label. Labels in the training table are produced by a deterministic rule engine that encodes only documented CORE conditions; they are not taken from real applications. Three baseline classifiers were trained on 24,000 citizen-grouped training rows and evaluated on 6,000 held-out rows. The selected prototype model is a Decision Tree, which reproduced the rule-derived labels on the synthetic test set (F1 = 1.0000). Logistic Regression and Random Forest are retained as published baselines (F1 = 0.4171 and 0.9966). In the deployed research API, the documented rule engine remains the reference result whenever the tree disagrees. The work does not claim government accuracy, official approval, or production deployment.

**Keywords:** welfare-scheme eligibility, hybrid rule and machine learning, decision tree, explainable recommendation, synthetic socio-economic data, academic prototype

---

## I. Introduction

Official Tamil Nadu welfare schemes state eligibility in terms of age, gender, student status, school background, marital status, occupation, land holding, and related socio-economic conditions. Those statements appear on department portals rather than in a single machine-readable catalog that a citizen can query against a personal profile [1], [2].

The academic problem studied here is therefore:

> Given a socio-economic citizen profile and one CORE scheme identifier, predict whether the *documented* eligibility rules for that scheme are satisfied, explain the result, and rank the schemes for which the documented rule is satisfied.

This is not a government eligibility decision system. The prototype does not collect Aadhaar or other government identity numbers, does not submit applications to any department, and does not use real beneficiary microdata [3], [4].

The implemented system (SchemeWise / Smart Scheme Eligibility Prediction System) contributes the following, all already present in the repository:

1. An official-source scheme catalog of 13 schemes, of which six are labelled CORE for machine learning [2], [5].
2. A synthetic research dataset of 5,000 citizens and 30,000 citizen–scheme rows with rule-derived labels [6], [7].
3. A published baseline comparison of Logistic Regression, Decision Tree, and Random Forest on a citizen-grouped 80/20 split [8], [9].
4. A Hybrid Rule + Decision Tree serving path in which the documented rule is the research reference and the tree is an independent predictor [10], [11].
5. A React citizen portal and FastAPI research API, including owner-scoped wallets, authentication, evaluation dashboards, and an administrator console [12].

The remainder of this manuscript follows IEEE conference section order. Section II states related constraints and sources. Section III defines the learning problem. Section IV describes the catalog and dataset. Section V describes labeling, training, hybrid authority, and ranking. Section VI summarizes the implemented architecture. Section VII reports the existing experimental numbers. Section VIII states limitations. Section IX concludes.

---

## II. Background and Related Constraints

### A. Official scheme sources

Phase 2 of this project collected scheme-level facts only from Tamil Nadu or Government of India pages owned by a department, a state portal, or an official service platform. Access date for that collection is 2026-08-14 [1]. Primary indexes include the Government of Tamil Nadu schemes directory [13], the Social Welfare and Women Empowerment Department [14], the Kalaingar Magalir Urimai Thogai portal [15], Revenue Administration social-security pages [16], the Chief Minister’s Uzhavar Pathukappu Thittam pages [17], [18], the Chief Minister’s Comprehensive Health Insurance Scheme eligibility page [19], the Commissionerate for Welfare of the Differently Abled [20], TNeGA e-Sevai [21], and the Pudhumai Penn institution portal [22].

Blogs, news explainers, coaching sites, YouTube, Wikipedia, and unofficial aggregators were rejected as primary sources [1]. Scheme names, benefits, and numeric ceilings were not invented. Where two official pages disagree, both statements were kept and the field was marked for verification rather than averaged [2], [5].

### B. Why real citizen records are not used

A supervised classifier needs many citizen–scheme pairs with known labels. Tamil Nadu does not publish identifiable beneficiary microdata for student use. Individual income, widow status, and disability status are not public. Collecting real Aadhaar, ration-card, or disability records would create consent and privacy risk that this academic project does not take [3]. Synthetic profiles are therefore the only labelled rows in the repository.

### C. What this paper does not survey

This manuscript does not introduce an external literature review with additional papers. No third-party accuracy numbers are quoted. The scientific claim is limited to what this repository already measured: agreement of baseline models with a documented rule engine on held-out *synthetic* citizens [8], [9], [23].

---

## III. Problem Formulation

Eligibility is a yes/no test on official conditions (age band, gender, student status, widow status, land ceiling, and similar). The first model therefore solves binary classification, not rupee-benefit regression and not preference ranking [3].

| Item | Definition |
| --- | --- |
| Input | Citizen socio-economic features from the CORE feature specification, plus `scheme_id` [4] |
| Target | `eligible` ∈ {0, 1} |
| Unit | One citizen–scheme pair |

The same citizen may be eligible for several CORE schemes and ineligible for others. The processed table stores those pairs. Empty official scheme fields mean “this factor is not used,” not “the citizen fails” [3].

Schemes with `ml_scope = HOLD` or `eligibility_rule_status = UNRESOLVED` are excluded from the first training set. ADVANCED schemes are official but need extra features or special enrollment paths and are also excluded from the first labels [3], [5].

---

## IV. Dataset

### A. Official catalog

The catalog file is `dataset/raw/schemes.csv`. It contains 13 official schemes. `scheme_id` is a project key, not an official government scheme code [1]. Six schemes are CORE [5]:

| scheme_id | Official name (catalog) | Why CORE |
| --- | --- | --- |
| TN-SW-001 | Pudhumai Penn | Gender, student, and school-type rules are official and labelable |
| TN-SW-002 | Tamil Pudhalvan | Same structure with male and aided Tamil-medium variation |
| TN-SW-004 | Dharmambal widow remarriage | Widow-remarriage rule is official |
| TN-SW-006 | Annai Therasa orphan girls | Orphan-girl rule is official |
| TN-REV-001 | CM Uzhavar Pathukappu Thittam | Age, occupation, and land limits are official |
| TN-REV-002 | Un-married Women Pension | Age, gender, unmarried, and destitute rules are official |

ADVANCED (not labelled for the first model): TN-SW-003, TN-KMUT-001, TN-HFW-001.  
HOLD (material factor missing or officially contradictory): TN-SW-005, TN-SW-007, TN-REV-003, TN-DAW-001 [5].

Documented CORE labeling conditions used by the rule module include [3]:

- TN-SW-001: female AND student AND first higher-education course AND government school Classes 6–12
- TN-SW-002: male AND student AND first higher-education course AND government or aided Tamil-medium school Classes 6–12
- TN-SW-004: female AND widow remarrying AND age ≥ 18 (department-level marriage-assistance convention)
- TN-SW-006: female AND orphan AND age ≥ 18 (same documented convention)
- TN-REV-001: age 18–65 AND listed occupation AND (wet land ≤ 2.50 acres OR dry land ≤ 5.00 acres)
- TN-REV-002: female AND never married AND age ≥ 50 AND destitute

### B. Synthetic citizens and labels

Phase 3 generated fictional research profiles with seed `20260814`. The rows are not a sample of Tamil Nadu residents [6], [7], [23].

| Quantity | Value | Source |
| --- | ---: | --- |
| Citizens | 5000 | [6], [7] |
| Citizen–scheme records | 30000 | [6], [7] |
| Eligible records | 3653 | [6] |
| Non-eligible records | 26347 | [6] |
| Overall eligible share | 12.18% | [6] |
| Missing values in `citizens.csv` | 0 | [6] |
| Missing values in `eligibility_dataset.csv` | 0 | [6] |
| Duplicate `citizen_id` | 0 | [6] |
| Duplicate `citizen_id` + `scheme_id` | 0 | [6] |

Per-scheme eligible counts were not altered to force class balance [6]:

| scheme_id | Eligible | Not eligible | Eligible % |
| --- | ---: | ---: | ---: |
| TN-SW-001 | 445 | 4555 | 8.90% |
| TN-SW-002 | 461 | 4539 | 9.22% |
| TN-SW-004 | 356 | 4644 | 7.12% |
| TN-SW-006 | 408 | 4592 | 8.16% |
| TN-REV-001 | 1669 | 3331 | 33.38% |
| TN-REV-002 | 314 | 4686 | 6.28% |

The labelled ML table used for baselines is `dataset/processed/eligibility_dataset.csv` with SHA-256 `ba91158194b4060be01894306d72ae25b96e4abeebbdf4ff61e93ffd059d30d0` [7].

### C. Split

The Phase 4 split is citizen-grouped, 80/20, seed `20260814`, stratified by per-citizen eligible-scheme count [7]:

| Split | Citizens | Rows |
| --- | ---: | ---: |
| Train | 4000 | 24000 |
| Test | 1000 | 6000 |

Environment recorded with those scores: Python 3.12.10, scikit-learn 1.9.0, pandas 3.0.5, numpy 2.5.2 [7], [8].

---

## V. Methodology

### A. Baseline models

Three classifiers were trained on the primary feature set that includes `scheme_id`. Each row is a citizen–scheme pair and the six CORE rules differ, so `scheme_id` is part of the primary experiment. An alternative run without `scheme_id` is reported only as a harder, less appropriate setup [7].

The default classification threshold is 0.50 [9], [24].

### B. Model selection

Selection did not use accuracy as the only criterion. Published comparison [9]:

| Criterion | Logistic Regression | Decision Tree | Random Forest |
| --- | ---: | ---: | ---: |
| F1 (test, with `scheme_id`) | 0.4171 | **1.0000** | 0.9966 |
| Recall | 0.7729 | **1.0000** | 1.0000 |
| Precision | 0.2856 | **1.0000** | 0.9932 |
| PR-AUC | 0.3255 | **1.0000** | 1.0000 |
| Rule-engine agreement | 0.7368 | **1.0000** | 0.9992 |

The prototype model is the Decision Tree pipeline `ml/models/baseline/decision_tree.joblib` [9] because:

1. It matched the rule-derived labels on held-out citizens (0 disagreements) [8], [9].
2. F1, recall, precision, and PR-AUC are all 1.0000 on this synthetic test set [7], [9].
3. A single tree can emit the decision path used by the existing explanation module [9].
4. Random Forest is almost as accurate but recorded 5 false positives and is larger [8], [9].
5. Logistic Regression disagreed with the documented rules 1,579 times [8], [9].

Near-perfect tree scores are expected: the tree sees every factor the labeler used, including `scheme_id`. A score of 1.0 is a consistency check, not proof of real-world skill [9], [23].

### C. Hybrid serving authority

The research API does not treat the tree as a government decision. Serving uses both the documented rule engine (`ml/src/eligibility_rules.py`) and the saved Decision Tree [10]:

```text
Citizen Profile
  → Official / documented rule engine  → rule result
  → Decision Tree                      → ML result
  → Rule / ML comparison
  → Explainable final result
```

- `prediction` is the documented-rule reference result.
- `ml_prediction` is the tree output.
- `eligible_probability` is a model prediction probability. It is not government confidence, certainty, or approval [10].
- If the two agree, the API reports that they agree.
- If they differ, the API reports the disagreement and shows the documented rule as the reference. Disagreements are not hidden [10], [11].
- `/recommend` includes a scheme when the documented rule says eligible, even if the tree disagrees. Ranking remains `eligible_probability` descending, then `scheme_id` ascending [10], [11].

Human-readable reasons come from the rule module, not from generated “the AI thinks…” text [9], [11]. Incomplete stored profiles are labelled as requiring information to fully evaluate a scheme; the interface does not tell users that adding a field will make them eligible [25].

### D. Recommendation ranking

Recommendation is eligibility-based, not a learned preference model and not a government priority ranking [11]. ADVANCED and HOLD schemes are never recommended. Official source URLs are copied from the catalog and are not guessed [11].

---

## VI. System Architecture

The implemented title used in the architecture record is *State Government Sponsored Scheme Eligibility Predictor Engine Utilizing Unified Socio-Economic Data Wallets* [12].

```text
React citizen / admin portal
        ↓
FastAPI research API
        ├── Authentication (register, password login, Google Sign-In, JWT)
        ├── Owner-scoped wallet and citizen modules
        ├── Hybrid prediction and recommendation
        ├── Evaluation artifact readers
        └── Administrator review APIs
        ↓
PostgreSQL (users, citizen_profiles, and later owner-scoped tables)
Decision Tree artifact + documented rule module
Official scheme catalog
```

Recorded implementation facts [12]:

- Backend: FastAPI 12.0.0.
- Frontend: React, TypeScript, Vite, Tailwind. Login is the first public page. Unauthenticated visits redirect to `/login`. After sign-in, citizens open `/dashboard` and administrators open `/admin`.
- Public research routes include `/health`, `/predict`, `/recommend`, `/schemes`, `/model-info`, and `/evaluation/*`.
- Authenticated routes include `/auth/*`, `/wallets/*`, `/applications`, `/admin/*`, and other owner-scoped resources.
- CORS uses an explicit origin allowlist (never `*`).
- The wallet stores socio-economic fields plus `user_id`. It does not store eligibility labels, model scores, Aadhaar numbers, or government identifiers.
- Passwords are hashed with Argon2. Authentication is application-account ownership, not government identity verification.

A read-only evaluation dashboard presents the existing Phase 4/5 metrics. It does not retrain models or score wallets [12], [26]. In-process request timings exist for research review and reset when the API process restarts; they are not published here as scientific measurements [27].

The portal also includes comparison, PDF reports, document checklists, application *tracking* (not government submit), notifications, English/Tamil copy, and an administrator console. Those modules reuse the same hybrid eligibility result; they do not add a second eligibility engine [12].

---

## VII. Experimental Results

All scores in this section measure **agreement with the rule engine on synthetic held-out citizens**. They are not real application outcomes [7], [8], [23].

### A. Overall test metrics (primary: with `scheme_id`)

Copied from [7]:

| Model | Accuracy | Precision | Recall | F1 | Balanced Accuracy | ROC-AUC | PR-AUC |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| logistic_regression | 0.7368 | 0.2856 | 0.7729 | 0.4171 | 0.7524 | 0.8338 | 0.3255 |
| decision_tree | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| random_forest | 0.9992 | 0.9932 | 1.0000 | 0.9966 | 0.9995 | 1.0000 | 1.0000 |

Best baseline by F1: decision_tree [7].

### B. Overall test metrics (alternative: without `scheme_id`)

Copied from [7]:

| Model | Accuracy | Precision | Recall | F1 | Balanced Accuracy | ROC-AUC | PR-AUC |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| logistic_regression (no scheme_id) | 0.5718 | 0.1848 | 0.7373 | 0.2956 | 0.6431 | 0.7101 | 0.2293 |
| decision_tree (no scheme_id) | 0.4602 | 0.1833 | 0.9932 | 0.3095 | 0.6897 | 0.7250 | 0.2305 |
| random_forest (no scheme_id) | 0.4725 | 0.1855 | 0.9822 | 0.3121 | 0.6920 | 0.7282 | 0.2408 |

### C. Agreement with the rule engine

Test set: 1,000 citizens, 6,000 citizen–scheme rows [8].

| Method | Agreement rate | Disagreements | False positives | False negatives |
| --- | ---: | ---: | ---: | ---: |
| Deterministic rule engine | 1.0000 | 0 | 0 | 0 |
| logistic_regression | 0.7368 | 1579 | 1413 | 166 |
| decision_tree | 1.0000 | 0 | 0 | 0 |
| random_forest | 0.9992 | 5 | 5 | 0 |

False positive: model predicts eligible, rule label is not eligible. False negative: the reverse [8]. Random Forest’s five false positives are on TN-REV-001 (agreement 0.9950) [8].

### D. Decision Tree per-scheme test metrics

Copied from [7]. Every CORE scheme scored 1.0000 on accuracy, precision, recall, F1, balanced accuracy, ROC-AUC, and PR-AUC for the Decision Tree. That pattern is the expected reconstruction of the labeler, not a field trial [7], [23].

### E. Threshold note

Decision-tree leaf probabilities are usually 0 or 1 on this rule-derived set. Thresholds 0.30, 0.40, 0.50, 0.60, and 0.70 all give Decision Tree F1 = 1.0000. Logistic Regression F1 at those thresholds is 0.3517, 0.3887, 0.4171, 0.4310, and 0.3995 respectively. The default serving threshold remains 0.50 [24].

---

## VIII. Limitations and Ethical Scope

The following limits apply to every Phase 4–5 metric and to any API that serves the saved pipelines [23]:

1. Citizen profiles are synthetic (seed `20260814`). They are not Tamil Nadu residents.
2. Labels are assigned by `ml/src/eligibility_rules.py` from documented CORE conditions. They are not real approvals, field-officer decisions, or payment records.
3. No model in this repository has been tested against actual government approvals or rejections.
4. Near-perfect tree performance is expected because every labelling factor is in the feature set.
5. The useful scientific statement is that the tree reproduces the documented CORE rules on unseen synthetic people. It is not that the tree learned hidden official policy.
6. F1, accuracy, and prediction probability must not be quoted as the chance that a real applicant will receive a scheme.
7. Government rules can change. A stale model must not be treated as the current legal rule.
8. ADVANCED and HOLD schemes are excluded from labels and recommendations.
9. The prototype is not an official government system. It does not provide Aadhaar, OTP, payment, government application submit, or production deployment infrastructure [12], [23].

Application tracking in the portal is personal record-keeping for the research prototype only. Nothing is submitted to a government portal [12].

---

## IX. Conclusion

This mini-project built an academic eligibility-prediction prototype around a documented Tamil Nadu CORE catalog, synthetic rule-derived labels, and a Hybrid Rule + Decision Tree serving path. On the published citizen-grouped test split, the Decision Tree reproduced the labeling rules (F1 = 1.0000; 0 disagreements). Logistic Regression and Random Forest remain as baselines (F1 = 0.4171 and 0.9966; 1,579 and 5 disagreements). In the running system the documented rule engine is the reference result; the tree is compared, not substituted for the written rules.

The correct reading of these results is methodological consistency on synthetic data. The incorrect reading is government accuracy or guaranteed benefit. Future work that would change that claim — real outcome labels, production hosting, or identity verification — is outside this repository and is not reported here.

---

## Acknowledgment

Official scheme text used in the catalog belongs to the Government of Tamil Nadu and the cited departments. This manuscript does not speak for those departments.

---

## References

Project technical records (sources of every table in this paper):

1. *Phase 2 — Government scheme dataset collection*, `docs/dataset_collection.md`.
2. *Phase 2.1 — Scheme quality review*, `docs/scheme_quality_review.md`.
3. *ML problem definition*, `docs/ml_problem_definition.md`.
4. *Citizen feature specification*, `docs/citizen_feature_specification.md`.
5. *Scheme quality review*, CORE / ADVANCED / HOLD table, `docs/scheme_quality_review.md`.
6. *Dataset statistics*, `docs/dataset_statistics.md`.
7. *Baseline model results*, `docs/model_baseline_results.md`.
8. *Rule engine vs ML comparison*, `docs/rule_vs_ml_comparison.md`.
9. *Model selection*, `docs/model_selection.md`.
10. *Hybrid Rule + ML eligibility design*, `docs/hybrid_rule_ml_design.md`.
11. *Recommendation engine*, `docs/recommendation_engine.md`.
12. *Final system architecture*, `docs/final_system_architecture.md`.
13. Government of Tamil Nadu schemes directory, https://www.tn.gov.in/schemes.php
14. Social Welfare and Women Empowerment Department, https://www.tnsocialwelfare.tn.gov.in/en
15. Kalaingar Magalir Urimai Thogai portal, https://kmut.tn.gov.in/
16. Revenue Administration social security pensions, https://oap.tn.gov.in/
17. Chief Minister’s Uzhavar Pathukappu Thittam, https://www.landreforms.tn.gov.in/UPT.html
18. CMUPT back-office (Revenue Department), https://oap.tn.gov.in/cmupt/
19. Chief Minister’s Comprehensive Health Insurance Scheme eligibility, https://www.cmchistn.com/eligibility
20. Commissionerate for Welfare of the Differently Abled, https://www.scd.tn.gov.in/activities.php
21. TNeGA e-Sevai service list, https://www.tnesevai.tn.gov.in/Pages/ServiceList.aspx
22. Pudhumai Penn institution portal, https://pudhumaipenn.tn.gov.in/
23. *ML limitations*, `docs/ml_limitations.md`.
24. *Threshold analysis*, `docs/threshold_analysis.md`.
25. *Explainable eligibility*, `docs/explainable_eligibility_design.md`.
26. *Evaluation dashboard design*, `docs/evaluation_dashboard_design.md`.
27. *Performance and system evaluation*, `docs/performance_evaluation_design.md`.

---

## Appendix A — Submission checklist (repository, not a new experiment)

Use this list when moving the manuscript into an IEEE conference template (IEEEtran). Do not change numbers.

- [ ] Insert author names, IEEE membership marks (if any), and college affiliation.
- [ ] Keep the Abstract statement that scores are not government accuracy.
- [ ] Copy tables from Section VII only; do not recompute or round to a new value.
- [ ] Keep References [13]–[22] as official URLs already recorded in `docs/dataset_collection.md`.
- [ ] Do not add live API timings from a local process as if they were a published benchmark.
- [ ] Do not add Aadhaar, real citizens, or unverified scheme rules.
- [ ] After conversion to `.tex`/PDF, re-read Section VIII in the formatted file.

## Appendix B — Mapping from IEEE sections to repository modules

| IEEE section | Existing implementation (unchanged by this manuscript) |
| --- | --- |
| III–V | `ml/src/eligibility_rules.py`, `ml/src/validate_scheme_dataset.py`, baseline artifacts under `ml/models/` |
| V-C | `backend/app/services/hybrid_prediction_service.py` and recommendation ranking |
| VI | `backend/app/main.py`, React portal, PostgreSQL wallet |
| VII | `docs/model_baseline_results.md`, `docs/rule_vs_ml_comparison.md`, evaluation APIs that *read* those artifacts |
