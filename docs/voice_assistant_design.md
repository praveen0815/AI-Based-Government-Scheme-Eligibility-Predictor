# Voice eligibility assistant

Phase 31 introduces a voice interaction layer and does not replace or modify the existing eligibility engine. Phase 32 hardens that layer: clearer conversation UX, broader keyword intents, safer confirmation copy, speech/TTS cleanup, and accessibility. The Hybrid Rule + Decision Tree result remains the single source of truth.

Authenticated users can speak or type requests on `/voice-assistant`. Speech is converted to text in the browser. Intent handling calls existing wallet, completeness, catalog, and recommendation APIs. Spoken replies use the browser’s speech synthesis. The Hybrid Rule + Decision Tree result remains the single source of truth.

## Objective

Add an accessible civic-tech voice layer so a signed-in citizen can:

- Check eligibility from the saved wallet
- Ask why a hybrid result was produced
- Review missing wallet fields
- Ask which CORE schemes are listed
- Confirm extracted profile fields before any wallet update
- Open Wallet, recommendations, History, Documents, Insights, Schemes, or Dashboard

The assistant must not invent eligibility, retrain models, or write the wallet without an explicit Confirm.

## Architecture

```text
/voice-assistant  (JWT protected)
        ↓
Browser SpeechRecognition  →  transcript
        ↓
Frontend intent detection   (no eligibility rules)
        ↓
Existing APIs (JWT)
  GET  /api/v1/wallets/me
  PUT  /api/v1/wallets/{id}          (only after Confirm)
  POST /api/v1/wallets/{id}/recommend
  GET  /api/v1/wallets/me/completeness
  GET  /api/v1/schemes
        ↓
Existing Hybrid Rule + ML + ranking
        ↓
Phase 26 explanation fields reused
        ↓
Browser speechSynthesis
```

No backend voice endpoint was added. Intent parsing stays on the frontend. Raw microphone audio is not uploaded or stored.

## Voice flow

1. User opens Voice Assistant from the authenticated sidebar.
2. User clicks **Start Speaking** or types a question and clicks **Send**.
3. Recognition is one-shot (`continuous = false`). **Stop** ends listening.
4. The transcript is shown before the request is processed.
5. Intent is classified. Eligibility uses the existing wallet recommend API.
6. Profile fields are displayed and require Confirm before `PUT` wallet.
7. The text reply is shown and, when supported, read aloud.
8. Recording does not restart automatically after speech.

## Speech-to-text

`useVoiceRecognition()` uses `window.SpeechRecognition` or `webkitSpeechRecognition`.

- Language follows the existing i18n selection (`en-IN` / `ta-IN`)
- Handles permission denial, unsupported browsers, empty speech, and recognition errors
- Does not send audio to the backend

Users can complete the same flow with the text field when speech is unavailable.

## Intent detection

`detectVoiceIntent()` maps the transcript to:

| Intent | Example |
| --- | --- |
| `CHECK_ELIGIBILITY` | “Check my eligibility.” / “Am I eligible?” / “Which schemes can I get?” |
| `EXPLAIN_RESULT` | “Why am I eligible?” |
| `PROFILE_COMPLETENESS` | “What information is missing?” / “Is my profile complete?” |
| `SCHEME_QUESTION` | “What schemes are available?” / “Tell me about this scheme.” |
| `NAVIGATE` | “Open my wallet.” / “Open documents.” / “Go to insights.” |
| `UPDATE_PROFILE` | “My age is 21.” |
| `UNSUPPORTED` | Anything else, including income/state mentions that are not wallet fields |

Unsupported replies stay within the documented help text. The parser does not invent wallet fields that are not in `CitizenProfile`.

## Existing eligibility API integration

“Check my eligibility” loads `GET /api/v1/wallets/me` and calls `POST /api/v1/wallets/{id}/recommend`. That is the same owner-scoped recommendation path used by My Wallet. The public `POST /api/v1/recommend` body path is not used for this voice check.

Spoken eligibility copy only restates `eligible_scheme_count`, the top ranked scheme name, and the existing research disclaimer. It does not claim government approval.

## Text-to-speech

`useTextToSpeech()` uses `window.speechSynthesis`.

- Cancels any current utterance before starting a new one
- Exposes **Stop**
- Does not reopen the microphone after speech ends

If synthesis is missing, the text reply remains visible.

## Profile confirmation

Extracted fields are limited to the existing wallet schema (age, student flag, gender, occupation category, marital status, orphan/destitute). Mentions of income or state are shown as unsupported and are not saved.

Confirm calls `updateWallet` with a merge of the current wallet and the confirmed fields. Cancel leaves the wallet unchanged. The assistant never silently overwrites saved values.

## Explanation and completeness

“Why am I eligible?” / “Why am I not eligible?” reuse Phase 26 fields already present on the stored recommendation: `rule_reasons`, rule result, `ml_prediction`, `agreement`, model probability, and incomplete profile fields.

Missing-field language matches Phase 26: details may help a more complete assessment. The assistant does not say “add income to become eligible.”

When Rule and ML disagree, the documented rule remains the reference.

## Security

- `/voice-assistant` uses `ProtectedRoute` and redirects to `/login`
- API calls reuse the existing JWT `Authorization` header
- Passwords, JWT tokens, Google tokens, and identity numbers are never spoken or rendered
- No raw audio storage and no new authentication mechanism

## Error handling

Visible, non-technical messages cover microphone permission, unsupported browsers, empty transcripts, recognition failure, missing wallet, eligibility API failure, expired session, network failure, and unavailable TTS. Stack traces are not shown.

## Accessibility

Voice is optional. The page includes a text field, Send button, keyboard-submittable form, visible status, ARIA labels, and session-only conversation history. Suggested prompts can be activated without a microphone.

## Testing

Frontend tests cover page render, protected routing, start/stop, transcript, empty input, permission and unsupported-browser errors, eligibility intent (existing recommend API), navigation, confirm/cancel profile update, processing, API error, TTS, and English/Tamil copy.

## Limitations

- Browser speech APIs vary by engine and require a user gesture plus microphone permission
- Tamil recognition quality depends on the browser
- Intent coverage is keyword-based, not an LLM
- Income and state are not wallet fields and cannot be stored
- Session conversation history is not persisted
- This is a research-prototype interaction layer, not a government helpline
