# Phase 23 results — Safe supporting document upload

Date: **2026-08-27**.

This phase adds optional non-sensitive supporting-document upload on top of Phases 1–22. The Decision Tree was not retrained. Datasets and `decision_tree.joblib` were not modified. Eligibility rules, hybrid ranking, JWT/Google authentication, wallet, history, comparison, PDF, readiness, insights, and existing API contracts were not changed.

## What changed

- Owner-only table `supporting_uploads` plus files under `var/supporting_uploads/{user_id}/`.
- JWT APIs for list, upload, metadata, download, scheme link, and delete.
- Backend rejects Aadhaar/PAN/passport-like filenames and non-PDF/JPG/PNG magic bytes. Size limit 5 MB.
- Frontend route `/uploads` with sidebar/header **My Documents**.
- `/documents` shows optional supporting-upload counts. Uploaded does not mean verified.
- Dashboard **Supporting Documents** card with count and **Manage Uploads**.
- English/Tamil copy uses the existing `useI18n()` dictionaries.

## Safety wording

The UI and API state:

> Do not upload Aadhaar, PAN, passport, or other sensitive identity documents. This is an academic research prototype.

## Testing

- Backend `python -m unittest tests.test_uploads_api -v`: **8 passed**. Unauthenticated HTTP 401; OpenAPI lists upload routes; sensitive names and invalid bytes are rejected. Database tests: owner-only upload/download/link/delete; another user receives 404; account delete removes rows and files.
- Frontend `npm test`: **109 passed**, including `/uploads` redirect, warning, empty state, upload/delete, dashboard Supporting Documents card, and **My Documents** navigation.

## Limitations

This is a research-prototype file locker only. Users must not upload government identity documents. SchemeWise does not verify, accept, or submit files to any department.
