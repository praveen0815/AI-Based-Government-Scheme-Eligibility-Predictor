import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { ResearchNotice } from "../components/ResearchNotice";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { useI18n } from "../context/LanguageContext";
import { ApiError, fetchReadinessProgress, updateSchemeReadiness } from "../services/api";
import type { ReadinessProgressResponse, ReadinessStage, SchemeReadiness } from "../types/api";

const STAGES: ReadinessStage[] = [
  "not_started",
  "profile_ready",
  "documents_in_progress",
  "ready_to_apply",
  "official_source_visited",
  "completed_preparation",
];

function stageLabel(stage: ReadinessStage, t: ReturnType<typeof useI18n>["t"]): string {
  if (stage === "profile_ready") return t.readinessProfileReady;
  if (stage === "documents_in_progress") return t.readinessDocumentsInProgress;
  if (stage === "ready_to_apply") return t.readinessReadyToApply;
  if (stage === "official_source_visited") return t.readinessOfficialVisited;
  if (stage === "completed_preparation") return t.readinessCompleted;
  return t.readinessNotStarted;
}

function Timeline({ scheme }: { scheme: SchemeReadiness }) {
  return (
    <ol className="mt-4 flex flex-wrap gap-2" aria-label={scheme.scheme_name}>
      {STAGES.map((stage, index) => {
        const reached = index <= scheme.stage_index;
        return (
          <li
            key={stage}
            className={`h-2 min-w-8 flex-1 rounded-full ${reached ? "bg-action" : "bg-sage"}`}
            aria-current={stage === scheme.stage ? "step" : undefined}
          />
        );
      })}
    </ol>
  );
}

export function ReadinessPage() {
  const { t } = useI18n();
  const [summary, setSummary] = useState<ReadinessProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function loadSummary() {
    setLoading(true);
    setError(null);
    try {
      setSummary(await fetchReadinessProgress());
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.networkError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSummary();
  }, [t]);

  async function handleStage(schemeId: string, stage: ReadinessStage) {
    setSavingId(schemeId);
    setSaveError(null);
    try {
      const next = await updateSchemeReadiness(schemeId, stage);
      setSummary((current) => {
        if (!current) return current;
        return {
          ...current,
          schemes: current.schemes.map((scheme) => (scheme.scheme_id === schemeId ? next : scheme)),
        };
      });
      setSummary(await fetchReadinessProgress());
    } catch (caught) {
      setSaveError(caught instanceof ApiError ? caught.message : t.readinessSaveFailed);
    } finally {
      setSavingId(null);
    }
  }

  const schemes = summary?.schemes ?? [];

  return (
    <div className="mx-auto max-w-5xl page-stack">
      <PageHeader title={t.readinessTitle} description={t.readinessLead} />
      <ResearchNotice compact />

      {loading ? <LoadingState message={t.readinessLoading} /> : null}
      {error ? <ErrorState message={error} /> : null}
      {saveError ? <ErrorState message={saveError} /> : null}

      {!loading && !error && schemes.length === 0 ? (
        <EmptyState title={t.readinessEmptyTitle} description={t.readinessEmptyLead}>
          <Link
            to="/wallet"
            className="inline-flex items-center justify-center rounded-[12px] bg-action px-5 py-3 font-semibold text-white"
          >
            {t.findEligibleSchemes}
          </Link>
        </EmptyState>
      ) : null}

      {!loading && !error && schemes.length > 0 ? (
        <div className="space-y-5">
          <p className="rounded-[12px] border border-line bg-sage px-4 py-3 text-[16px] text-ink-700" role="note">
            {t.readinessCompletedNote}
          </p>
          {schemes.map((scheme) => (
            <article key={scheme.scheme_id} className="card-surface space-y-4 p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="section-title">{scheme.scheme_name}</h2>
                  <p className="mt-1 text-[15px] text-ink-500">{scheme.scheme_id}</p>
                  <p className="mt-3 text-[16px] text-ink-700">
                    {t.readinessCurrentStage}: {stageLabel(scheme.stage, t)} · {scheme.progress_percent}%
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/documents?scheme=${scheme.scheme_id}`}
                    className="inline-flex items-center justify-center rounded-[12px] border border-line px-4 py-2.5 text-[16px] font-semibold text-ink-900 hover:bg-sage"
                  >
                    {t.readinessDocumentsLink}
                  </Link>
                  {scheme.official_source_url ? (
                    <a
                      href={scheme.official_source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-[12px] border border-line px-4 py-2.5 text-[16px] font-semibold text-ink-900 hover:bg-sage"
                    >
                      {t.visitOfficialWebsite}
                    </a>
                  ) : null}
                </div>
              </div>
              <Timeline scheme={scheme} />
              <div>
                <p className="text-[15px] font-semibold text-ink-700">{t.readinessUpdateStage}</p>
                <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={scheme.scheme_name}>
                  {STAGES.map((stage) => (
                    <button
                      key={stage}
                      type="button"
                      disabled={savingId === scheme.scheme_id}
                      onClick={() => void handleStage(scheme.scheme_id, stage)}
                      className={`rounded-full border px-3 py-1.5 text-[16px] font-semibold ${
                        scheme.stage === stage
                          ? "border-action bg-[#E8F1EC] text-action"
                          : "border-line bg-white text-ink-700 hover:bg-sage"
                      }`}
                    >
                      {stageLabel(stage, t)}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          ))}
          <p className="text-[16px] leading-relaxed text-ink-500">{t.readinessDisclaimer}</p>
        </div>
      ) : null}
    </div>
  );
}
