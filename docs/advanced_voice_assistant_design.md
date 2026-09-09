# Advanced voice assistant

Enhances the Phase 31/32 voice layer. Typed input remains a full fallback.

## Architecture

`detectVoiceIntent()` maps speech/text onto existing application capabilities. Eligibility still uses `recommendFromWallet`. Profile writes still require Confirm.

New intents:

- `WHAT_IF` → explanation + `/eligibility-simulator`
- `DOCUMENTS_NEEDED` → catalog `required_documents` on current recommendations
- `HIGHEST_BENEFIT` → catalog `benefit` text
- Navigate: simulator, applications, compare

## User flow

Speak or type. The assistant answers from wallet, recommendation, catalog, or navigation. Wallet changes require explicit confirmation. Income/state mentions stay unsupported.

## APIs reused

Wallet, completeness, wallet recommend, CORE schemes catalog. No new voice API. Raw microphone audio is not stored.

## Security

Protected route. Passwords, JWTs, and identity numbers are not spoken. Simulation and profile edits do not happen silently.

## Limitations

Intent matching is keyword-based, not an LLM. Income is not a wallet field, so what-if income questions open the simulator and explain that limit.
