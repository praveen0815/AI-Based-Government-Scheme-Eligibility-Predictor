# Safe supporting document upload

This phase lets authenticated users optionally store **non-sensitive** supporting files for their own preparation process. It is not government document verification, identity proof, or application submission.

> Do not upload Aadhaar, PAN, passport, or other sensitive identity documents. This is an academic research prototype.

Uploaded does **not** mean verified or officially accepted.

## Architecture

```text
React /uploads  -->  GET/POST/PATCH/DELETE /api/v1/uploads*
JWT owner only  -->  upload_service
                    |-- supporting_uploads (metadata)
                    '-- var/supporting_uploads/{user_id}/{uuid}.ext
```

The Decision Tree, eligibility rules, hybrid ranking, wallet, history, comparison, PDF, readiness, insights, Google authentication, datasets, and existing API contracts are unchanged.

Frontend route: `/uploads` (protected). Authenticated navigation shows **My Documents**. Dashboard `/dashboard` shows a Supporting Documents summary. `/documents` shows optional upload counts as supporting evidence only.

## Categories

| Stored value | UI label |
| --- | --- |
| `identity_proof_demo` | Identity Proof (Demo / Non-sensitive) |
| `address_proof` | Address Proof |
| `education_certificate` | Education Certificate |
| `income_certificate` | Income Certificate |
| `community_certificate` | Community Certificate |
| `other_supporting` | Other Supporting Document |

## Upload restrictions

- Allowed types: PDF, JPG, JPEG, PNG
- Server checks file magic bytes. Client MIME type and original filename are not trusted
- Maximum size: 5 MB
- Maximum files per account: 20
- Stored filename is a server UUID plus a validated extension
- Original names that look like Aadhaar, PAN, passport, or biometric files are rejected

The API never runs OCR, Aadhaar extraction, face matching, government verification, or ML document analysis.

## Database ownership

Table: `supporting_uploads`

| Column | Notes |
| --- | --- |
| `id` | Server UUID |
| `user_id` | FK to `users.id`, `ON DELETE CASCADE`. Taken from the JWT |
| `category` | One of the six stored values |
| `display_name` | Sanitized original basename for display only |
| `stored_filename` | Server-generated name, never a client path |
| `content_type` | Detected `application/pdf`, `image/jpeg`, or `image/png` |
| `size_bytes` | Payload length |
| `scheme_id` | Optional recommended CORE scheme |
| `created_at` | Upload timestamp |

Another user receives HTTP 404 for the same upload ID. Files are stored under `var/supporting_uploads/{user_id}/`. Account deletion removes metadata and files.

A scheme link is allowed only when that CORE ID appears in the caller's recommendation history.

## APIs

JWT required.

| Method | Path |
| --- | --- |
| GET | `/api/v1/uploads` |
| POST | `/api/v1/uploads` (multipart `category`, optional `scheme_id`, `file`) |
| GET | `/api/v1/uploads/{upload_id}` |
| GET | `/api/v1/uploads/{upload_id}/file` |
| PATCH | `/api/v1/uploads/{upload_id}` (`{ "scheme_id": "TN-SW-001" }` or `null`) |
| DELETE | `/api/v1/uploads/{upload_id}` |

## Document preparation integration

The Phase 19 checklist is unchanged. `/documents` reads the uploads list and shows an optional supporting-evidence count. That count is not checklist progress and is not official acceptance.

## Data safety limitations

This phase does **not** implement:

- Aadhaar, PAN, passport, or biometric storage as a supported category
- OCR or identity-number extraction
- Government APIs, OTP, or payments
- Official verification
- New ML models or LLMs
