# Phase 24 results — Notifications and reminders

Date: **2026-09-04**.

This phase adds lightweight owner-only reminders on top of Phases 1–23. The Decision Tree was not retrained. Datasets and `decision_tree.joblib` were not modified. Eligibility rules, hybrid ranking, JWT/Google authentication, wallet ownership, history, comparison, PDF, documents, readiness, insights, and existing API contracts were not changed.

## What changed

- Owner-only table `notifications` with user, type, title/message, related feature/id, read status, and created time.
- JWT APIs: `GET /api/v1/notifications`, `PATCH /api/v1/notifications/{id}/read`, and `DELETE /api/v1/notifications/{id}`.
- Reminders are derived from the caller's existing wallet completeness, document checklist, readiness, and latest recommendation history. No cron, email, SMS, WhatsApp, push, or government integration.
- Frontend bell with unread count, protected `/notifications` page, sidebar link, and a small dashboard card with **View All Notifications**.
- English/Tamil copy uses the existing `useI18n()` dictionaries.

## Safety wording

The UI and API state:

> These reminders are generated from your research-prototype activity only. They are not government notices, official deadlines, or application updates.

## Testing

- Backend `python -m unittest tests.test_notifications_api -v`: **6 passed**. Unauthenticated HTTP 401; OpenAPI lists notification routes; database tests: owner list/read/dismiss; another user receives 404; account delete removes rows.
- Frontend `npm test`: **117 passed**, including `/notifications` redirect, empty/list/read/dismiss/error/Tamil states, dashboard Notifications & Reminders card, and authenticated bell unread count.

## Limitations

This is an in-app reminder list only. SchemeWise does not send official notices, track government deadlines, or contact users outside the portal.
