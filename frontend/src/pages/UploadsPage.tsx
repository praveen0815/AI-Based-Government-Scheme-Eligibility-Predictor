import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { ResearchNotice } from "../components/ResearchNotice";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { useI18n } from "../context/LanguageContext";
import {
  ApiError,
  deleteSupportingUpload,
  downloadSupportingUpload,
  fetchDocumentProgress,
  fetchSupportingUploads,
  updateSupportingUploadLink,
  uploadSupportingDocument,
} from "../services/api";
import type { SupportingUpload, SupportingUploadCategory } from "../types/api";
import { formatCheckedAt } from "../utils/displayLabels";

const CATEGORIES: SupportingUploadCategory[] = [
  "identity_proof_demo",
  "address_proof",
  "education_certificate",
  "income_certificate",
  "community_certificate",
  "other_supporting",
];

function categoryLabel(category: SupportingUploadCategory, t: ReturnType<typeof useI18n>["t"]): string {
  if (category === "identity_proof_demo") return t.uploadsCategoryIdentity;
  if (category === "address_proof") return t.uploadsCategoryAddress;
  if (category === "education_certificate") return t.uploadsCategoryEducation;
  if (category === "income_certificate") return t.uploadsCategoryIncome;
  if (category === "community_certificate") return t.uploadsCategoryCommunity;
  return t.uploadsCategoryOther;
}

export function UploadsPage() {
  const { language, t } = useI18n();
  const [uploads, setUploads] = useState<SupportingUpload[]>([]);
  const [schemes, setSchemes] = useState<{ scheme_id: string; scheme_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [category, setCategory] = useState<SupportingUploadCategory>("other_supporting");
  const [schemeId, setSchemeId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function loadUploads() {
    setLoading(true);
    setError(null);
    try {
      const [listed, progress] = await Promise.all([
        fetchSupportingUploads(),
        fetchDocumentProgress().catch(() => null),
      ]);
      setUploads(listed.uploads);
      setSchemes(progress?.schemes.map((scheme) => ({ scheme_id: scheme.scheme_id, scheme_name: scheme.scheme_name })) ?? []);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.networkError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUploads();
  }, [t]);

  async function handleUpload(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setActionError(t.uploadsFailed);
      return;
    }
    setUploading(true);
    setActionError(null);
    try {
      await uploadSupportingDocument(file, category, schemeId || undefined);
      setFile(null);
      await loadUploads();
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : t.uploadsFailed);
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(item: SupportingUpload) {
    setBusyId(item.id);
    setActionError(null);
    try {
      await downloadSupportingUpload(item.id, item.display_name);
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : t.uploadsDownloadFailed);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: SupportingUpload) {
    setBusyId(item.id);
    setActionError(null);
    try {
      await deleteSupportingUpload(item.id);
      setUploads((current) => current.filter((row) => row.id !== item.id));
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : t.uploadsDeleteFailed);
    } finally {
      setBusyId(null);
    }
  }

  async function handleLink(item: SupportingUpload, nextSchemeId: string) {
    setBusyId(item.id);
    setActionError(null);
    try {
      const updated = await updateSupportingUploadLink(item.id, nextSchemeId || null);
      setUploads((current) => current.map((row) => (row.id === item.id ? updated : row)));
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : t.uploadsLinkFailed);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader title={t.uploadsTitle} description={t.uploadsLead} />
      <ResearchNotice compact />
      <p className="rounded-[12px] border border-line bg-[#FFF6E8] px-4 py-3 text-[16px] font-medium text-ink-900" role="alert">
        {t.uploadsWarning}
      </p>

      {loading ? <LoadingState message={t.uploadsLoading} /> : null}
      {error ? <ErrorState message={error} /> : null}
      {actionError ? <ErrorState message={actionError} /> : null}

      {!loading && !error ? (
        <form className="card-surface space-y-5 p-6 md:p-8" onSubmit={(event) => void handleUpload(event)}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-[16px] font-semibold text-ink-900">
              {t.uploadsCategory}
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as SupportingUploadCategory)}
                className="mt-2 w-full rounded-[12px] border border-line bg-white px-3 py-2.5 text-[16px] font-medium text-ink-900"
              >
                {CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {categoryLabel(value, t)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-[16px] font-semibold text-ink-900">
              {t.uploadsSchemeOptional}
              <select
                value={schemeId}
                onChange={(event) => setSchemeId(event.target.value)}
                className="mt-2 w-full rounded-[12px] border border-line bg-white px-3 py-2.5 text-[16px] font-medium text-ink-900"
              >
                <option value="">{t.uploadsSchemeNone}</option>
                {schemes.map((scheme) => (
                  <option key={scheme.scheme_id} value={scheme.scheme_id}>
                    {scheme.scheme_name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block space-y-2 text-[16px] font-semibold text-ink-900">
            {t.uploadsFile}
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="mt-2 block w-full text-[16px] font-medium text-ink-700"
            />
          </label>
          <button
            type="submit"
            disabled={uploading}
            className="inline-flex items-center justify-center rounded-[12px] bg-action px-5 py-3 font-semibold text-white hover:bg-action-hover disabled:opacity-60"
          >
            {uploading ? t.uploadsUploading : t.uploadsSubmit}
          </button>
        </form>
      ) : null}

      {!loading && !error && uploads.length === 0 ? (
        <EmptyState title={t.uploadsEmptyTitle} description={t.uploadsEmptyLead} />
      ) : null}

      {!loading && !error && uploads.length > 0 ? (
        <section className="card-surface space-y-4 p-6 md:p-8" aria-labelledby="uploads-list">
          <h2 id="uploads-list" className="section-title">
            {t.uploadsListTitle}
          </h2>
          <ul className="divide-y divide-line">
            {uploads.map((item) => (
              <li key={item.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="text-[18px] font-semibold text-ink-900">{item.display_name}</p>
                  <p className="text-[15px] text-ink-500">
                    {categoryLabel(item.category, t)} · {t.uploadsSize(item.size_bytes)} · {formatCheckedAt(item.created_at, language)}
                  </p>
                  <p className="text-[15px] text-ink-500">
                    {t.uploadsLinkedScheme}: {item.scheme_name || t.uploadsUnlinked}
                  </p>
                  {schemes.length > 0 ? (
                    <label className="block text-[14px] font-semibold text-ink-700">
                      {t.uploadsLinkScheme}
                      <select
                        value={item.scheme_id ?? ""}
                        disabled={busyId === item.id}
                        onChange={(event) => void handleLink(item, event.target.value)}
                        className="mt-1 w-full max-w-md rounded-[12px] border border-line bg-white px-3 py-2 text-[15px] font-medium"
                      >
                        <option value="">{t.uploadsSchemeNone}</option>
                        {schemes.map((scheme) => (
                          <option key={scheme.scheme_id} value={scheme.scheme_id}>
                            {scheme.scheme_name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => void handleDownload(item)}
                    className="inline-flex items-center justify-center rounded-[12px] border border-line px-4 py-2.5 text-[16px] font-semibold text-ink-900 hover:bg-canvas"
                  >
                    {t.uploadsView}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => void handleDelete(item)}
                    className="inline-flex items-center justify-center rounded-[12px] border border-line px-4 py-2.5 text-[16px] font-semibold text-ink-900 hover:bg-canvas"
                  >
                    {t.uploadsDelete}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-[16px] leading-relaxed text-ink-500">{t.uploadsOptionalNote}</p>
        </section>
      ) : null}

      <p className="text-[16px] text-ink-500">
        <Link to="/documents" className="font-semibold text-action hover:underline">
          {t.navDocuments}
        </Link>
      </p>
    </div>
  );
}
