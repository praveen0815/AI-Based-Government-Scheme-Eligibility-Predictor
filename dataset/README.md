# Dataset

Holds source and processed data for Tamil Nadu Government welfare scheme eligibility work.

## Folders

| Folder | Purpose |
| --- | --- |
| `raw/` | Unmodified files from an approved official or documented source |
| `processed/` | Cleaned tables produced by a later data-preparation step |

## Phase 2 catalog

`raw/schemes.csv` is the official scheme catalog. How it was collected is documented in `docs/dataset_collection.md`. Phase 2.1 added `ml_scope` and `eligibility_rule_status`; see `docs/scheme_quality_review.md`.

Validate:

```powershell
cd ml
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python src/validate_scheme_dataset.py
```

Phase 3 synthetic files:

- `raw/citizens.csv` — 5,000 fictional CORE-feature profiles
- `processed/eligibility_dataset.csv` — 30,000 citizen–scheme rows with rule-derived labels

These files do not contain real personal data. See `docs/synthetic_data_generation.md`.

```powershell
python src/generate_synthetic_data.py
python src/validate_ml_dataset.py
```

## Rules

- Do not add invented scheme names, eligibility rules, or citizen records.
- Every file placed here must have a documented source in `docs/` or in this README.
- Raw files stay unchanged after collection. Transformations belong in `processed/` and in `ml/` code.
- Do not commit personally identifiable citizen data.
- Empty cells mean a criterion was not stated or does not apply. `NEEDS VERIFICATION` is used only in text fields.
