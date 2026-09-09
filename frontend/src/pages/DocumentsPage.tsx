import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { ResearchNotice } from "../components/ResearchNotice";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { useI18n } from "../context/LanguageContext";
import {
  ApiError,
  fetchDocumentProgress,
  fetchSchemeDocumentChecklist,
  fetchSupportingUploads,
  updateDocumentChecklistItem,
} from "../services/api";
import type {
  DocumentPrepStatus,
  DocumentProgressResponse,
  SchemeDocumentChecklist,
  SupportingUpload,
} from "../types/api";

const STATUSES: DocumentPrepStatus[] = ["not_started", "ready", "needs_verification"];

function statusLabel(status: DocumentPrepStatus, t: ReturnType<typeof useI18n>["t"]): string {
  if (status === "ready") return t.documentsReady;
  if (status === "needs_verification") return t.documentsNeedsVerification;
  return t.documentsNotStarted;
}

function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[16px] font-semibold text-ink-900">{label}</p>
        <p className="text-[16px] font-semibold text-action">{percent}%</p>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-sage" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-action transition-[width] duration-200" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function DocumentsPage() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("scheme") ?? "";
  const [summary, setSummary] = useState<DocumentProgressResponse | null>(null);
  const [checklist, setChecklist] = useState<SchemeDocumentChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [uploads, setUploads] = useState<SupportingUpload[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadSummary() {
      setLoading(true);
      setError(null);
      try {
        const next = await fetchDocumentProgress();
        if (!cancelled) setSummary(next);
        try {
          const listed = await fetchSupportingUploads();
          if (!cancelled) setUploads(listed.uploads);
        } catch {
          if (!cancelled) setUploads([]);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : t.networkError);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const schemes = summary?.schemes ?? [];
  const activeId = useMemo(() => {
    if (schemes.some((scheme) => scheme.scheme_id === selectedId)) return selectedId;
    return schemes[0]?.scheme_id ?? "";
  }, [schemes, selectedId]);

  useEffect(() => {
    if (!activeId) {
      setChecklist(null);
      return;
    }
    let cancelled = false;
    async function loadChecklist() {
      setDetailLoading(true);
      setSaveError(null);
      try {
        const next = await fetchSchemeDocumentChecklist(activeId);
        if (!cancelled) setChecklist(next);
      } catch (caught) {
        if (!cancelled) {
          setSaveError(caught instanceof ApiError ? caught.message : t.networkError);
          setChecklist(null);
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }
    void loadChecklist();
    return () => {
      cancelled = true;
    };
  }, [activeId, t]);

  async function handleStatus(itemKey: string, status: DocumentPrepStatus) {
    if (!activeId) return;
    setSavingKey(itemKey);
    setSaveError(null);
    try {
      const next = await updateDocumentChecklistItem(activeId, itemKey, status);
      setChecklist(next);
      const refreshed = await fetchDocumentProgress();
      setSummary(refreshed);
    } catch (caught) {
      setSaveError(caught instanceof ApiError ? caught.message : t.documentsSaveFailed);
    } finally {
      setSavingKey(null);
    }
  }

  const catalogItems = checklist?.items.filter((item) => item.source === "catalog") ?? [];
  const reminderItems = checklist?.items.filter((item) => item.source === "project_reminder") ?? [];

  return (
    <div className="mx-auto max-w-5xl page-stack">
      <PageHeader title={t.documentsTitle} description={t.documentsLead} />
      <ResearchNotice compact />

      {loading ? <LoadingState message={t.documentsLoading} /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading && !error && schemes.length === 0 ? (
        <EmptyState title={t.documentsEmptyTitle} description={t.documentsEmptyLead}>
          <Link
            to="/wallet"
            className="inline-flex items-center justify-center rounded-[12px] bg-action px-5 py-3 font-semibold text-white"
          >
            {t.findEligibleSchemes}
          </Link>
        </EmptyState>
      ) : null}

      {!loading && !error && schemes.length > 0 ? (
        <>
          <section className="card-surface space-y-4 p-6 md:p-8" aria-labelledby="documents-schemes">
            <h2 id="documents-schemes" className="section-title">
              {t.documentsRecommendedSchemes}
            </h2>
            <p className="text-[16px] text-ink-500">{t.documentsSelectScheme}</p>
            <div className="grid gap-3 md:grid-cols-2">
              {schemes.map((scheme) => {
                const active = scheme.scheme_id === activeId;
                return (
                  <button
                    key={scheme.scheme_id}
                    type="button"
                    onClick={() => setSearchParams({ scheme: scheme.scheme_id })}
                    className={`rounded-[12px] border px-4 py-4 text-left transition duration-150 ${
                      active ? "border-action bg-[#E8F1EC]" : "border-line bg-white hover:bg-sage"
                    }`}
                  >
                    <p className="text-[17px] font-semibold text-ink-900">{scheme.scheme_name}</p>
                    <p className="mt-2 text-[15px] text-ink-500">
                      {t.documentsPreparationProgress}: {scheme.progress_percent}%
                    </p>
                    <p className="mt-1 text-[16px] text-ink-500">
                      {t.uploadsOptionalEvidence}: {uploads.filter((item) => item.scheme_id === scheme.scheme_id).length}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {detailLoading ? <LoadingState message={t.documentsLoading} /> : null}
          {saveError ? <ErrorState message={saveError} /> : null}

          {checklist && !detailLoading ? (
            <section className="card-surface space-y-6 p-6 md:p-8" aria-labelledby="documents-checklist">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 id="documents-checklist" className="section-title">
                    {checklist.scheme_name}
                  </h2>
                  <p className="mt-2 text-[16px] text-ink-500">{checklist.scheme_id}</p>
                </div>
                {checklist.official_source_url ? (
                  <a
                    href={checklist.official_source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-[12px] border border-line px-4 py-2.5 text-[16px] font-semibold text-ink-900 hover:bg-sage"
                  >
                    {t.visitOfficialWebsite}
                  </a>
                ) : null}
              </div>

              <ProgressBar percent={checklist.progress_percent} label={t.documentsPreparationProgress} />
              <div className="rounded-[12px] border border-line bg-sage px-4 py-4">
                <p className="text-[16px] font-semibold text-ink-900">{t.uploadsOptionalEvidence}</p>
                <p className="mt-2 text-[16px] text-ink-700">
                  {t.uploadsCount(uploads.filter((item) => item.scheme_id === checklist.scheme_id).length)}
                </p>
                <p className="mt-2 text-[15px] text-ink-500">{t.uploadsOptionalNote}</p>
                <Link
                  to="/uploads"
                  className="mt-3 inline-flex items-center justify-center rounded-[12px] border border-line bg-white px-4 py-2.5 text-[16px] font-semibold text-ink-900 hover:bg-sage"
                >
                  {t.uploadsManageForScheme}
                </Link>
              </div>
              <p className="text-[16px] text-ink-500">
                {checklist.ready_count} / {checklist.item_count} {t.documentsReady.toLowerCase()}
              </p>

              {checklist.documents_need_verification ? (
                <p className="rounded-[12px] border border-line bg-sage px-4 py-3 text-[16px] text-ink-700" role="status">
                  {t.documentsNeedsOfficialVerification}
                </p>
              ) : null}

              <div className="space-y-4">
                <h3 className="text-[18px] font-semibold text-ink-900">{t.documentsReminderSection}</h3>
                {reminderItems.map((item) => (
                  <article key={item.item_key} className="rounded-[12px] border border-line px-4 py-4">
                    <p className="text-[17px] font-medium text-ink-900">{t.documentsOfficialReminder}</p>
                    <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={t.documentsOfficialReminder}>
                      {STATUSES.map((status) => (
                        <button
                          key={status}
                          type="button"
                          disabled={savingKey === item.item_key}
                          onClick={() => void handleStatus(item.item_key, status)}
                          className={`rounded-full border px-3 py-1.5 text-[16px] font-semibold ${
                            item.status === status
                              ? "border-action bg-[#E8F1EC] text-action"
                              : "border-line bg-white text-ink-700 hover:bg-sage"
                          }`}
                        >
                          {statusLabel(status, t)}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>

              <div className="space-y-4">
                <h3 className="text-[18px] font-semibold text-ink-900">{t.documentsCatalogSection}</h3>
                {catalogItems.length === 0 ? (
                  <p className="text-[16px] text-ink-500">{t.documentsNoItems}</p>
                ) : (
                  catalogItems.map((item) => (
                    <article key={item.item_key} className="rounded-[12px] border border-line px-4 py-4">
                      <p className="text-[17px] font-medium text-ink-900">{item.label}</p>
                      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={item.label}>
                        {STATUSES.map((status) => (
                          <button
                            key={status}
                            type="button"
                            disabled={savingKey === item.item_key}
                            onClick={() => void handleStatus(item.item_key, status)}
                            className={`rounded-full border px-3 py-1.5 text-[16px] font-semibold ${
                              item.status === status
                                ? "border-action bg-[#E8F1EC] text-action"
                                : "border-line bg-white text-ink-700 hover:bg-sage"
                            }`}
                          >
                            {statusLabel(status, t)}
                          </button>
                        ))}
                      </div>
                    </article>
                  ))
                )}
              </div>

              <p className="text-[16px] leading-relaxed text-ink-500">{t.documentsDisclaimer}</p>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
