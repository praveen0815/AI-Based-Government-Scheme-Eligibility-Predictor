import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "../components/admin/adminUi";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { useI18n } from "../context/LanguageContext";
import { ApiError, fetchAdminUser, fetchAdminUsers } from "../services/api";
import type { AdminUserSummary, ApplicationItem, ApplicationStatus } from "../types/api";

type ApplicationRow = ApplicationItem & {
  owner_user_id: string;
  owner_name: string;
  owner_email: string;
};

export function AdminApplicationsPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const listed = await fetchAdminUsers();
      const details = await Promise.all(listed.users.map((user: AdminUserSummary) => fetchAdminUser(user.user_id)));
      setRows(
        details.flatMap((detail) =>
          detail.applications.map((item) => ({
            ...item,
            owner_user_id: detail.user.user_id,
            owner_name: detail.user.full_name,
            owner_email: detail.user.email,
          })),
        ),
      );
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
    () => (statusFilter === "all" ? rows : rows.filter((item) => item.status === statusFilter)),
    [rows, statusFilter],
  );

  return (
    <div className="admin-stack">
      <AdminPageHeader
        eyebrow={t.adminSectionManagement}
        title={t.navApplications}
        description={t.adminApplicationsLead}
      />
      <AdminPanel>
        <div className="admin-toolbar">
          <label className="admin-filter-label" htmlFor="admin-app-filter">
            {t.adminFilterStatus}
          </label>
          <select
            id="admin-app-filter"
            className="admin-input max-w-xs"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ApplicationStatus | "all")}
          >
            <option value="all">{t.adminFilterAll}</option>
            <option value="planning">{t.appStatusPlanning}</option>
            <option value="documents_ready">{t.appStatusDocumentsReady}</option>
            <option value="applied">{t.appStatusApplied}</option>
            <option value="under_review">{t.appStatusUnderReview}</option>
            <option value="approved">{t.appStatusApproved}</option>
            <option value="rejected">{t.appStatusRejected}</option>
          </select>
        </div>
        {loading ? <LoadingState message={t.adminLoading} /> : null}
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {!loading && visible.length === 0 ? (
          <p className="admin-empty">{t.adminApplicationsEmpty}</p>
        ) : null}
        {visible.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t.adminApplicant}</th>
                  <th>{t.adminScheme}</th>
                  <th>{t.adminDepartment}</th>
                  <th>{t.adminStatus}</th>
                  <th>{t.adminView}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr key={item.application_id}>
                    <td>
                      <div className="font-medium text-slate-900">{item.owner_name}</div>
                      <div className="text-[13px] text-slate-500">{item.owner_email}</div>
                    </td>
                    <td className="font-medium text-slate-900">{item.scheme_name}</td>
                    <td>{item.department ?? "—"}</td>
                    <td>
                      <AdminStatusBadge status={item.status} />
                    </td>
                    <td>
                      <Link to={`/admin/users/${item.owner_user_id}`} className="admin-link">
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
