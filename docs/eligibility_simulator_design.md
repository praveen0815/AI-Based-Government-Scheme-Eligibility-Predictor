# Eligibility what-if simulator

Protected route: `/eligibility-simulator`.

## Architecture

```text
GET /api/v1/wallets/me          → saved wallet (read only)
        ↓
Temporary CitizenForm copy
        ↓
POST /api/v1/recommend          → existing hybrid engine
        ↓
Simulation results (session only)
```

The real wallet is never PUT. Simulation results are not written to history. If a session recommendation already exists, it is used as the Current baseline so the page does not call `POST /wallets/{id}/recommend` (that endpoint persists history).

## User flow

1. Load the saved wallet into a form copy.
2. Change selected fields.
3. Run Simulation.
4. Compare Current vs Simulation per evaluated scheme.
5. Discard simulation (clears simulated results only).

## APIs reused

- `GET /api/v1/wallets/me`
- `POST /api/v1/recommend`

No new APIs.

## Security

Protected route. JWT owner wallet is read, never overwritten. Simulation state lives in React state only.

## Limitations

Income is not a wallet field. Changing income is not possible; the page only edits existing CitizenProfile fields. Results are labeled Simulation and are not official eligibility decisions.
