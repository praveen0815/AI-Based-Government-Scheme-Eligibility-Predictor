# Phase 7 results

Date: **2026-08-14**.

This phase adds **personalized eligibility-based scheme recommendation**. It does not claim that the model learned real citizen preferences or government priority.

## 1. What was implemented

- Official scheme catalog service reading `dataset/raw/schemes.csv`
- `POST /api/v1/recommend` for one citizen against all six CORE schemes
- `GET /api/v1/schemes` for CORE catalog metadata
- Eligible-only recommendation list plus `evaluated_schemes` for research
- Deterministic ranking: model probability, then `scheme_id`
- Human-readable reasons reused from `ml/src/explanation.py`
- Existing `POST /api/v1/predict` left in place

The Decision Tree artifact, synthetic citizen files, and official labels were not modified.

## 2. New endpoint

`POST /api/v1/recommend`

Also added `GET /api/v1/schemes` so a later frontend can list CORE metadata without inventing scheme text.

Swagger: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

## 3. Request structure

Citizen fields only. No `scheme_id`.

Validation is the same as `/predict` and uses `ml/src/ml_config.py` (the same vocabulary as `docs/citizen_feature_specification.md`):

`age`, `gender`, `is_student`, `first_higher_education_course`, `school_background`, `marital_status`, `is_orphan`, `is_destitute`, `occupation_category`, `wet_land_acres`, `dry_land_acres`

## 4. Response structure

- `total_schemes_evaluated`
- `eligible_scheme_count`
- `ranking_rule`
- `recommendations` (predicted-eligible only, with catalog metadata)
- `evaluated_schemes` (all six CORE predictions)
- `disclaimer`

Each recommendation includes `status_label: "Predicted eligible"`. The API never says the citizen is officially eligible.

## 5. Six CORE schemes evaluated

| ID | Official catalog name |
| --- | --- |
| TN-SW-001 | Moovalur Ramamirtham Ammaiyar Ninaivu Pudhumai Penn Thittam |
| TN-SW-002 | Tamil Pudhalvan Scheme |
| TN-SW-004 | Dr. Dharmambal Ammaiyar Ninaivu Widow Remarriage Assistance Scheme |
| TN-SW-006 | Annai Therasa Ninaivu Marriage Assistance Scheme for Orphan Girls |
| TN-REV-001 | Chief Minister's Uzhavar Pathukappu Thittam 2011 |
| TN-REV-002 | Un-married Women Pension |

ADVANCED and HOLD catalog rows are never recommended.

## 6. Ranking strategy

1. Keep schemes whose model prediction is `eligible`.
2. Sort by `eligible_probability` descending.
3. Break ties by `scheme_id` ascending.

This is reproducible and not a government priority ranking.

Condition-count scoring was not used. An eligible scheme already satisfies every documented CORE condition, so a count would only measure how many rules that scheme has.

Limitation: the Decision Tree often returns probability `1.0` or `0.0` on this synthetic, rule-derived set. When several eligible schemes share `1.0`, the visible order is the `scheme_id` tie-break.

## 7. Explainability

Reasons come from the existing explanation module. They use the supplied citizen values and documented CORE rules. No LLM is used. Example:

`Eligible for Pudhumai Penn because the citizen is female, is_student=True, first_higher_education_course=True, and school_background=government_6_to_12.`

## 8. Example recommendation

Citizen: age 20, female, student, first higher-education course, `government_6_to_12`.

- `eligible_scheme_count`: 1
- Recommended: **TN-SW-001**
- `status_label`: Predicted eligible
- `eligible_probability`: 1.0
- `required_documents`: `NEEDS VERIFICATION` (copied from the catalog, not rewritten)
- `official_source_url`: `https://www.tnsocialwelfare.tn.gov.in/en/specilisationswoman-welfare/pudhumai-penn`

A female student who is also an orphan produced **TN-SW-001** then **TN-SW-006**, which matches the published tie-break.

## 9. Zero-recommendation case

Citizen: age 10, male, not a student, school `other`, occupation `other`.

- `total_schemes_evaluated`: 6
- `eligible_scheme_count`: 0
- `recommendations`: `[]`

`evaluated_schemes` still lists all six CORE not-eligible reasons.

## 10. Test results

Command: `python -m unittest discover -s tests -v` from `backend/`

| Result | Count |
| --- | --- |
| Total | 31 |
| Passed | 31 |
| Failed | 0 |
| Skipped | 0 |

All 14 Phase 6 prediction tests still pass. Phase 7 added recommendation, catalog, ranking, validation, and `/predict` coexistence tests. Existing tests were not removed.

## 11. Limitations

- Training data is synthetic. Labels are rule-derived, not real application outcomes.
- The engine recommends from model eligibility, not from learned preferences.
- Many probabilities are 0 or 1, so ranking often reduces to `scheme_id`.
- Catalog gaps such as `NEEDS VERIFICATION` are returned as-is.
- Predictions are not government approval. Users must check the official source.

## 12. Files created / modified

**Created**

- `backend/app/schemas/recommendation.py`
- `backend/app/services/scheme_service.py`
- `backend/app/services/recommendation_service.py`
- `backend/app/routes/recommendation.py`
- `backend/tests/test_recommendation_api.py`
- `docs/recommendation_engine.md`
- `docs/phase7_results.md`

**Modified**

- `backend/app/main.py`
- `backend/app/paths.py`
- `backend/app/schemas/prediction.py` (shared `CitizenProfile`)
- `backend/README.md`
- `docs/api_design.md`
- `README.md`
- `.env.example`

**Not modified**

- `dataset/raw/citizens.csv`
- `dataset/processed/eligibility_dataset.csv`
- `ml/models/baseline/decision_tree.joblib`

## 13. Next recommended phase

Phase 8, after approval: a read-only React frontend that calls `/api/v1/recommend` and `/api/v1/schemes`, shows predicted-eligible schemes, explanations, and official source links, and repeats the research disclaimer.

Do not add PostgreSQL, authentication, an LLM, or deployment until that frontend contract is agreed.
