import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AdminKpiCard,
  AdminPageHeader,
  AdminPanel,
  AdminStatusBadge,
} from "../components/admin/adminUi";
import { sharePercent } from "../components/admin/sharePercent";
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
              tone="teal"
              icon={<SchemesIcon />}
            />
          </section>
          <section className="admin-ops" aria-label={t.adminSectionManagement}>
            <AdminPanel title={t.adminSectionManagement} padded>
              <ul className="admin-quick">
                {[
                  { to: "/admin/users", label: t.adminUsers, icon: <UserIcon /> },
                  { to: "/admin/documents", label: t.adminDocumentVerification, icon: <DocumentIcon /> },
                  { to: "/admin/applications", label: t.navApplications, icon: <ClipboardIcon /> },
                  { to: "/admin/schemes", label: t.adminSchemeManagement, icon: <SchemesIcon /> },
                  { to: "/admin/eligibility", label: t.adminEligibilityMonitoring, icon: <ClipboardIcon /> },
                ].map((item) => (
                  <li key={item.to}>
                    <Link to={item.to} className="admin-quick-link" aria-label={`${t.adminViewAll}: ${item.label}`}>
                      <span className="admin-quick-icon" aria-hidden="true">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </AdminPanel>
            <AdminPanel title={t.adminEligibilityDistribution} padded actions={<Link to="/admin/eligibility" className="admin-link">{t.adminViewAll}</Link>}>
              <div className="admin-bars" role="img" aria-label={t.adminEligibilityDistribution}>
                {[
                  { key: "eligible", label: t.catalogEligibilityEligible, value: data.eligible_scheme_results, tone: "ok" },
                  { key: "not", label: t.catalogEligibilityNotEligible, value: data.not_eligible_scheme_results, tone: "danger" },
                  { key: "partial", label: t.catalogEligibilityIncomplete, value: data.cannot_fully_evaluate_users, tone: "pending" },
                ].map((bar) => {
                  const height = eligibilityTotal > 0 ? Math.max(8, Math.round((bar.value / eligibilityTotal) * 100)) : 8;
                  return (
                    <div key={bar.key} className="admin-bar">
                      <span className="admin-bar-value">{bar.value}</span>
                      <span className={`admin-bar-fill admin-bar-${bar.tone}`} style={{ height: `${height}%` }} />
                      <span className="admin-bar-label">{bar.label}</span>
                      <span className="admin-bar-share">{sharePercent(bar.value, eligibilityTotal)}</span>
                    </div>
                  );
                })}
              </div>
            </AdminPanel>
            <AdminPanel title={t.adminDocumentStatus} padded actions={<Link to="/admin/documents" className="admin-link">{t.adminViewAll}</Link>}>
              {[
                { label: t.adminPending, value: data.pending_document_reviews, tone: "pending" },
                { label: t.adminVerified, value: data.verified_documents, tone: "ok" },
                { label: t.adminRejected, value: data.rejected_documents, tone: "danger" },
              ].map((row) => {
                const width = documentTotal > 0 ? Math.round((row.value / documentTotal) * 100) : 0;
                return (
                  <div key={row.label} className="admin-meter-row">
                    <div className="admin-meter-copy">
                      <span>{row.label}</span>
                      <strong>{row.value} · {sharePercent(row.value, documentTotal)}</strong>
                    </div>
                    <div className="admin-meter-track" aria-hidden="true">
                      <span className={`admin-meter-fill admin-bar-${row.tone}`} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </AdminPanel>
          </section>
          <AdminPanel
            title={t.navApplications}
            actions={
              <Link to="/admin/applications" className="admin-link">
                {t.adminViewAll}
              </Link>
            }
          >
            {data.recent_activity.filter((item) => item.activity_type === "application").length === 0 ? (
              <p className="admin-empty">{t.adminApplicationsEmpty}</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t.adminActivity}</th>
                      <th>{t.adminName}</th>
                      <th>{t.adminFilterStatus}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_activity
                      .filter((item) => item.activity_type === "application")
                      .map((item) => (
                        <tr key={`${item.user_id}-${item.occurred_at}-${item.summary}`}>
                          <td>{item.summary}</td>
                          <td>{item.user_name}</td>
                          <td>
                            <AdminStatusBadge status={item.activity_type} />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminPanel>
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
              <ul className="admin-audit">
                {data.recent_activity.map((item) => (
                  <li key={`${item.activity_type}-${item.user_id}-${item.occurred_at}`} className="admin-audit-card">
                    <div className="admin-audit-top">
                      <AdminStatusBadge status={item.activity_type as AdminActivityType} />
                      <time dateTime={item.occurred_at}>{formatActivityTime(item.occurred_at, t)}</time>
                    </div>
                    <p className="admin-audit-title">{item.summary}</p>
                    <p className="admin-audit-meta">{item.user_name}</p>
                    <p className="admin-audit-meta">{item.user_email}</p>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
        </>
      ) : null}
    </div>
  );
}
