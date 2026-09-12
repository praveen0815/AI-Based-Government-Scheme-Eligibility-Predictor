import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "../components/admin/adminUi";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { useI18n } from "../context/LanguageContext";
import { ApiError, fetchAdminEligibility } from "../services/api";
import type { AdminEligibilityRow } from "../types/api";

type EligibilityFilter = "all" | "eligible" | "not_eligible" | "cannot_fully_evaluate";

function predictionStatus(status: string): "eligible" | "not_eligible" | "cannot_fully_evaluate" | "not_evaluated" {
  if (status === "eligible" || status === "not_eligible" || status === "cannot_fully_evaluate") {
    return status;
  }
  return "not_evaluated";
}

export function AdminEligibilityPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<AdminEligibilityRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<EligibilityFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAdminEligibility();
      setRows(response.users);
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

  const visible = useMemo(
    () => (statusFilter === "all" ? rows : rows.filter((row) => row.prediction_label === statusFilter)),
    [rows, statusFilter],
  );

  return (
    <div className="admin-stack">
      <AdminPageHeader
        eyebrow={t.adminSectionAnalytics}
        title={t.adminEligibilityMonitoring}
        description={t.adminEligibilityLead}
      />
      <p className="admin-note">{t.adminPredictionNotice}</p>
      <AdminPanel>
        <div className="admin-toolbar">
          <label className="admin-filter-label" htmlFor="admin-elig-filter">
            {t.adminFilterStatus}
          </label>
          <select
            id="admin-elig-filter"
            className="admin-input max-w-xs"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as EligibilityFilter)}
          >
            <option value="all">{t.adminFilterAll}</option>
            <option value="eligible">{t.catalogEligibilityEligible}</option>
            <option value="not_eligible">{t.catalogEligibilityNotEligible}</option>
            <option value="cannot_fully_evaluate">{t.catalogEligibilityIncomplete}</option>
          </select>
        </div>
        {loading ? <LoadingState message={t.adminLoading} /> : null}
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {!loading && visible.length === 0 ? <p className="admin-empty">{t.adminUsersEmpty}</p> : null}
        {visible.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t.adminName}</th>
                  <th>{t.adminEmail}</th>
                  <th>{t.adminStatus}</th>
                  <th>{t.adminScheme}</th>
                  <th>{t.adminView}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.user_id}>
                    <td className="font-medium text-slate-900">{row.full_name}</td>
                    <td>{row.email}</td>
                    <td>
                      <AdminStatusBadge status={predictionStatus(row.prediction_label)} />
                    </td>
                    <td>
                      {row.evaluated_schemes.length === 0 ? (
                        <span className="text-slate-500">{t.adminNotEvaluated}</span>
                      ) : (
                        <ul className="space-y-1">
                          {row.evaluated_schemes.map((scheme) => (
                            <li key={scheme.scheme_id}>
                              {scheme.scheme_name}:{" "}
                              {scheme.prediction === "eligible"
                                ? t.catalogEligibilityEligible
                                : t.catalogEligibilityNotEligible}
                            </li>
                          ))}
                        </ul>
                      )}
                      {row.incomplete_fields.length > 0 ? (
                        <p className="mt-1 text-[13px] text-slate-500">
                          {t.whyRequiredToEvaluate}: {row.incomplete_fields.join(", ")}
                        </p>
                      ) : null}
                    </td>
                    <td>
                      <Link to={`/admin/users/${row.user_id}`} className="admin-link">
                        {t.adminView}
                      </Link>
                    </td>
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
