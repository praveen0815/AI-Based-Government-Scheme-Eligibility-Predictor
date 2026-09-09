import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { ResearchNotice } from "../components/ResearchNotice";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { useI18n } from "../context/LanguageContext";
import { useRecommendation } from "../context/RecommendationContext";
import {
  ApiError,
  createApplication,
  deleteApplication,
  fetchApplications,
  fetchSchemeCatalog,
  updateApplication,
} from "../services/api";
import type { ApplicationItem, ApplicationStatus, CatalogSearchItem } from "../types/api";
import { displayCatalogText } from "../utils/catalogText";

const STATUSES: ApplicationStatus[] = [
  "not_applied",
  "planning",
  "documents_ready",
  "applied",
  "under_review",
  "approved",
  "rejected",
];

export function ApplicationsPage() {
  const { t } = useI18n();
  const { result } = useRecommendation();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<ApplicationItem[]>([]);
  const [catalog, setCatalog] = useState<CatalogSearchItem[]>([]);
  const [schemeId, setSchemeId] = useState(searchParams.get("scheme") ?? "");
  const [status, setStatus] = useState<ApplicationStatus>("planning");
  const [applicationDate, setApplicationDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function statusLabel(value: ApplicationStatus): string {
    if (value === "not_applied") return t.appStatusNotApplied;
    if (value === "planning") return t.appStatusPlanning;
    if (value === "documents_ready") return t.appStatusDocumentsReady;
    if (value === "applied") return t.appStatusApplied;
    if (value === "under_review") return t.appStatusUnderReview;
    if (value === "approved") return t.appStatusApproved;
    return t.appStatusRejected;
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [listed, catalogResponse] = await Promise.all([fetchApplications(), fetchSchemeCatalog()]);
      setItems(listed.applications);
      setCatalog(catalogResponse.schemes);
      const requested = searchParams.get("scheme");
      if (requested && catalogResponse.schemes.some((scheme) => scheme.scheme_id === requested)) {
        setSchemeId(requested);
      } else if (!schemeId && catalogResponse.schemes[0]) {
        setSchemeId(catalogResponse.schemes[0].scheme_id);
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.networkError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schemeId) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await createApplication(schemeId, status, applicationDate || null);
      setNotice(t.appSaved);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.networkError);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(applicationId: string, next: ApplicationStatus) {
    try {
      await updateApplication(applicationId, { status: next });
      setNotice(t.appUpdated);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.networkError);
    }
  }

  async function handleDate(applicationId: string, next: string) {
    try {
      await updateApplication(applicationId, { application_date: next || null });
      setNotice(t.appUpdated);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.networkError);
    }
  }

  async function handleRemove(applicationId: string) {
    if (!window.confirm(t.appConfirmRemove)) return;
    try {
      await deleteApplication(applicationId);
      setNotice(t.appRemoved);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.networkError);
    }
  }

  const recommendedIds = new Set(result?.recommendations.map((scheme) => scheme.scheme_id) ?? []);

  return (
    <div className="page-stack">
      <PageHeader title={t.appTitle} description={t.appLead} />
      <ResearchNotice compact />
      <p className="rounded-[12px] border border-line bg-surface px-5 py-4 text-[16px] leading-relaxed text-ink-700" role="note">
        {t.appDisclaimer} {t.appEligibilityVsStatus}
      </p>
      {notice ? (
        <p className="notice-success" role="status">
          {notice}
        </p>
      ) : null}
      {loading ? <LoadingState message={t.loadingSchemes} /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      <form onSubmit={(event) => void handleSave(event)} className="card-surface grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4 md:items-end">
        <label className="block text-[16px]" htmlFor="application-scheme">
          <span className="field-label mb-2 block">{t.appSelectScheme}</span>
          <select
            id="application-scheme"
            className="field-input"
            value={schemeId}
            onChange={(event) => setSchemeId(event.target.value)}
          >
            {catalog.map((scheme) => (
              <option key={scheme.scheme_id} value={scheme.scheme_id}>
                {scheme.scheme_name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[16px]" htmlFor="application-status">
          <span className="field-label mb-2 block">{t.appStatus}</span>
          <select
            id="application-status"
            className="field-input"
            value={status}
            onChange={(event) => setStatus(event.target.value as ApplicationStatus)}
          >
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {statusLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[16px]" htmlFor="application-date-new">
          <span className="field-label mb-2 block">{t.appDate}</span>
          <input
            id="application-date-new"
            type="date"
            className="field-input"
            value={applicationDate}
            onChange={(event) => setApplicationDate(event.target.value)}
          />
        </label>
        <Button type="submit" disabled={saving || !schemeId}>
          {t.appSave}
        </Button>
      </form>

      {!loading && items.length === 0 ? (
        <EmptyState title={t.appEmptyTitle} description={t.appEmptyLead} />
      ) : null}

      <div className="grid gap-5">
        {items.map((item) => (
          <article key={item.application_id} className="card-surface space-y-4 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="card-title">{item.scheme_name}</h2>
              <Badge tone="muted">{statusLabel(item.status)}</Badge>
              {recommendedIds.has(item.scheme_id) ? <Badge tone="success">{t.catalogEligibilityEligible}</Badge> : null}
            </div>
            {item.department ? <p className="text-[16px] text-ink-500">{item.department}</p> : null}
            <p className="text-[16px] leading-relaxed text-ink-500">
              {t.requiredDocuments}: {displayCatalogText(item.required_documents, t.catalogMissing)}
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="block text-[16px]" htmlFor={`status-${item.application_id}`}>
                <span className="field-label mb-2 block">{t.appStatus}</span>
                <select
                  id={`status-${item.application_id}`}
                  className="field-input"
                  value={item.status}
                  onChange={(event) => void handleStatus(item.application_id, event.target.value as ApplicationStatus)}
                >
                  {STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {statusLabel(value)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[16px]" htmlFor={`date-${item.application_id}`}>
                <span className="field-label mb-2 block">{t.appDate}</span>
                <input
                  id={`date-${item.application_id}`}
                  type="date"
                  className="field-input"
                  value={item.application_date ?? ""}
                  onChange={(event) => void handleDate(item.application_id, event.target.value)}
                />
              </label>
              {item.official_source_url ? (
                <a
                  href={item.official_source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[12px] bg-navy-900 px-4 py-2.5 text-[16px] font-semibold text-white hover:bg-navy-800"
                >
                  {t.officialSource}
                </a>
              ) : null}
              <Button type="button" variant="danger" onClick={() => void handleRemove(item.application_id)}>
                {t.appRemove}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
