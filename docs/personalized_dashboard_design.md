# Personalized citizen dashboard

Protected route: `/dashboard` remains the post-login entry point.

## Architecture

The page still loads existing owner APIs and session recommendation data. It does not call a second eligibility engine.

Added snapshot cards reuse:

- Eligible count from session `RecommendResponse` or history
- Incomplete field count from completeness
- Application tracking count from `GET /api/v1/applications`

Recommended for you still renders session recommendation cards or history scheme names.

## User flow

Login → Dashboard → Check Eligibility, Browse Schemes, Compare, Documents, Voice Assistant, Eligibility Simulator, Applications, History, Insights.

## APIs reused

Wallet, completeness, history, documents, insights, readiness, dashboard overview, uploads, notifications, applications.

## Security

Protected route. Failed optional APIs degrade to empty sections. Wallet/history failures still surface the existing error state.

## Limitations

Saved schemes and applications share the application-tracking store. There is no separate favorites table.
