# Research dashboard

Protected route: `/research-dashboard`.

## Architecture

The page is a research-prototype summary of existing Phase 11 evaluation and Phase 29 system-evaluation payloads. It does not retrain models or create a second monitoring stack.

There is no admin role system. Any authenticated user can open the page. Copy labels it as a research prototype dashboard, not an administrative control panel.

## Shown metrics

- Synthetic citizen count, official scheme count, eligibility records
- Eligible / not-eligible percentages
- Selected model F1 / accuracy
- Rule-vs-ML agreement percentage
- In-process API timings
- Health status / database / environment / model loaded

Cannot-fully-evaluate is not a stored dataset column, so that card stays “—” with the existing evaluation disclaimer.

## APIs reused

- `GET /api/v1/system-evaluation`
- Optional evaluation bundle (`/api/v1/evaluation/*`)

## Security

Protected route. No other users’ wallets or application rows are listed. Secrets are not rendered.

## Limitations

Not a production admin console. Metrics come from synthetic evaluation artifacts and the current API process.
