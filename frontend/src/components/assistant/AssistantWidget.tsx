import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useI18n } from "../../context/LanguageContext";
import { formatTurnTime, useVoiceAssistant } from "../../hooks/useVoiceAssistant";
import { ChatIcon, CloseIcon, MicIcon } from "../icons";
import { AssistantActions } from "./AssistantActions";
import { AssistantWidgetContext } from "./assistantWidgetContext";

const FULL_PAGE_ROUTES = ["/voice-assistant", "/admin/voice-assistant"];
const WIDGET_PROMPT_COUNT = 4;

function AssistantPanel({
  open,
  panelId,
  titleId,
  fullPageHref,
  onClose,
}: {
  open: boolean;
  panelId: string;
  titleId: string;
  fullPageHref: string;
  onClose: () => void;
}) {
  const { language, t } = useI18n();
  const assistant = useVoiceAssistant({ active: open });
  const {
    busy,
    handleRequest,
    handleStart,
    handleTextSubmit,
    history,
    isAdminSession,
    recognition,
    recognitionError,
    setTyped,
    speech,
    statusLabel,
    statusText,
    stopAudio,
    suggestedPrompts,
    typed,
    uiState,
  } = assistant;
  const logRef = useRef<HTMLOListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  useEffect(() => {
    if (!open) stopAudio();
  }, [open, stopAudio]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [history]);

  const interim = recognition.listening ? recognition.interimTranscript || recognition.transcript : "";

  return (
    <section
      id={panelId}
      className="assistant-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      hidden={!open}
      data-state={uiState}
    >
      <header className="assistant-panel-head">
        <span className={`assistant-orb assistant-orb-${uiState}`} aria-hidden="true">
          <MicIcon width={18} height={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="assistant-panel-title">
            {t.assistantWidgetTitle}
          </h2>
          <p className="assistant-panel-status" aria-live="polite" aria-atomic="true">
            <span className={`assistant-status-dot assistant-status-${uiState}`} aria-hidden="true" />
            {statusText}
          </p>
        </div>
        <button type="button" className="assistant-icon-btn" onClick={onClose} aria-label={t.assistantWidgetClose}>
          <CloseIcon width={18} height={18} />
        </button>
      </header>

      <div className="assistant-panel-body">
        <p className="assistant-panel-note">{isAdminSession ? t.assistantWidgetNoteAdmin : t.assistantWidgetNoteCitizen}</p>
        <ol ref={logRef} className="assistant-log" aria-label={t.assistantWidgetLog}>
          {history.map((turn) => (
            <li
              key={turn.id}
              className={`assistant-turn assistant-turn-${turn.role} ${turn.status === "error" ? "assistant-turn-error" : ""}`}
            >
              <span className="sr-only">{turn.role === "user" ? t.voiceRoleUser : t.voiceRoleAssistant}: </span>
              {turn.status === "processing" ? (
                <span className="assistant-typing" aria-label={t.voiceStatusProcessing}>
                  <span />
                  <span />
                  <span />
                </span>
              ) : (
                turn.text
              )}
              <time className="assistant-turn-time">{formatTurnTime(turn.at, language)}</time>
            </li>
          ))}
          {interim ? <li className="assistant-turn assistant-turn-user assistant-turn-interim">{interim}</li> : null}
        </ol>

        <div className="assistant-actions">
          <AssistantActions assistant={assistant} compact />
        </div>

        {history.length <= 1 ? (
          <div className="assistant-prompts" aria-label={t.voiceSuggested} role="group">
            {suggestedPrompts.slice(0, WIDGET_PROMPT_COUNT).map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="assistant-prompt"
                disabled={busy}
                onClick={() => void handleRequest(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <footer className="assistant-panel-foot">
        <p className="assistant-panel-hint" role="status" aria-live="polite">
          {recognitionError ?? statusLabel}
        </p>
        <form onSubmit={handleTextSubmit} className="assistant-form">
          {recognition.listening ? (
            <button
              type="button"
              className="assistant-mic assistant-mic-live"
              onClick={recognition.stop}
              aria-label={t.voiceStopListening}
            >
              <MicIcon width={20} height={20} />
            </button>
          ) : (
            <button
              type="button"
              className="assistant-mic"
              onClick={handleStart}
              disabled={uiState === "processing"}
              aria-label={t.voiceStartSpeaking}
            >
              <MicIcon width={20} height={20} />
            </button>
          )}
          <label className="sr-only" htmlFor={inputId}>
            {t.voiceTextInputLabel}
          </label>
          <input
            ref={inputRef}
            id={inputId}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={t.voiceTextPlaceholder}
            className="assistant-input"
            autoComplete="off"
          />
          <button type="submit" className="assistant-send" disabled={busy}>
            {t.voiceSend}
          </button>
        </form>
        <div className="assistant-foot-links">
          {speech.speaking ? (
            <button type="button" className="assistant-text-btn" onClick={speech.stop}>
              {t.voiceStopSpeaking}
            </button>
          ) : null}
          <Link to={fullPageHref} className="assistant-text-btn" onClick={onClose}>
            {t.assistantWidgetFullPage}
          </Link>
        </div>
      </footer>
    </section>
  );
}

/**
 * Hosts the single floating assistant for a portal shell. The conversation engine mounts on first open and
 * persists across in-portal navigation; it is unmounted on the full Voice Assistant page so only one assistant runs.
 */
export function AssistantWidgetHost({ variant, children }: { variant: "citizen" | "admin"; children: ReactNode }) {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const titleId = useId();
  const available = !FULL_PAGE_ROUTES.includes(pathname);
  const fullPageHref = variant === "admin" ? "/admin/voice-assistant" : "/voice-assistant";
  const [wasAvailable, setWasAvailable] = useState(available);

  if (wasAvailable !== available) {
    setWasAvailable(available);
    if (!available) {
      setOpen(false);
      setEngaged(false);
    }
  }

  const openPanel = useCallback(() => {
    setEngaged(true);
    setOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && dockRef.current?.contains(event.target as Node)) closePanel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closePanel, open]);

  const controls = useMemo(() => ({ available, open: openPanel }), [available, openPanel]);

  return (
    <AssistantWidgetContext.Provider value={controls}>
      {children}
      {available ? (
        <div ref={dockRef} className={`assistant-dock assistant-dock-${variant}`} data-open={open ? "true" : "false"}>
          {engaged ? (
            <AssistantPanel
              open={open}
              panelId={panelId}
              titleId={titleId}
              fullPageHref={fullPageHref}
              onClose={closePanel}
            />
          ) : null}
          <button
            ref={launcherRef}
            type="button"
            className="assistant-launcher"
            aria-expanded={open}
            aria-controls={engaged ? panelId : undefined}
            aria-label={open ? t.assistantWidgetClose : t.assistantWidgetOpen}
            onClick={open ? closePanel : openPanel}
          >
            <span className="assistant-launcher-icon" aria-hidden="true">
              {open ? <CloseIcon width={20} height={20} /> : <ChatIcon width={20} height={20} />}
            </span>
            <span className="assistant-launcher-label" aria-hidden="true">
              {t.assistantWidgetLauncher}
            </span>
          </button>
        </div>
      ) : null}
    </AssistantWidgetContext.Provider>
  );
}
