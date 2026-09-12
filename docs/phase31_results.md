# Phase 31 results — Voice-based eligibility assistant

Date: **2026-09-08**.

Phase 31 introduces a voice interaction layer and does not replace or modify the existing eligibility engine.

The Decision Tree was not retrained. Datasets and `decision_tree.joblib` were not modified. Eligibility rules, hybrid ranking, authentication, wallet ownership, history, comparison, PDF, documents, readiness, insights, notifications, catalog, system evaluation, and existing API contracts were not changed.

## What changed

- Protected page `/voice-assistant` with Idle / Listening / Processing / Speaking / Error feedback, explicit Start / Stop, live transcript, text input, suggested prompts, and session-only history.
- Browser speech recognition (`useVoiceRecognition`) and speech synthesis (`useTextToSpeech`). Raw audio is not sent to the backend.
- Frontend intent detection for eligibility, explanation, completeness, scheme questions, navigation, and confirmed profile updates.
- Eligibility speech uses `GET /api/v1/wallets/me` and `POST /api/v1/wallets/{id}/recommend`. Explanations reuse Phase 26 hybrid fields.
- Profile fields extracted from speech are shown for Confirm / Cancel. `PUT /api/v1/wallets/{id}` runs only after Confirm, merging into the current wallet.
- English and Tamil copy uses the existing `useI18n()` dictionaries.
- Sidebar adds **Voice Assistant**. No new backend endpoint was required.

## Security review

- Unauthenticated `/voice-assistant` redirects to `/login`.
- Wallet and recommend calls keep the existing JWT owner scope.
- Tokens, passwords, Google credentials, and identity numbers are not spoken or displayed.
- No raw microphone recordings are stored.

## Testing

Frontend `npm test`: **148 passed** (17 new in `frontend/src/test/voice-assistant.test.tsx`). Coverage includes render, start/stop, transcript, empty input, permission, unsupported browser, eligibility intent, navigation, confirm/cancel profile update, processing, API error, TTS, Tamil/English UI, and the protected route.

Frontend `npx tsc -b` and `npm run build` passed.

Backend `python -m unittest discover -s tests -q`: **167 ran, 37 skipped** (database cases still require `TEST_DATABASE_URL`). No backend files were changed; existing API contracts still pass.

## Limitations

Browser speech quality varies. Intent matching is keyword-based. Income and state are not stored because they are not wallet fields. Conversation history is session-only. This remains an academic research prototype, not a government service.
