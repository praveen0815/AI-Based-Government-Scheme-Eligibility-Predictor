import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { ResearchNotice } from "../components/ResearchNotice";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { useI18n } from "../context/LanguageContext";
import type { Language } from "../i18n";
import {
  ApiError,
  fetchSchemeAgentStatus,
  fetchSchemeKnowledge,
  runSchemeAgent,
} from "../services/api";
import type {
  AgentRunResponse,
  AgentStatusResponse,
  AgentToolStep,
  AssistantAction,
  AssistantHistoryTurn,
  AssistantSource,
  SchemeKnowledgeRecord,
} from "../types/api";

interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
  status: "ok" | "error" | "pending";
  sources?: AssistantSource[];
  actions?: AssistantAction[];
  notice?: string | null;
  schemeName?: string | null;
  toolsUsed?: string[];
  steps?: AgentToolStep[];
  intent?: string;
}

function nextId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function verificationLabel(
  status: string,
  t: ReturnType<typeof useI18n>["t"],
): string {
  if (status === "verified") return t.assistantVerified;
  if (status === "missing") return t.assistantMissing;
  return t.assistantUnverified;
}

function uniqueSources(sources: AssistantSource[]): AssistantSource[] {
  const seen = new Set<string>();
  const unique: AssistantSource[] = [];
  for (const source of sources) {
    const key = `${source.scheme_id}:${source.field_key}:${source.source_url ?? ""}:${source.verification_status}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(source);
  }
  return unique;
}

export function SchemeAssistantPage() {
  const { t, language, setLanguage } = useI18n();
  const [schemes, setSchemes] = useState<SchemeKnowledgeRecord[]>([]);
  const [status, setStatus] = useState<AgentStatusResponse | null>(null);
  const [schemeId, setSchemeId] = useState("");
  const [typed, setTyped] = useState("");
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guidedTasks = useMemo(
    () => [
      t.assistantSuggestProfile,
      t.assistantSuggestFind,
      t.assistantSuggestEligibilityCheck,
      t.assistantSuggestDocsMissing,
      t.assistantSuggestApps,
    ],
    [t],
  );
  const schemeQuestions = useMemo(
    () => [t.assistantSuggestAbout, t.assistantSuggestDocuments, t.assistantSuggestApply],
    [t],
  );

  async function loadPage() {
    setLoading(true);
    setError(null);
    try {
      const [listed, assistant] = await Promise.all([
        fetchSchemeKnowledge(),
        fetchSchemeAgentStatus(),
      ]);
      setSchemes(listed.schemes);
      setStatus(assistant);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.networkError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
  }, []);

  async function sendMessage(raw: string) {
    const message = raw.trim();
    if (!message) {
      setError(t.assistantEmpty);
      return;
    }
    setError(null);
    setSending(true);
    const userTurn: ChatTurn = { id: nextId(), role: "user", text: message, status: "ok" };
    const pendingId = nextId();
    setHistory((current) => [
      ...current,
      userTurn,
      { id: pendingId, role: "assistant", text: t.assistantAgentSending, status: "pending" },
    ]);
    setTyped("");
    const prior: AssistantHistoryTurn[] = history
      .filter((turn) => turn.status === "ok")
      .slice(-8)
      .map((turn) => ({ role: turn.role, content: turn.text }));
    try {
      const response = await runSchemeAgent({
        message,
        language,
        scheme_id: schemeId || null,
        history: prior,
      });
      if (response.scheme_id) {
        setSchemeId(response.scheme_id);
      }
      setHistory((current) =>
        current.map((turn) => (turn.id === pendingId ? toAssistantTurn(pendingId, response) : turn)),
      );
    } catch (caught) {
      const messageText = caught instanceof ApiError ? caught.message : t.assistantError;
      setError(messageText);
      setHistory((current) =>
        current.map((turn) =>
          turn.id === pendingId ? { ...turn, text: messageText, status: "error" } : turn,
        ),
      );
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void sendMessage(typed);
  }

  function handleClear() {
    setHistory([]);
    setError(null);
  }

  if (loading) {
    return <LoadingState title={t.assistantTitle} message={t.assistantLoadingCatalog} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t.aiResearchPrototype} title={t.assistantTitle} description={t.assistantLead} />
      <ResearchNotice compact />
      <p className="notice-warning text-[16px] leading-relaxed text-ink-700">{t.assistantWarning}</p>
      {status ? (
        <div className="space-y-2 rounded-[14px] border border-line bg-sage px-4 py-3 text-[16px] text-ink-700">
          <p>{t.assistantAgentReady}</p>
          <p>{status.llm_configured ? t.assistantLlmReady : t.assistantLlmFallback}</p>
        </div>
      ) : null}
      {error ? <ErrorState message={error} onRetry={() => void loadPage()} /> : null}

      <section className="card-surface space-y-4 p-5 md:p-8" aria-labelledby="assistant-controls">
        <h2 id="assistant-controls" className="section-title">
          {t.assistantSettings}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-[15px] font-semibold text-ink-700">{t.assistantSchemeLabel}</span>
            <select
              className="field-input"
              value={schemeId}
              onChange={(event) => setSchemeId(event.target.value)}
              aria-label={t.assistantSchemeLabel}
            >
              <option value="">{t.assistantSchemeAny}</option>
              {schemes.map((scheme) => (
                <option key={scheme.scheme_id} value={scheme.scheme_id}>
                  {scheme.scheme_id} — {scheme.scheme_name}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="space-y-2">
            <legend className="text-[15px] font-semibold text-ink-700">{t.assistantLanguage}</legend>
            <div className="flex flex-wrap gap-3">
              {(["en", "ta"] as Language[]).map((code) => (
                <Button
                  key={code}
                  type="button"
                  variant={language === code ? "primary" : "secondary"}
                  aria-pressed={language === code}
                  onClick={() => setLanguage(code)}
                >
                  {code === "en" ? t.languageEnglish : t.languageTamil}
                </Button>
              ))}
            </div>
          </fieldset>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="assistant-guided">
        <h2 id="assistant-guided" className="section-title">
          {t.assistantGuidedTasks}
        </h2>
        <div className="flex flex-wrap gap-3">
          {guidedTasks.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={sending}
              className="rounded-full border border-line bg-surface px-4 py-2.5 text-[16px] font-semibold text-ink-900 hover:bg-sage focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void sendMessage(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="assistant-suggested">
        <h2 id="assistant-suggested" className="section-title">
          {t.assistantSuggested}
        </h2>
        <div className="flex flex-wrap gap-3">
          {schemeQuestions.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={sending}
              className="rounded-full border border-line bg-surface px-4 py-2.5 text-[16px] font-semibold text-ink-900 hover:bg-sage focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void sendMessage(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      </section>

      <section className="card-surface space-y-4 p-5 md:p-8" aria-labelledby="assistant-history">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="assistant-history" className="section-title">
            {t.assistantHistory}
          </h2>
          {history.length > 0 ? (
            <Button type="button" variant="ghost" onClick={handleClear}>
              {t.assistantClear}
            </Button>
          ) : null}
        </div>
        {history.length === 0 ? (
          <p className="text-[17px] text-ink-500">{t.assistantHistoryEmpty}</p>
        ) : (
          <ol className="space-y-4">
            {history.map((turn) => (
              <li key={turn.id} className="rounded-[14px] bg-sage px-4 py-3">
                <p className="text-[15px] font-semibold uppercase tracking-wide text-ink-500">
                  {turn.role === "user" ? t.assistantRoleUser : t.assistantRoleAssistant}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-[17px] leading-relaxed text-ink-900">{turn.text}</p>
                {turn.schemeName ? (
                  <p className="mt-2 text-[15px] text-ink-500">
                    {turn.schemeName}
                  </p>
                ) : null}
                {turn.intent === "CHECK_ELIGIBILITY" ? (
                  <p className="mt-2 text-[15px] font-semibold text-ink-700">{t.assistantPredictionNotice}</p>
                ) : null}
                {turn.steps && turn.steps.length > 0 ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-[15px] text-ink-600">
                    {turn.steps.map((step) => (
                      <li key={`${turn.id}-${step.tool}`}>{step.summary}</li>
                    ))}
                  </ul>
                ) : null}
                {turn.toolsUsed && turn.toolsUsed.length > 0 ? (
                  <p className="mt-2 text-[15px] text-ink-500">
                    {t.assistantToolsUsed}: {turn.toolsUsed.join(", ")}
                  </p>
                ) : null}
                {turn.notice ? <p className="mt-2 text-[16px] text-ink-600">{turn.notice}</p> : null}
                {turn.sources && turn.sources.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-[15px] font-semibold text-ink-700">{t.assistantSources}</p>
                    <ul className="space-y-2">
                      {uniqueSources(turn.sources).map((source) => (
                        <li key={`${turn.id}-${source.field_key}-${source.source_url ?? "none"}`} className="text-[15px] text-ink-700">
                          <span className="font-semibold">{source.label}:</span> {t.assistantVerification}{" "}
                          {verificationLabel(source.verification_status, t)}
                          {source.verification_status === "verified"
                            ? ` · ${t.assistantLastVerified}: ${source.last_verified_at || t.assistantNoVerifiedDate}`
                            : null}
                          {source.source_url ? (
                            <>
                              {" · "}
                              <a
                                href={source.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-action underline"
                              >
                                {t.assistantOfficialSource}
                              </a>
                            </>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {turn.actions && turn.actions.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-3">
                    {turn.actions.map((action) => (
                      <Link key={`${turn.id}-${action.path}`} to={action.path} className="chip-link-primary min-h-12 px-5 py-3">
                        {action.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="card-surface space-y-5 p-5 md:p-8" aria-labelledby="assistant-text">
        <h2 id="assistant-text" className="section-title">
          {t.assistantInputLabel}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="assistant-text-input">
            {t.assistantInputLabel}
          </label>
          <input
            id="assistant-text-input"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={t.assistantPlaceholder}
            aria-label={t.assistantInputLabel}
            className="field-input"
            maxLength={1000}
            disabled={sending}
          />
          <Button type="submit" disabled={sending}>
            {sending ? t.assistantAgentSending : t.assistantSend}
          </Button>
        </form>
      </section>
    </div>
  );
}

function toAssistantTurn(id: string, response: AgentRunResponse): ChatTurn {
  return {
    id,
    role: "assistant",
    text: response.reply,
    status: "ok",
    sources: response.sources,
    actions: response.actions,
    notice: response.notice,
    schemeName: response.scheme_name,
    toolsUsed: response.tools_used,
    steps: response.steps,
    intent: response.intent,
  };
}
