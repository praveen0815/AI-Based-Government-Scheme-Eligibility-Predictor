# Synthetic data generation

Phase 3 creates fictional citizen profiles and rule-derived eligibility labels for the six CORE schemes. It does not use real residents and does not train a model.

## Why synthetic data is being used

The classifier needs many citizen–scheme pairs with known labels. Official scheme rules are public. Individual socio-economic records are not. Synthetic profiles let the project label rows from documented rules without collecting Aadhaar, ration-card, income, or other personal data.

These rows are research fixtures. They do **not** represent real Tamil Nadu citizens or real application outcomes.

## Reproducibility

| Item | Value |
| --- | --- |
| Random seed | `20260814` |
| Generator | `numpy.random.default_rng(20260814)` |
| Citizen count | 5,000 |
| Citizen–scheme rows | 5,000 × 6 = 30,000 |
| Command | `python src/generate_synthetic_data.py` (from `ml/`) |

Running the command twice with this seed must write the same CSVs.

## Fields generated

Only the Phase 2.1 CORE feature set, plus `citizen_id`:

`citizen_id`, `age`, `gender`, `is_student`, `first_higher_education_course`, `school_background`, `marital_status`, `is_orphan`, `is_destitute`, `occupation_category`, `wet_land_acres`, `dry_land_acres`

`annual_income` is not generated.

`citizen_id` values are synthetic keys (`C000001` … `C005000`). They are not official IDs.

## Generation strategy

Fields are **not** drawn independently from uniform distributions. Age is drawn from age bands. Student status, first-course flag, marital status, occupation, and land are conditioned on age. A modest number of “eligible-shaped” profiles is reserved so each CORE scheme has examples to label. Labels are still computed afterwards by `ml/src/eligibility_rules.py`; the reserved profiles are not assigned `eligible=1` by hand.

| Profile group | Count | Purpose |
| --- | --- | --- |
| Pudhumai-shaped | 400 | Female students, first course, Government school 6–12 |
| Tamil Pudhalvan-shaped | 400 | Male students, first course, official school path |
| Dharmambal-shaped | 250 | Female, widow remarrying, age 18+ |
| Annai-shaped | 250 | Female orphan, age 18+ |
| UPT-shaped | 600 | Age 18–65, official farm occupation, land within official wording |
| Unmarried-pension-shaped | 300 | Female, never married, age 50+, destitute |
| General | 2,800 | Mixed ages and attributes |
| **Total** | **5,000** | |

### Age

Bands: children 0–17, youth 18–25, adults 26–49, older adults 50–65, elderly 66–90. Range stays inside 0–120.

### Gender

`female` and `male` are the majority. `transgender` is included because it is an allowed CORE value. No transgender-specific official CORE rule was encoded.

### Student status and first higher-education course

- Under 16: often students; first higher-education course is always false.
- 16–17: often students; first higher-education course is false.
- 18–25: mixed students; first course may be true only if `is_student` is true.
- Older adults: rarely students; first course is almost always false.
- If `is_student` is false, `first_higher_education_course` is forced false.

### School background

Allowed values: `government_6_to_12`, `government_or_aided_tamil_medium_6_to_12`, `other`.

Age under 16 is set to `other` because Classes 6–12 cannot have been completed.

### Marital status

Age under 18 is always `never_married`. Older bands receive more `married`, `widow`, and `widow_remarrying` values, still as synthetic research mix rather than a census model.

### Occupation and land

Age under 18 and current students are generally `other` with zero land. Farm occupations receive non-negative acreage. `small_marginal_farmer` usually has land inside or outside the official ceilings. Agricultural labourers, inland fishing, and plantation labourers often have zero land. `other` has zero land.

### Orphan and destitute

These are booleans. Destitute is a copy of the official qualitative phrase, not a rupee or BPL test.

## Impossible combinations avoided

- No married/widowed children under 18.
- No first higher-education course unless the person is a student and old enough.
- No negative land.
- School background `government_*` is not assigned below age 16.
- Boolean fields are only `true` or `false`.

## Confirmation: no real personal data

No survey, beneficiary list, Aadhaar number, name, address, or phone number is used. The generator uses only a seed and the documented feature rules.

## Labeling

`dataset/processed/eligibility_dataset.csv` pairs every citizen with all six CORE schemes. `eligible` is 0 or 1 from `eligibility_rules.py`. `eligibility_reason` is a short deterministic sentence. ADVANCED and HOLD schemes are not labelled.
