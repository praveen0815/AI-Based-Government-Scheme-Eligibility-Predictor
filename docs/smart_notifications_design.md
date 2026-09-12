# Smart notifications

Additive reminders on the existing owner-only notification service.

## New types

- `eligibility_incomplete` — saved profile completeness is below 100%. Copy says missing fields are required to fully evaluate schemes.
- `application_status` — the owner has application-tracking rows and should review `/applications`.

Existing profile, document, readiness, and recommendation reminders stay in place.

## Deadlines

The catalog does not provide verified government deadlines. The service does not invent them.

## APIs reused

`GET /api/v1/notifications` and the existing mark-read / dismiss endpoints. No new notification routes.

## Security

Reminders remain owner-scoped. Application tracking rows are not exposed to other users.

## Limitations

Reminders are derived from prototype activity, not government application status.
