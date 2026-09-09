# Phase 32 results — Voice assistant enhancement and reliability

Date: **2026-09-08**.

Phase 32 is a reliability, accessibility, UX, and voice-interaction enhancement over Phase 31. It does not replace or modify the existing eligibility engine.

The Decision Tree was not retrained. Datasets and `decision_tree.joblib` were not modified. Eligibility rules, hybrid ranking, authentication, wallet ownership, history, comparison, PDF, documents, readiness, insights, notifications, catalog, system evaluation, and existing API contracts were not changed.

## What changed

- `/voice-assistant` has a clearer civic-tech layout: large microphone control, Listening / Processing / Speaking / Idle labels, listening animation, disabled conflicting actions while busy, and a prominent typed fallback.
- Session-only conversation history now labels **You** / **Assistant**, shows time, processing and error states, an empty state, **Clear conversation**, **Retry**, and **Send again**.
- Intent matching covers more natural phrases (`Am I eligible?`, `Which schemes can I get?`, `Tell me about this scheme`, `Is my profile complete?`, `Open documents`, `Go to insights`) without an LLM.
- Profile updates still require Confirm / Cancel. Confirm is the only path to `PUT /api/v1/wallets/{id}`. Completeness is refreshed after a successful update.
- Eligibility replies reuse `GET /wallets/me`, completeness, and `POST /wallets/{id}/recommend`, and now list eligible scheme names plus missing-field language: eligibility cannot be fully evaluated. They do not say “add this and you will become eligible.”
- Speech recognition handles permission, unavailable microphone, timeout, empty speech, user stop, and unsupported browsers. Listeners are detached on unmount. TTS cancels previous speech, prefers a Tamil voice when the UI language is Tamil, sanitizes spoken text, and never restarts the microphone.

## Voice interaction improvements

Recognition remains one-shot (`continuous = false`). Start is explicit. Stop Listening and Stop Speaking are separate. Raw audio is not stored or uploaded.

## Confirmation flow

Detected wallet fields are shown first. Example: “I understood your age as 22. Would you like me to update your wallet?” Only Confirm writes the merged existing wallet.

## Error handling

Microphone permission, missing microphone, unsupported speech API, timeout, empty transcript, API failure, missing wallet, and expired session use existing i18n messages. Stack traces are not shown. Typed input stays available.

## Accessibility

Controls are keyboard reachable with visible focus. Microphone buttons have ARIA labels. Status uses text plus `aria-live`, not color alone. Conversation roles are announced in text.

## Security

`/voice-assistant` stays behind `ProtectedRoute`. JWT, Google tokens, passwords, and identity numbers are not displayed or spoken. No voice conversation database was added.

## Testing

Frontend `npm test`: **155 passed**. `npx tsc -b` and `npm run build` passed. Backend `python -m unittest discover -s tests -q`: **167 ran, 37 skipped**. New and updated voice tests cover idle/listening/processing/speaking, permission and unavailable microphone, text fallback, eligibility/scheme/navigation/profile intents, confirm/cancel, duplicate-submit lock, TTS stop, conversation clear, retry, English/Tamil UI, and the protected route.

## Known limitations

Browser speech quality still varies. Intent matching remains keyword-based. Income and state are not wallet fields. Conversation history is session-only. This remains an academic research prototype.
