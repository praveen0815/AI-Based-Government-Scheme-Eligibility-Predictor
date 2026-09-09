import { useCallback, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ResearchNotice } from "../components/ResearchNotice";
import { MicIcon } from "../components/icons";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { useRecommendation } from "../context/RecommendationContext";
import { useI18n } from "../context/LanguageContext";
import { useTextToSpeech } from "../hooks/useTextToSpeech";
import { useVoiceRecognition } from "../hooks/useVoiceRecognition";
import { fetchProfileCompleteness } from "../services/api";
import {
  buildConfirmationText,
  confirmProfileUpdate,
  documentsNeedSpeech,
  explainRecommendation,
  formatEligibilitySpeech,
  formatExtractedFields,
  formatUnsupportedMentions,
  friendlyVoiceError,
  highestBenefitSpeech,
  loadIncompleteFields,
  navigationPath,
  navigationSpeech,
  runCompletenessSpeech,
  runEligibilityCheck,
  runSchemeQuestion,
  unsupportedSpeech,
  walletToProfile,
  buildIncomeWhatIfMessage,
  type IncomeWhatIfMessage,
} from "../services/voiceAssistantService";
import type { CitizenProfile } from "../types/api";
import { detectVoiceIntent } from "../utils/voiceIntent";

type AssistantState = "idle" | "listening" | "processing" | "speaking" | "error";

interface ConversationTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: number;
  status?: "processing" | "error" | "complete";
  action?: IncomeWhatIfMessage["action"];
  intent?: IncomeWhatIfMessage["intent"];
}

interface PendingUpdate {
  extracted: Partial<CitizenProfile>;
  unsupportedMentions?: string[];
  followUp?: "CHECK_ELIGIBILITY";
}

function nextId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTurnTime(at: number, language: string): string {
  return new Date(at).toLocaleTimeString(language === "ta" ? "ta-IN" : "en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function VoiceAssistantPage() {
  const { language, t } = useI18n();
  const navigate = useNavigate();
  const { result, setSubmission } = useRecommendation();
  const [typed, setTyped] = useState("");
  const [state, setState] = useState<AssistantState>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState("");
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [pendingUpdate, setPendingUpdate] = useState<PendingUpdate | null>(null);
  const [incomeWhatIf, setIncomeWhatIf] = useState<IncomeWhatIfMessage | null>(null);
  const [lastRequest, setLastRequest] = useState("");
  const [failedRequest, setFailedRequest] = useState<string | null>(null);
  const speech = useTextToSpeech();
  const busyRef = useRef(false);

  const speakUtterance = speech.speak;
  const ttsSupported = speech.supported;
  const ttsSpeaking = speech.speaking;

  const replaceProcessingTurn = useCallback(
    (text: string, status: "complete" | "error", extras?: Pick<ConversationTurn, "action" | "intent">) => {
      setHistory((current) => {
        const last = current[current.length - 1];
        if (last?.role === "assistant" && last.status === "processing") {
          return [...current.slice(0, -1), { ...last, text, status, at: Date.now(), ...extras }];
        }
        return [...current, { id: nextId(), role: "assistant", text, status, at: Date.now(), ...extras }];
      });
    },
    [],
  );

  const speakResponse = useCallback(
    (text: string) => {
      setLastResponse(text);
      replaceProcessingTurn(text, "complete");
      setFailedRequest(null);
      const started = speakUtterance(text, language);
      if (started) {
        setState("idle");
        setStatusMessage(t.voiceSpeaking);
        return;
      }
      setState("idle");
      setStatusMessage(ttsSupported ? null : t.voiceTtsUnavailable);
    },
    [language, replaceProcessingTurn, speakUtterance, t, ttsSupported],
  );

  const handleRequest = useCallback(
    async (text: string) => {
      const transcript = text.trim();
      if (!transcript) {
        setState("error");
        setStatusMessage(t.voiceEmptyTranscript);
        return;
      }
      if (busyRef.current) return;
      busyRef.current = true;
      speech.stop();
      setLastTranscript(transcript);
      setLastRequest(transcript);
      setFailedRequest(null);
      setPendingUpdate(null);
      setIncomeWhatIf(null);
      setState("processing");
      setStatusMessage(t.voiceProcessing);
      setHistory((current) => [
        ...current,
        { id: nextId(), role: "user", text: transcript, at: Date.now(), status: "complete" },
        { id: nextId(), role: "assistant", text: t.voiceProcessing, at: Date.now(), status: "processing" },
      ]);

      const intent = detectVoiceIntent(transcript);
      try {
        if (intent.intent === "NAVIGATE" && intent.navigateTo) {
          speakResponse(navigationSpeech(intent.navigateTo, t));
          navigate(navigationPath(intent.navigateTo));
          return;
        }

        if (intent.intent === "UPDATE_PROFILE" && intent.extracted && Object.keys(intent.extracted).length > 0) {
          setPendingUpdate({
            extracted: intent.extracted,
            unsupportedMentions: intent.unsupportedMentions,
            followUp: intent.followUp,
          });
          speakResponse(buildConfirmationText(intent.extracted, intent.unsupportedMentions, t));
          return;
        }

        if (intent.intent === "CHECK_ELIGIBILITY") {
          if (intent.extracted && Object.keys(intent.extracted).length > 0) {
            setPendingUpdate({
              extracted: intent.extracted,
              unsupportedMentions: intent.unsupportedMentions,
              followUp: "CHECK_ELIGIBILITY",
            });
            speakResponse(buildConfirmationText(intent.extracted, intent.unsupportedMentions, t));
            return;
          }
          const checked = await runEligibilityCheck();
          setSubmission(walletToProfile(checked.wallet), checked.result);
          speakResponse(formatEligibilitySpeech(checked.result, t, checked.incompleteFields));
          return;
        }

        if (intent.intent === "EXPLAIN_RESULT") {
          speakResponse(explainRecommendation(result, await loadIncompleteFields(), t));
          return;
        }

        if (intent.intent === "PROFILE_COMPLETENESS") {
          speakResponse(await runCompletenessSpeech(t));
          return;
        }

        if (intent.intent === "SCHEME_QUESTION") {
          speakResponse(await runSchemeQuestion(intent.studentFocus, t));
          return;
        }

        if (intent.intent === "WHAT_IF") {
          const message = buildIncomeWhatIfMessage(t);
          setIncomeWhatIf(message);
          setLastResponse(message.text);
          replaceProcessingTurn(message.text, "complete", { action: message.action, intent: message.intent });
          setFailedRequest(null);
          const started = speakUtterance(message.text, language);
          if (started) {
            setState("idle");
            setStatusMessage(t.voiceSpeaking);
          } else {
            setState("idle");
            setStatusMessage(ttsSupported ? null : t.voiceTtsUnavailable);
          }
          return;
        }

        if (intent.intent === "DOCUMENTS_NEEDED") {
          speakResponse(documentsNeedSpeech(result, t));
          return;
        }

        if (intent.intent === "HIGHEST_BENEFIT") {
          speakResponse(highestBenefitSpeech(result, t));
          return;
        }

        speakResponse(unsupportedSpeech(intent, t));
      } catch (error) {
        setState("error");
        const message = friendlyVoiceError(error, t);
        setStatusMessage(message);
        setLastResponse(message);
        setFailedRequest(transcript);
        replaceProcessingTurn(message, "error");
      } finally {
        busyRef.current = false;
      }
    },
    [language, navigate, replaceProcessingTurn, result, setSubmission, speakResponse, speakUtterance, speech, t, ttsSupported],
  );

  const recognition = useVoiceRecognition({
    language,
    onFinalTranscript: (spoken) => {
      void handleRequest(spoken);
    },
  });

  const uiState: AssistantState = recognition.listening
    ? "listening"
    : ttsSpeaking
      ? "speaking"
      : state;

  const busy = uiState === "processing" || uiState === "listening";

  const statusLabel = useMemo(() => {
    if (recognition.listening) return t.voiceListening;
    if (ttsSpeaking) return `🔊 ${t.voiceStatusSpeaking}...`;
    if (state === "processing") return t.voiceProcessing;
    if (state === "error") return statusMessage ?? t.voiceStatusError;
    return statusMessage ?? t.voiceIdleHint;
  }, [recognition.listening, ttsSpeaking, state, statusMessage, t]);

  async function handleConfirmUpdate() {
    if (!pendingUpdate || busyRef.current) return;
    busyRef.current = true;
    setState("processing");
    setStatusMessage(t.voiceProcessing);
    try {
      await confirmProfileUpdate(pendingUpdate.extracted);
      await fetchProfileCompleteness().catch(() => undefined);
      let reply = t.voiceUpdatedProfile;
      if (pendingUpdate.followUp === "CHECK_ELIGIBILITY") {
        const checked = await runEligibilityCheck();
        setSubmission(walletToProfile(checked.wallet), checked.result);
        reply = `${t.voiceUpdatedProfile} ${formatEligibilitySpeech(checked.result, t, checked.incompleteFields)}`;
      }
      setPendingUpdate(null);
      speakResponse(reply);
    } catch (error) {
      setState("error");
      setStatusMessage(friendlyVoiceError(error, t));
    } finally {
      busyRef.current = false;
    }
  }

  function handleCancelUpdate() {
    if (busyRef.current) return;
    setPendingUpdate(null);
    speakResponse(t.voiceCancelledUpdate);
  }

  function handleTextSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = typed.trim();
    if (!value) {
      setState("error");
      setStatusMessage(t.voiceEmptyTranscript);
      return;
    }
    if (busy) return;
    setTyped("");
    void handleRequest(value);
  }

  function handleStart() {
    if (busy) return;
    speech.stop();
    recognition.clearError();
    setState("idle");
    setStatusMessage(null);
    if (!recognition.supported) {
      setState("error");
      setStatusMessage(t.voiceUnsupportedBrowser);
      return;
    }
    recognition.start();
  }

  function handleClearConversation() {
    speech.stop();
    recognition.stop();
    setHistory([]);
    setLastTranscript("");
    setLastResponse("");
    setPendingUpdate(null);
    setIncomeWhatIf(null);
    setFailedRequest(null);
    setLastRequest("");
    setState("idle");
    setStatusMessage(null);
    recognition.clearError();
  }

  const recognitionError = recognition.error
    ? recognition.error === "permission"
      ? t.voicePermissionDenied
      : recognition.error === "unsupported"
        ? t.voiceUnsupportedBrowser
        : recognition.error === "unavailable"
          ? t.voiceMicUnavailable
          : recognition.error === "timeout"
            ? t.voiceRecognitionTimeout
            : recognition.error === "empty"
              ? t.voiceEmptyTranscript
              : t.voiceRecognitionError
    : null;

  const statusText =
    uiState === "listening"
      ? t.voiceStatusListening
      : uiState === "processing"
        ? t.voiceStatusProcessing
        : uiState === "speaking"
          ? t.voiceStatusSpeaking
          : uiState === "error"
            ? t.voiceStatusError
            : t.voiceStatusIdle;

  return (
    <div className="page-stack">
      <PageHeader title={t.voiceTitle} description={t.voiceLead} />
      <ResearchNotice compact />

      <section className="card-surface px-5 py-8 text-center sm:px-10 sm:py-10" aria-labelledby="voice-mic-heading">
        <h2 id="voice-mic-heading" className="sr-only">
          {t.voiceMicLabel}
        </h2>
        <p className="text-[20px] font-semibold text-ink-900 sm:text-[22px]">{t.voiceLead}</p>
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
        {incomeWhatIf?.action === "open_simulator" ? (
          <Button
            type="button"
            onClick={() => navigate("/eligibility-simulator")}
            disabled={speech.speaking || uiState === "speaking" || uiState === "processing"}
          >
            {t.voiceOpenSimulator}
          </Button>
        ) : null}
        {pendingUpdate ? (
          <div className="rounded-[16px] border border-line bg-sage p-5 text-left">
            <p className="text-[16px] font-semibold text-ink-900">{t.voiceUnderstood}</p>
            <ul className="mt-3 space-y-2 text-[17px] text-ink-700">
              {formatExtractedFields(pendingUpdate.extracted, t).map((row) => (
                <li key={row.label}>
                  {row.label}: {row.value}
                </li>
              ))}
            </ul>
            {pendingUpdate.unsupportedMentions?.length ? (
              <p className="mt-3 text-[16px] text-ink-500">
                {t.voiceUnsupportedFields} ({formatUnsupportedMentions(pendingUpdate.unsupportedMentions, t)})
              </p>
            ) : null}
            <p className="mt-4 text-[17px] text-ink-700">{t.voiceConfirmWallet}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button type="button" onClick={() => void handleConfirmUpdate()} disabled={uiState === "processing"}>
                {t.voiceConfirm}
              </Button>
              <Button type="button" variant="secondary" onClick={handleCancelUpdate} disabled={uiState === "processing"}>
                {t.voiceCancel}
              </Button>
            </div>
          </div>
        ) : null}
        {failedRequest ? (
          <Button type="button" variant="secondary" onClick={() => void handleRequest(failedRequest)}>
            {t.voiceRetry}
          </Button>
        ) : null}
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
          {[
            t.voicePromptCheck,
            t.voicePromptWhyEligible,
            t.voicePromptWhyNot,
            t.voicePromptMissing,
            t.voicePromptRecommended,
            t.voicePromptSchemes,
            t.voicePromptDocuments,
            t.voicePromptWhatIf,
            t.voicePromptCompare,
          ].map((prompt) => (
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
