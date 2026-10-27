import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader, AdminPanel } from "../components/admin/adminUi";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { useI18n } from "../context/LanguageContext";
import { ApiError, fetchSchemeKnowledge, updateSchemeKnowledgeItem } from "../services/api";
import type {
  KnowledgeFieldKey,
  KnowledgeVerificationStatus,
  SchemeKnowledgeItem,
  SchemeKnowledgeRecord,
} from "../types/api";

function statusLabel(status: KnowledgeVerificationStatus, t: ReturnType<typeof useI18n>["t"]): string {
  if (status === "verified") return t.adminKnowledgeVerified;
  if (status === "missing") return t.adminKnowledgeMissing;
  return t.adminKnowledgeUnverified;
}

export function AdminSchemesPage() {
  const { t } = useI18n();
  const [schemes, setSchemes] = useState<SchemeKnowledgeRecord[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [department, setDepartment] = useState("all");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { source_url: string; verification_status: KnowledgeVerificationStatus; last_verified_at: string }>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchSchemeKnowledge();
      setSchemes(response.schemes);
      setDepartments(response.departments);
      setCategories(response.categories);
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

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return schemes.filter((scheme) => {
      if (department !== "all" && scheme.department !== department) return false;
      if (category !== "all" && scheme.scheme_category !== category) return false;
      if (!needle) return true;
      return [scheme.scheme_name, scheme.department, scheme.scheme_id].some((value) =>
        (value ?? "").toLowerCase().includes(needle),
      );
    });
  }, [schemes, department, category, query]);

  function draftKey(schemeId: string, fieldKey: KnowledgeFieldKey): string {
    return `${schemeId}:${fieldKey}`;
  }

  function itemDraft(schemeId: string, item: SchemeKnowledgeItem) {
    return (
      drafts[draftKey(schemeId, item.field_key)] ?? {
        source_url: item.source_url ?? "",
        verification_status: item.verification_status,
        last_verified_at: item.last_verified_at ?? "",
      }
    );
  }

  async function saveItem(scheme: SchemeKnowledgeRecord, item: SchemeKnowledgeItem) {
    const key = draftKey(scheme.scheme_id, item.field_key);
    const draft = itemDraft(scheme.scheme_id, item);
    setBusyKey(key);
    setError(null);
    setNotice(null);
    try {
      const updated = await updateSchemeKnowledgeItem(scheme.scheme_id, item.field_key, {
        verification_status: draft.verification_status,
        source_url: draft.source_url.trim() || null,
        last_verified_at: draft.last_verified_at.trim() || null,
      });
      setSchemes((current) => current.map((row) => (row.scheme_id === updated.scheme_id ? updated : row)));
      setNotice(t.adminKnowledgeSaved);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.networkError);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="admin-stack">
      <AdminPageHeader
        eyebrow={t.adminSectionManagement}
        title={t.adminSchemeManagement}
        description={t.adminSchemeManagementLead}
      />
      <p className="admin-note">{t.adminReadOnlyCatalog}</p>
      <p className="admin-note">{t.adminKnowledgeNote}</p>
      {notice ? (
        <p className="admin-note admin-note-success" role="status">
          {notice}
        </p>
      ) : null}
      <AdminPanel>
        <div className="admin-toolbar">
          <label className="sr-only" htmlFor="admin-scheme-search">
            {t.adminSearch}
          </label>
          <input
            id="admin-scheme-search"
            className="admin-input min-w-[200px] flex-1"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.adminScheme}
          />
          <label className="admin-filter-label" htmlFor="admin-scheme-dept">
            {t.adminDepartment}
          </label>
          <select
            id="admin-scheme-dept"
            className="admin-input max-w-xs"
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
          >
            <option value="all">{t.adminFilterAll}</option>
            {departments.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <label className="admin-filter-label" htmlFor="admin-scheme-cat">
            {t.adminCategory}
          </label>
          <select
            id="admin-scheme-cat"
            className="admin-input max-w-xs"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">{t.adminFilterAll}</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        {loading ? <LoadingState message={t.adminLoading} /> : null}
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {!loading && visible.length === 0 ? <p className="admin-empty">{t.adminNoSchemes}</p> : null}
        {visible.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t.adminScheme}</th>
                  <th>{t.adminDepartment}</th>
                  <th>{t.adminCategory}</th>
                  <th>{t.adminMlScope}</th>
                  <th>{t.adminKnowledgeOfficialSource}</th>
                  <th>{t.adminKnowledgeStatus}</th>
                  <th>{t.adminKnowledgeOpen}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((scheme) => {
                  const unverifiedCount = scheme.items.filter((item) => item.verification_status !== "verified").length;
                  return (
                    <tr key={scheme.scheme_id}>
                      <td>
                        <div className="font-medium text-slate-900">{scheme.scheme_name}</div>
                        <div className="admin-meta">{scheme.scheme_id}</div>
                      </td>
                      <td>{scheme.department ?? "—"}</td>
                      <td>{scheme.scheme_category ?? "—"}</td>
                      <td>{scheme.ml_scope}</td>
                      <td>
                        {scheme.official_source_url ? (
                          <a
                            href={scheme.official_source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-action hover:underline"
                          >
                            {t.adminKnowledgeOfficialSource}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {unverifiedCount === 0 ? t.adminKnowledgeVerified : `${unverifiedCount} ${t.adminKnowledgeUnverified}`}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-input"
                          aria-expanded={openId === scheme.scheme_id}
                          onClick={() => setOpenId((current) => (current === scheme.scheme_id ? null : scheme.scheme_id))}
                        >
                          {openId === scheme.scheme_id ? t.adminKnowledgeHide : t.adminKnowledgeOpen}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        {openId
          ? visible
              .filter((scheme) => scheme.scheme_id === openId)
              .map((scheme) => (
                <section key={`${scheme.scheme_id}-knowledge`} className="mt-6 space-y-4" aria-label={t.adminKnowledgeOpen}>
                  {scheme.items.map((item) => {
                    const key = draftKey(scheme.scheme_id, item.field_key);
                    const draft = itemDraft(scheme.scheme_id, item);
                    return (
                      <article key={key} className="rounded-[10px] border border-slate-200 bg-white p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <h2 className="text-[16px] font-semibold text-slate-900">{item.label}</h2>
                          <span className="admin-meta">{statusLabel(item.verification_status, t)}</span>
                        </div>
                        <p className="mb-3 whitespace-pre-wrap text-[15px] text-slate-700">
                          {item.value || t.adminKnowledgeMissing}
                        </p>
                        {item.content_state === "unverified_placeholder" ? (
                          <p className="admin-note mb-3">{t.adminKnowledgePlaceholder}</p>
                        ) : null}
                        {item.catalog_access_date ? (
                          <p className="admin-meta mb-3">
                            {t.adminKnowledgeCatalogDate}: {item.catalog_access_date}
                          </p>
                        ) : null}
                        <div className="grid gap-3 md:grid-cols-3">
                          <label className="space-y-1 text-[14px] font-semibold text-slate-800">
                            {t.adminKnowledgeSource}
                            <input
                              className="admin-input w-full"
                              value={draft.source_url}
                              onChange={(event) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [key]: { ...draft, source_url: event.target.value },
                                }))
                              }
                            />
                          </label>
                          <label className="space-y-1 text-[14px] font-semibold text-slate-800">
                            {t.adminKnowledgeStatus}
                            <select
                              className="admin-input w-full"
                              value={draft.verification_status}
                              onChange={(event) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [key]: {
                                    ...draft,
                                    verification_status: event.target.value as KnowledgeVerificationStatus,
                                  },
                                }))
                              }
                            >
                              <option value="unverified">{t.adminKnowledgeUnverified}</option>
                              <option value="verified">{t.adminKnowledgeVerified}</option>
                              <option value="missing">{t.adminKnowledgeMissing}</option>
                            </select>
                          </label>
                          <label className="space-y-1 text-[14px] font-semibold text-slate-800">
                            {t.adminKnowledgeLastVerified}
                            <input
                              type="date"
                              className="admin-input w-full"
                              value={draft.last_verified_at}
                              onChange={(event) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [key]: { ...draft, last_verified_at: event.target.value },
                                }))
                              }
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          className="mt-3 inline-flex items-center rounded-[10px] bg-slate-900 px-4 py-2 text-[15px] font-semibold text-white disabled:opacity-60"
                          disabled={busyKey === key}
                          onClick={() => void saveItem(scheme, item)}
                        >
                          {t.adminKnowledgeSave}
                        </button>
                      </article>
                    );
                  })}
                </section>
              ))
          : null}
      </AdminPanel>
    </div>
  );
}
