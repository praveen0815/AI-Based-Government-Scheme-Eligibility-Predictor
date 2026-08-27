# Scheme comparison design

This is an academic research prototype. Comparison results are not government approval and do not reject a citizen from a scheme.

## Purpose

An authenticated user can compare **2 or 3 recommended CORE schemes** using official catalog fields from `dataset/raw/schemes.csv` plus a fresh hybrid Rule + ML evaluation of their **saved wallet**.

The Decision Tree, documented rule engine, hybrid comparison logic, and recommendation ranking are reused. They are not rewritten.

## Flow

```
JWT
 → authenticated user
 → owned socio-economic wallet
 → selected CORE scheme IDs (2–3)
 → catalog metadata
 → existing hybrid prediction service
 → comparison payload
```

The client may only send scheme IDs. It must not send eligibility labels, probabilities, or JWT contents. The backend recomputes every compared scheme.

## Endpoint

`POST /api/v1/compare`

Request:

```json
{
  "scheme_ids": ["TN-SW-001", "TN-SW-006"]
}
```

Rules:

- JWT required. Unauthenticated requests follow the existing 401 behavior.
- The wallet is loaded from the JWT user. `user_id` and `citizen_id` are not accepted from the client.
- No wallet → existing wallet 404.
- 2 or 3 unique IDs required.
- IDs must be CORE. ADVANCED and HOLD schemes are rejected.
- Eligibility status supplied by the frontend is ignored.
- Results are not stored.

Each compared scheme includes catalog fields (name, department, category, benefit, documents, application method, official source, eligibility notes) and research prediction fields (`Predicted eligible` or `Not recommended by this prototype`, model probability, rule reasons, ML prediction, agreement).

A scheme that is not recommended is **not** described as officially rejected.

## Frontend

The results page shows checkboxes on recommended schemes when the user is signed in and at least two schemes were recommended. Comparison stays disabled until two schemes are selected. A fourth checkbox is disabled after three selections.

`/compare` calls `POST /api/v1/compare` and renders a desktop table plus stacked mobile cards. Public `/check` users are asked to sign in; comparison always uses the saved wallet, not an unsaved public form.
