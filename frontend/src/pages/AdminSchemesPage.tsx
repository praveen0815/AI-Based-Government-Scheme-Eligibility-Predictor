import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader, AdminPanel } from "../components/admin/adminUi";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { useI18n } from "../context/LanguageContext";
import { ApiError, fetchSchemeCatalog } from "../services/api";
import type { CatalogSearchItem } from "../types/api";

export function AdminSchemesPage() {
  const { t } = useI18n();
  const [schemes, setSchemes] = useState<CatalogSearchItem[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [department, setDepartment] = useState("all");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchSchemeCatalog();
      setSchemes(response.schemes);
      setDepartments(response.filters.departments);
      setCategories(response.filters.categories);
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

  return (
    <div className="admin-stack">
      <AdminPageHeader
        eyebrow={t.adminSectionManagement}
        title={t.adminSchemeManagement}
        description={t.adminSchemeManagementLead}
      />
      <p className="admin-note">{t.adminReadOnlyCatalog}</p>
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
                </tr>
              </thead>
              <tbody>
                {visible.map((scheme) => (
                  <tr key={scheme.scheme_id}>
                    <td>
                      <div className="font-medium text-slate-900">{scheme.scheme_name}</div>
                      <div className="text-[13px] text-slate-500">{scheme.scheme_id}</div>
                    </td>
                    <td>{scheme.department ?? "—"}</td>
                    <td>{scheme.scheme_category ?? "—"}</td>
                    <td>{scheme.ml_scope}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </AdminPanel>
    </div>
  );
}
