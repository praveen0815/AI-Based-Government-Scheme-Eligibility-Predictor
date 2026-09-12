import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminKpiCard, AdminPageHeader, AdminPanel, AdminStatusBadge, sharePercent } from "../components/admin/adminUi";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { useI18n } from "../context/LanguageContext";
import { ClipboardIcon, DocumentIcon, SchemesIcon, UserIcon } from "../components/icons";
import { ApiError, fetchAdminOverview, fetchSchemeCatalog } from "../services/api";
import type { AdminActivityType, AdminOverviewResponse } from "../types/api";

function formatActivityTime(
  iso: string,
  t: { adminMinutesAgo: (count: number) => string; adminHoursAgo: (count: number) => string },
): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 60) return t.adminMinutesAgo(Math.max(1, minutes));
  return t.adminHoursAgo(Math.round(minutes / 60));
}

export function AdminDashboardPage() {
  const { t } = useI18n();
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [schemeCount, setSchemeCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [overview, catalog] = await Promise.all([
        fetchAdminOverview(),
        fetchSchemeCatalog().catch(() => null),
      ]);
      setData(overview);
      setSchemeCount(catalog ? catalog.total_catalog_count || catalog.scheme_count : null);
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

  const eligibilityTotal = data
    ? data.eligible_scheme_results + data.not_eligible_scheme_results + data.cannot_fully_evaluate_users
    : 0;
  const documentTotal = data?.total_document_uploads ?? 0;

  return (
    <div className="admin-stack">
      <AdminPageHeader
        eyebrow={`${t.adminConsole} › ${t.adminOverviewNav}`}
        title={t.adminTitle}
        description={t.adminLead}
        actions={<span className="admin-range">{t.adminLast7Days}</span>}
      />
      {loading ? <LoadingState message={t.adminLoading} /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {data ? (
        <>
          <p className="admin-note" role="note">
            {data.disclaimer}
          </p>
          <section className="admin-kpi-grid" aria-label={t.adminUsers}>
            <AdminKpiCard
              label={t.adminTotalUsers}
              value={String(data.total_users)}
              hint={t.adminKpiActiveUsers(data.active_users)}
              tone="blue"
              icon={<UserIcon />}
            />
            <AdminKpiCard
              label={t.adminTotalUploads}
              value={String(data.total_document_uploads)}
              hint={t.adminKpiPendingHint(data.pending_document_reviews)}
              tone="green"
              icon={<ClipboardIcon />}
            />
            <AdminKpiCard
              label={t.adminPendingReviews}
              value={String(data.pending_document_reviews)}
              hint={data.pending_document_reviews === 0 ? t.adminKpiNoPending : t.adminKpiPendingHint(data.pending_document_reviews)}
              tone="amber"
              icon={<DocumentIcon />}
            />
            <AdminKpiCard
              label={t.adminTotalSchemes}
              value={String(schemeCount ?? data.eligible_scheme_results)}
              hint={schemeCount != null ? t.adminKpiCatalogSchemes : t.catalogEligibleFilter}
              tone="purple"
              icon={<SchemesIcon />}
            />
          </section>
          <section className="admin-analytics-grid" aria-label={t.adminSectionAnalytics}>
            <AdminPanel title={t.adminEligibilityDistribution} padded>
              <div className="admin-stat-row">
                <p className="admin-stat-label">
                  <span className="admin-stat-dot" style={{ background: "#059669" }} />
                  {t.catalogEligibilityEligible}
                </p>
                <p className="admin-stat-value">{data.eligible_scheme_results}</p>
                <p className="admin-stat-share">{sharePercent(data.eligible_scheme_results, eligibilityTotal)}</p>
              </div>
              <div className="admin-stat-row">
                <p className="admin-stat-label">
                  <span className="admin-stat-dot" style={{ background: "#dc2626" }} />
                  {t.catalogEligibilityNotEligible}
                </p>
                <p className="admin-stat-value">{data.not_eligible_scheme_results}</p>
                <p className="admin-stat-share">{sharePercent(data.not_eligible_scheme_results, eligibilityTotal)}</p>
              </div>
              <div className="admin-stat-row">
                <p className="admin-stat-label">
                  <span className="admin-stat-dot" style={{ background: "#d97706" }} />
                  {t.catalogEligibilityIncomplete}
                </p>
                <p className="admin-stat-value">{data.cannot_fully_evaluate_users}</p>
                <p className="admin-stat-share">{sharePercent(data.cannot_fully_evaluate_users, eligibilityTotal)}</p>
              </div>
            </AdminPanel>
            <AdminPanel title={t.adminDocumentStatus} padded>
              <div className="admin-stat-row">
                <p className="admin-stat-label">
                  <span className="admin-stat-dot" style={{ background: "#2563eb" }} />
                  {t.adminUploaded}
                </p>
                <p className="admin-stat-value">{data.total_document_uploads}</p>
                <p className="admin-stat-share">{documentTotal > 0 ? "100%" : "0%"}</p>
              </div>
              <div className="admin-stat-row">
                <p className="admin-stat-label">
                  <span className="admin-stat-dot" style={{ background: "#059669" }} />
                  {t.adminVerified}
                </p>
                <p className="admin-stat-value">{data.verified_documents}</p>
                <p className="admin-stat-share">{sharePercent(data.verified_documents, documentTotal)}</p>
              </div>
              <div className="admin-stat-row">
                <p className="admin-stat-label">
                  <span className="admin-stat-dot" style={{ background: "#dc2626" }} />
                  {t.adminRejected}
                </p>
                <p className="admin-stat-value">{data.rejected_documents}</p>
                <p className="admin-stat-share">{sharePercent(data.rejected_documents, documentTotal)}</p>
              </div>
            </AdminPanel>
          </section>
          <AdminPanel
            title={t.adminActivity}
            actions={
              <Link to="/admin/users" className="admin-link">
                {t.adminViewAll}
              </Link>
            }
          >
            {data.recent_activity.length === 0 ? (
              <p className="admin-empty">{t.adminActivityEmpty}</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table admin-table-activity">
                  <thead>
                    <tr>
                      <th>{t.adminActivity}</th>
                      <th>{t.adminName}</th>
                      <th>{t.adminEmail}</th>
                      <th>{t.adminTime}</th>
                      <th>{t.adminFilterStatus}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_activity.map((item) => (
                      <tr key={`${item.activity_type}-${item.user_id}-${item.occurred_at}`}>
                        <td className="font-medium text-slate-900">{item.summary}</td>
                        <td>{item.user_name}</td>
                        <td>{item.user_email}</td>
                        <td>{formatActivityTime(item.occurred_at, t)}</td>
                        <td>
                          <AdminStatusBadge status={item.activity_type as AdminActivityType} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminPanel>
        </>
      ) : null}
    </div>
  );
}
