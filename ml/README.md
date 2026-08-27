# Machine learning

Training, evaluation, and inference code for scheme eligibility prediction.

## Folders

| Folder | Purpose |
| --- | --- |
| `notebooks/` | Exploratory analysis (empty until a dataset exists) |
| `src/` | Reusable Python modules for later training and inference |
| `models/` | Saved model artifacts from a later training phase |

Phase 4/5 trained the baselines. The selected prototype artifact is `models/baseline/decision_tree.joblib`. The FastAPI app in `backend/` loads that file; do not retrain it for the prediction API.

## Dependencies

See `requirements.txt`: Pandas, NumPy, Scikit-learn, Matplotlib, and joblib.

Jupyter is not installed yet. Add it when notebook work starts.

## Setup

Requires **Python 3.12**. Create the environment with `py -3.12 -m venv .venv`.

Recorded versions in this environment: Python 3.12.10, scikit-learn 1.9.0, pandas 3.0.5, numpy 2.5.2.

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
