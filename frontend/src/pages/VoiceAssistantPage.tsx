import { useNavigate } from "react-router-dom";
import { AssistantActions } from "../components/assistant/AssistantActions";
import { ResearchNotice } from "../components/ResearchNotice";
import { MicIcon } from "../components/icons";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { useI18n } from "../context/LanguageContext";
import { formatTurnTime, useVoiceAssistant } from "../hooks/useVoiceAssistant";
import { isSecureSpeechContext } from "../utils/niraSpeech";

export function VoiceAssistantPage() {
  const { language, t } = useI18n();
  const navigate = useNavigate();
  const assistant = useVoiceAssistant();
  const {
    busy,
    handleClearConversation,
    handleRequest,
    handleStart,
    handleTextSubmit,
    history,
    lastRequest,
    lastResponse,
    lastTranscript,
    recognition,
    recognitionError,
    setTyped,
    signedInLine,
    speech,
    statusLabel,
    statusText,
    suggestedPrompts,
    typed,
    uiState,
    voiceStatus,
  } = assistant;

  return (
    <div className="page-stack">
      <PageHeader title={t.voiceTitle} description={t.voiceBanner}>
        <p className="text-[15px] text-ink-500">{signedInLine}</p>
        <p className="text-[14px] text-ink-500">{speech.voiceLabel}</p>
        <p className="text-[14px] text-ink-500">
          {!isSecureSpeechContext()
            ? t.voiceSpeechInsecure
            : voiceStatus?.cloud_stt_available
              ? t.voiceSpeechCloudReady
              : t.voiceSpeechBrowserOnly}
        </p>
      </PageHeader>
      <ResearchNotice compact />

      <section className="card-surface px-5 py-8 text-center sm:px-10 sm:py-10" aria-labelledby="voice-mic-heading">
        <h2 id="voice-mic-heading" className="sr-only">
          {t.voiceMicLabel}
        </h2>
        <p className="text-[20px] font-semibold text-ink-900 sm:text-[22px]">{t.voiceBanner}</p>
        <div
          className={`voice-mic mx-auto mt-8 flex h-28 w-28 items-center justify-center rounded-full bg-sage text-action shadow-card sm:h-32 sm:w-32 ${
            uiState === "listening" ? "voice-mic-listening" : ""
          }`}
          aria-hidden="true"
        >
          <MicIcon width={40} height={40} />
        </div>
        <p
          className="mt-6 text-[16px] font-semibold uppercase tracking-[0.12em] text-ink-500"
          aria-live="polite"
          aria-atomic="true"
        >
          {statusText}
        </p>
        <p className="mx-auto mt-3 max-w-xl text-[17px] leading-relaxed text-ink-500" role="status" aria-live="polite">
          {recognitionError ?? statusLabel}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {recognition.listening ? (
            <Button type="button" variant="secondary" onClick={recognition.stop} aria-label={t.voiceStopListening}>
              {t.voiceStopListening}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleStart}
              disabled={uiState === "processing"}
              aria-label={t.voiceStartSpeaking}
            >
              {t.voiceStartSpeaking}
            </Button>
          )}
          {speech.speaking ? (
            <Button type="button" variant="secondary" onClick={speech.stop} aria-label={t.voiceStopSpeaking}>
              {t.voiceStopSpeaking}
            </Button>
          ) : null}
        </div>
      </section>

      <section className="card-surface space-y-4 p-5 md:p-8" aria-labelledby="voice-transcript">
        <h2 id="voice-transcript" className="section-title">
          {t.voiceYouSaid}
        </h2>
        <p className="text-[18px] leading-relaxed text-ink-900">
          {lastTranscript || recognition.transcript || recognition.interimTranscript || "—"}
        </p>
      </section>

      <section className="card-surface space-y-4 p-5 md:p-8" aria-labelledby="voice-response">
        <h2 id="voice-response" className="section-title">
          {t.voiceAssistantResponse}
        </h2>
        <p className="text-[18px] leading-relaxed text-ink-700">{lastResponse || "—"}</p>
        <AssistantActions assistant={assistant} />
      </section>

      <section className="card-surface space-y-5 p-5 md:p-8" aria-labelledby="voice-text">
        <h2 id="voice-text" className="section-title">
          {t.voiceTextInputLabel}
        </h2>
        <p className="text-[16px] text-ink-500">{t.voiceTextFallbackHint}</p>
        <form onSubmit={handleTextSubmit} className="flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="voice-text-input">
            {t.voiceTextInputLabel}
          </label>
          <input
            id="voice-text-input"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={t.voiceTextPlaceholder}
            aria-label={t.voiceTextInputLabel}
            className="field-input"
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy}>
              {t.voiceSend}
            </Button>
            {lastRequest ? (
              <Button type="button" variant="secondary" disabled={busy} onClick={() => void handleRequest(lastRequest)}>
                {t.voiceResend}
              </Button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="space-y-4" aria-labelledby="voice-suggested">
        <h2 id="voice-suggested" className="section-title">
          {t.voiceSuggested}
        </h2>
        <div className="flex flex-wrap gap-3">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={busy}
              className="rounded-full border border-line bg-surface px-4 py-2.5 text-[16px] font-semibold text-ink-900 hover:bg-sage focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void handleRequest(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      </section>

      <section className="card-surface space-y-4 p-5 md:p-8" aria-labelledby="voice-history">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="voice-history" className="section-title">
            {t.voiceHistory}
          </h2>
          {history.length > 0 ? (
            <Button type="button" variant="ghost" onClick={handleClearConversation}>
              {t.voiceClearConversation}
            </Button>
          ) : null}
        </div>
        {history.length === 0 ? (
          <p className="text-[17px] text-ink-500">{t.voiceHistoryEmpty}</p>
        ) : (
          <ol className="space-y-4">
            {history.map((turn) => (
              <li key={turn.id} className="rounded-[14px] bg-sage px-4 py-3">
                <p className="text-[15px] font-semibold uppercase tracking-wide text-ink-500">
                  {turn.role === "user" ? t.voiceRoleUser : t.voiceRoleAssistant}
                  {turn.status === "processing" ? ` · ${t.voiceStatusProcessing}` : ""}
                  {turn.status === "error" ? ` · ${t.voiceStatusError}` : ""}
                  <span className="ml-2 font-normal normal-case tracking-normal">{formatTurnTime(turn.at, language)}</span>
                </p>
                <p className="mt-1 text-[17px] leading-relaxed text-ink-900">{turn.text}</p>
                {turn.action === "open_simulator" ? (
                  <div className="mt-3">
                    <Button
                      type="button"
                      onClick={() => navigate("/eligibility-simulator")}
                      disabled={speech.speaking || uiState === "speaking" || uiState === "processing"}
                    >
                      {t.voiceOpenSimulator}
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
