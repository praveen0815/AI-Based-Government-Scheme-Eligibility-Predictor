# Notifications and reminders

This phase adds lightweight, owner-only reminders generated from existing research-prototype activity. It does not send email, SMS, WhatsApp, or push messages. It does not invent government deadlines or connect to any department.

> These reminders are generated from your research-prototype activity only. They are not government notices, official deadlines, or application updates.

## Architecture

```text
React /notifications  -->  GET/PATCH/DELETE /api/v1/notifications*
JWT owner only        -->  notification_service
                           |-- sync from wallet / completeness
                           |-- document checklist progress
                           |-- application readiness
                           '-- latest recommendation history
                           '-- notifications (owner rows)
```

The Decision Tree, eligibility rules, hybrid ranking, wallet ownership, history, comparison, PDF, documents, readiness, insights, Google authentication, datasets, and existing API contracts are unchanged.

`GET /api/v1/dashboard` is unchanged. The dashboard page calls `GET /api/v1/notifications` separately and still works if that route is unavailable.

There is no cron job and no external notification service. Reminders are derived when the owner lists them.

## Stored fields

Table: `notifications`

| Column | Notes |
| --- | --- |
| `id` | Server UUID |
| `user_id` | FK to `users.id`, `ON DELETE CASCADE`. Taken from the JWT |
| `type` | `profile_incomplete`, `document_attention`, `readiness_in_progress`, or `recommendation` |
| `title` / `message` | English fallback copy for the API |
| `related_feature` | `wallet`, `documents`, `readiness`, or `history` |
| `related_id` | Optional scheme or history id used only to build an in-app link |
| `source_key` / `source_version` | Deduplicate and refresh when the underlying condition changes |
| `is_read` | Owner-marked read state |
| `dismissed` | Soft-delete so a dismissed reminder is not recreated until the source version changes |
| `created_at` | When the current reminder version was created |

The table never stores passwords, JWTs, Aadhaar or other identity numbers, or uploaded document contents.

Another user receives HTTP 404 for the same notification ID.

## Generation rules

Reminders are created only from data the caller already owns:

| Type | Condition | Link |
| --- | --- | --- |
| `profile_incomplete` | No wallet, or completeness below 100% | `/wallet` |
| `document_attention` | A recommended scheme still needs checklist attention | `/documents` |
| `readiness_in_progress` | A recommended scheme is saved but not Completed Preparation | `/readiness` |
| `recommendation` | Latest eligibility-check history row | `/history/{id}` |

If the condition is gone, the row is removed. If the condition changes, the reminder is refreshed and marked unread.

## APIs

JWT required.

| Method | Path |
| --- | --- |
| GET | `/api/v1/notifications` |
| PATCH | `/api/v1/notifications/{notification_id}/read` |
| DELETE | `/api/v1/notifications/{notification_id}` |

Unauthenticated callers receive HTTP 401.

## Frontend

- Authenticated top bar shows a notification bell and unread count
- Sidebar account section includes **Notifications**
- Protected route `/notifications` lists categories, timestamps, read/unread state, and links to existing pages
- Dashboard shows up to three unread reminders and **View All Notifications**
- English/Tamil copy uses the existing `useI18n()` dictionaries
