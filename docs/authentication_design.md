# Authentication design

This authentication system is implemented for the academic research prototype. It is not a government identity verification system.

It does not use Aadhaar, OTP, government login, or refresh tokens. Google Sign-In is an optional additional login method. The backend verifies the Google ID token and then issues the same application JWT used by email/password login.

## Architecture

```
Register / Login / Continue with Google
      ↓
(Google path: verify ID token → find or create user)
      ↓
JWT access token
      ↓
Authorization: Bearer <token>
      ↓
get_current_user
      ↓
Owned socio-economic wallet
      ↓
Recommendation service
      ↓
Decision Tree
```

Public prediction and recommendation endpoints remain unauthenticated:

- `POST /api/v1/predict`
- `POST /api/v1/recommend`
- `GET /api/v1/schemes`
- `GET /health`
- `GET /api/v1/model-info`

## Password hashing

Passwords are hashed with **pwdlib** using **Argon2**. Plain-text passwords are never stored, logged, or returned. API responses never include `password` or `password_hash`.

Minimum password length is 8 characters.

## JWT

Configuration (placeholders only in git):

```
JWT_SECRET_KEY=change-me-academic-prototype-only-not-for-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
```

Payload:

```json
{ "sub": "<user_id>", "exp": "<expiration>" }
```

Invalid or expired tokens return HTTP 401. There is no refresh-token flow in this phase.

## User–wallet relationship

Table `users` stores `id` (UUID), unique lowercased `email`, optional `password_hash`, optional unique `google_sub`, `full_name`, and timestamps. Google-only users have no password hash. Existing password users keep their hash. Google access tokens and ID tokens are never stored.

Table `citizen_profiles` keeps `citizen_id` as the internal wallet identifier and adds `user_id` → `users.id`. Each authenticated user may own at most one wallet.

The frontend never sends `user_id`. Ownership comes from the JWT.

## Authorization rule

If a wallet does not exist **or** is not owned by the authenticated user, the API returns **HTTP 404**. This avoids revealing whether another user's wallet exists.

Phase 9 wallets that have no `user_id` remain in the table but are treated as not found.

## Token storage

The React portal keeps the application access token and public user profile in **sessionStorage**. Google credentials are sent once to `POST /api/v1/auth/google` and are not stored.

Trade-off: the session survives a refresh in the same tab, and is cleared when the tab closes. It is more isolated than `localStorage`, but it is still not a secure vault. The JWT is never placed in the URL.

## Security limitations

- Email/password accounts are local prototype accounts only
- Google Sign-In trusts only verified Google token claims (`aud`, expiry, signature, `email_verified`, `sub`)
- Backend `GOOGLE_CLIENT_ID` must match the frontend OAuth client ID
- JWT secret must be set in `.env`; do not commit a real secret
- No email verification, password reset, lockout, or refresh tokens
- sessionStorage can be read by JavaScript on the same origin
- This is not production security and not a government citizen account
