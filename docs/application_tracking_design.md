# Application guidance and tracking

Protected route: `/applications`.

## Architecture

Owner-scoped table `application_tracking` stores personal tracking rows. It does not submit applications to government portals.

Statuses: `not_applied`, `planning`, `documents_ready`, `applied`, `under_review`, `approved`, `rejected`.

Catalog metadata (documents, official source) is joined from the existing scheme catalog.

## User flow

1. Save a catalog scheme for application.
2. View required documents and official source.
3. Update personal status and optional application date.
4. Remove the tracking row.

Eligibility result and application status remain separate badges.

## New APIs

- `GET /api/v1/applications`
- `POST /api/v1/applications`
- `PATCH /api/v1/applications/{application_id}`
- `DELETE /api/v1/applications/{application_id}`

All require the existing JWT. Another user’s ID returns 404.

## Security

`user_id` is taken from the authenticated user. Unique `(user_id, scheme_id)`. Account deletion removes tracking rows.

## Limitations

This is user-side tracking only. There is no government submission, status webhook, or invented deadline.
