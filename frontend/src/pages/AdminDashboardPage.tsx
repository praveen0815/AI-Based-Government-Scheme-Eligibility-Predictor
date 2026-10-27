import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AdminKpiCard,
  AdminPanel,
  AdminStatusBadge,
} from "../components/admin/adminUi";
import { sharePercent } from "../components/admin/sharePercent";
import { ErrorState } from "../components/ErrorState";
import {
  BellIcon,
  BrainIcon,
  ClipboardIcon,
  DocumentIcon,
  EvaluationIcon,
  InsightsIcon,
  SchemesIcon,
  SettingsIcon,
  ShieldIcon,
  UploadIcon,
  UserIcon,
} from "../components/icons";
import { LoadingState } from "../components/LoadingState";
import { useI18n } from "../context/LanguageContext";
import {
  ApiError,
  fetchAdminOverview,
  fetchAdminUser,
  fetchAdminUsers,
  fetchSchemeKnowledge,
  fetchSystemEvaluation,
} from "../services/api";
import type {
  AdminActivityType,
  AdminOverviewResponse,
  ApplicationItem,
  ApplicationStatus,
  SchemeKnowledgeListResponse,
  SystemEvaluationResponse,
} from "../types/api";

type ApplicationRow = ApplicationItem & {
  owner_user_id: string;
  owner_name: string;
  owner_email: string;
};

type LoadState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

const APPLICATION_STATUSES: ApplicationStatus[] = [
  "not_applied",
  "planning",
  "documents_ready",
  "applied",
  "under_review",
  "approved",
  "rejected",
];

function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof ApiError ? caught.message : fallback;
}

function formatActivityTime(
  iso: string,
  t: { adminMinutesAgo: (count: number) => string; adminHoursAgo: (count: number) => string },
): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 60) return t.adminMinutesAgo(Math.max(1, minutes));
  const hours = Math.round(minutes / 60);
  if (hours < 48) return t.adminHoursAgo(hours);
  return new Date(iso).toLocaleString();
}

function dayKey(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function shortDay(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) return key;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatMetric(value: number): string {
  return value.toFixed(3);
}

function TrendChart({
  points,
  label,
}: {
  points: { key: string; label: string; value: number }[];
  label: string;
}) {
  const width = 640;
  const height = 220;
  const pad = { left: 36, right: 12, top: 16, bottom: 32 };
  const max = Math.max(...points.map((point) => point.value), 1);
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const gap = 14;
  const barWidth = Math.max(8, Math.min(36, (innerWidth - gap * Math.max(points.length - 1, 0)) / Math.max(points.length, 1)));
  const peak = Math.max(...points.map((point) => point.value));

  return (
    <svg className="admin-trend-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      {[0, 0.5, 1].map((tick) => {
        const y = pad.top + innerHeight * (1 - tick);
        const tickValue = Math.round(max * tick);
        return (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="#eceae6" />
            <text x={pad.left - 8} y={y + 4} textAnchor="end" fill="#9aa3ab" fontSize="11">
              {tickValue}
            </text>
          </g>
        );
      })}
      {points.map((point, index) => {
        const barHeight = (point.value / max) * innerHeight;
        const x = pad.left + index * (barWidth + gap);
        const y = pad.top + innerHeight - barHeight;
        return (
          <g key={point.key}>
            <rect
              className={`admin-trend-bar ${point.value === peak ? "admin-trend-bar-peak" : ""}`}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, point.value > 0 ? 4 : 0)}
              rx="5"
            />
            <text x={x + barWidth / 2} y={height - 8} textAnchor="middle" fill="#6b7280" fontSize="11">
              {point.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function StatusDonut({
  segments,
  label,
}: {
  segments: { key: string; label: string; value: number; color: string }[];
  label: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let consumed = 0;
  const largest = [...segments].sort((left, right) => right.value - left.value)[0];
  const center = total > 0 && largest ? sharePercent(largest.value, total) : "0%";

  return (
    <div className="admin-donut-wrap">
      <svg className="admin-donut" viewBox="0 0 120 120" role="img" aria-label={label}>
        <g transform="rotate(-90 60 60)">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#eef1f4" strokeWidth="14" />
          {total > 0
            ? segments.map((segment) => {
                const length = (segment.value / total) * circumference;
                const dash = `${length} ${circumference - length}`;
                const offset = -consumed;
                consumed += length;
                if (segment.value <= 0) return null;
                return (
                  <circle
                    key={segment.key}
                    cx="60"
                    cy="60"
                    r={radius}
                    className="admin-donut-segment"
                    fill="none"
                    stroke={segment.color}
                    strokeWidth="14"
                    strokeDasharray={dash}
                    strokeDashoffset={offset}
                  />
                );
              })
            : null}
        </g>
        <text className="admin-donut-center" x="60" y="64" textAnchor="middle" fontSize="16" fontWeight="700">
          {center}
        </text>
      </svg>
      <ul className="admin-donut-legend">
        {segments.map((segment) => (
          <li key={segment.key}>
            <span className="admin-legend-dot" style={{ background: segment.color }} />
            <span>{segment.label}</span>
            <strong>{segment.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AdminDashboardPage() {
  const { t } = useI18n();
  const requestId = useRef(0);
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [catalogState, setCatalogState] = useState<LoadState<SchemeKnowledgeListResponse>>({ status: "loading" });
  const [applicationState, setApplicationState] = useState<LoadState<ApplicationRow[]>>({ status: "loading" });
  const [systemState, setSystemState] = useState<LoadState<SystemEvaluationResponse>>({ status: "loading" });
  const [appQuery, setAppQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");

  async function load() {
    const token = ++requestId.current;
    setOverviewLoading(true);
    setOverviewError(null);
    setCatalogState({ status: "loading" });
    setApplicationState({ status: "loading" });
    setSystemState({ status: "loading" });

    const overviewPromise = fetchAdminOverview();
    const catalogPromise = fetchSchemeKnowledge();
    const applicationsPromise = (async () => {
      const listed = await fetchAdminUsers();
      const details = await Promise.all(listed.users.map((user) => fetchAdminUser(user.user_id)));
      return details.flatMap((detail) =>
        detail.applications.map((item) => ({
          ...item,
          owner_user_id: detail.user.user_id,
          owner_name: detail.user.full_name,
          owner_email: detail.user.email,
        })),
      );
    })();
    const systemPromise = fetchSystemEvaluation();

    try {
      const overview = await overviewPromise;
      if (token !== requestId.current) return;
      setData(overview);
    } catch (caught) {
      if (token !== requestId.current) return;
      setData(null);
      setOverviewError(errorMessage(caught, t.networkError));
    } finally {
      if (token === requestId.current) setOverviewLoading(false);
    }

    try {
      const catalog = await catalogPromise;
      if (token !== requestId.current) return;
      setCatalogState({ status: "ready", data: catalog });
    } catch (caught) {
      if (token !== requestId.current) return;
      setCatalogState({ status: "error", message: errorMessage(caught, t.networkError) });
    }

    try {
      const applications = await applicationsPromise;
      if (token !== requestId.current) return;
      setApplicationState({ status: "ready", data: applications });
    } catch (caught) {
      if (token !== requestId.current) return;
      setApplicationState({ status: "error", message: errorMessage(caught, t.networkError) });
    }

    try {
      const system = await systemPromise;
      if (token !== requestId.current) return;
      setSystemState({ status: "ready", data: system });
    } catch (caught) {
      if (token !== requestId.current) return;
      setSystemState({ status: "error", message: errorMessage(caught, t.networkError) });
    }
  }

  useEffect(() => {
    void load();
    return () => {
      requestId.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const applications = useMemo(
    () => (applicationState.status === "ready" ? applicationState.data : []),
    [applicationState],
  );
  const schemeCount = catalogState.status === "ready" ? catalogState.data.total_catalog_count || catalogState.data.scheme_count : null;
  const evaluationTotal = data ? data.eligible_scheme_results + data.not_eligible_scheme_results : 0;
  const documentTotal = data?.total_document_uploads ?? 0;

  const categories = useMemo(() => {
    if (catalogState.status !== "ready") return [];
    const counts = new Map<string, number>();
    for (const scheme of catalogState.data.schemes) {
      const label = scheme.scheme_category?.trim() || t.adminUncategorized;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  }, [catalogState, t.adminUncategorized]);

  const trend = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of applications) {
      const key = dayKey(row.updated_at || row.created_at);
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-8)
      .map(([key, value]) => ({ key, label: shortDay(key), value }));
  }, [applications]);

  const visibleApplications = useMemo(() => {
    const needle = appQuery.trim().toLowerCase();
    const filtered = applications.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!needle) return true;
      return [item.owner_name, item.owner_email, item.scheme_name, item.department, item.scheme_id].some((value) =>
        (value ?? "").toLowerCase().includes(needle),
      );
    });
    const sorted = [...filtered].sort((left, right) => right.updated_at.localeCompare(left.updated_at));
    if (needle || statusFilter !== "all") return sorted;
    return sorted.slice(0, 8);
  }, [applications, appQuery, statusFilter]);

  const selectedModel =
    systemState.status === "ready"
      ? systemState.data.models.find((model) => model.selected) ?? systemState.data.models[0]
      : undefined;
  const unverifiedSchemes =
    catalogState.status === "ready"
      ? catalogState.data.schemes.filter((scheme) => {
          const status = (scheme.catalog_rule_status ?? "").toUpperCase();
          return status.length > 0 && status !== "VERIFIED" && status !== "FULLY_VERIFIED";
        }).length
      : 0;
  const alerts = data
    ? [
        data.pending_document_reviews > 0
          ? { tone: "warn" as const, text: t.adminKpiPendingHint(data.pending_document_reviews), href: "/admin/documents" }
          : null,
        data.cannot_fully_evaluate_users > 0
          ? { tone: "info" as const, text: t.adminKpiIncompleteProfiles(data.cannot_fully_evaluate_users), href: "/admin/eligibility" }
          : null,
        data.rejected_documents > 0
          ? { tone: "danger" as const, text: `${t.adminRejectedDocuments}: ${data.rejected_documents}`, href: "/admin/documents" }
          : null,
        unverifiedSchemes > 0
          ? { tone: "warn" as const, text: t.adminAlertUnverifiedSchemes(unverifiedSchemes), href: "/admin/schemes" }
          : null,
      ].filter((item): item is { tone: "warn" | "info" | "danger"; text: string; href: string } => item !== null)
    : [];

  const quickActions = [
    { to: "/admin/users", label: t.adminUsers, icon: <UserIcon /> },
    { to: "/admin/applications", label: t.navApplications, icon: <ClipboardIcon /> },
    { to: "/admin/documents", label: t.adminDocumentVerification, icon: <DocumentIcon /> },
    { to: "/admin/schemes", label: t.adminSchemeManagement, icon: <SchemesIcon /> },
    { to: "/admin/eligibility", label: t.adminEligibilityMonitoring, icon: <EvaluationIcon /> },
    { to: "/admin/evaluation", label: t.adminSchemeEvaluation, icon: <BrainIcon /> },
    { to: "/admin/research-dashboard", label: t.navResearchDashboard, icon: <InsightsIcon /> },
    { to: "/admin/system-evaluation", label: t.navSystemEvaluation, icon: <ShieldIcon /> },
    { to: "/admin/uploads", label: t.navUploads, icon: <UploadIcon /> },
    { to: "/admin/notifications", label: t.navNotifications, icon: <BellIcon /> },
    { to: "/admin/settings", label: t.navSettings, icon: <SettingsIcon /> },
  ];

  const statusLabel: Record<ApplicationStatus, string> = {
    not_applied: t.appStatusNotApplied,
    planning: t.appStatusPlanning,
    documents_ready: t.appStatusDocumentsReady,
    applied: t.appStatusApplied,
    under_review: t.appStatusUnderReview,
    approved: t.appStatusApproved,
    rejected: t.appStatusRejected,
  };

  return (
    <div className="admin-stack admin-dash">
      <header className="admin-dash-head">
        <div>
          <h1 className="admin-dash-title">{t.adminTitle}</h1>
          <p className="admin-page-lead">{t.adminLead}</p>
        </div>
      </header>
      {overviewLoading ? <LoadingState message={t.adminLoading} /> : null}
      {overviewError ? <ErrorState message={overviewError} onRetry={() => void load()} /> : null}
      {data ? (
        <>
          <aside className="admin-preliminary" role="note">
            <p className="admin-preliminary-title">{t.adminPreliminaryNotice}</p>
            <p>{data.disclaimer}</p>
          </aside>

          <section className="admin-kpi-grid" aria-label={t.adminOverview}>
            <AdminKpiCard
              label={t.adminTotalUsers}
              value={String(data.total_users)}
              chip={t.adminKpiActiveUsers(data.active_users)}
              footer={t.adminUsers}
              tone="mint"
              icon={<UserIcon />}
            />
            <AdminKpiCard
              label={t.adminTotalApplications}
              value={
                applicationState.status === "ready"
                  ? String(applicationState.data.length)
                  : applicationState.status === "error"
                    ? "—"
                    : "…"
              }
              chip={applicationState.status === "loading" ? t.adminLoading : undefined}
              footer={applicationState.status === "error" ? applicationState.message : t.navApplications}
              tone="sky"
              icon={<ClipboardIcon />}
            />
            <AdminKpiCard
              label={t.adminDocuments}
              value={String(data.total_document_uploads)}
              chip={t.adminKpiPendingHint(data.pending_document_reviews)}
              footer={t.adminTotalUploads}
              tone="gold"
              icon={<DocumentIcon />}
            />
            <AdminKpiCard
              label={t.adminTotalSchemes}
              value={schemeCount == null ? (catalogState.status === "loading" ? "…" : "—") : String(schemeCount)}
              chip={catalogState.status === "error" ? catalogState.message : t.adminKpiCatalogSchemes}
              footer={t.adminNavSchemes}
              tone="violet"
              icon={<SchemesIcon />}
            />
            <AdminKpiCard
              label={t.adminEligibilityEvaluations}
              value={String(evaluationTotal)}
              chip={evaluationTotal > 0 ? sharePercent(data.eligible_scheme_results, evaluationTotal) : undefined}
              footer={t.adminEvaluationHint(data.eligible_scheme_results, data.not_eligible_scheme_results)}
              tone="mint"
              icon={<EvaluationIcon />}
            />
            <AdminKpiCard
              label={t.adminPendingReviews}
              value={String(data.pending_document_reviews)}
              chip={data.pending_document_reviews === 0 ? t.adminKpiNoPending : t.adminPending}
              footer={t.adminDocumentVerification}
              tone="sky"
              icon={<DocumentIcon />}
            />
            <AdminKpiCard
              label={t.adminVerifiedDocuments}
              value={String(data.verified_documents)}
              chip={sharePercent(data.verified_documents, documentTotal)}
              footer={t.adminVerified}
              tone="gold"
              icon={<ShieldIcon />}
            />
            <AdminKpiCard
              label={t.adminRejectedDocuments}
              value={String(data.rejected_documents)}
              chip={sharePercent(data.rejected_documents, documentTotal)}
              footer={t.adminRejected}
              tone="violet"
              icon={<ClipboardIcon />}
            />
          </section>

          <AdminPanel title={t.adminAlertsTitle} padded>
            {alerts.length === 0 ? <p className="admin-empty">{t.adminAlertNoIssues}</p> : null}
            {alerts.length > 0 ? (
              <ul className="admin-alerts">
                {alerts.map((alert) => (
                  <li key={alert.text}>
                    <Link to={alert.href} className={`admin-alert admin-alert-${alert.tone}`}>
                      <span className="admin-alert-dot" aria-hidden="true" />
                      <span className="admin-alert-text">{alert.text}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </AdminPanel>

          <section className="admin-chart-row" aria-label={t.adminApplicationTrends}>
            <AdminPanel title={t.adminApplicationTrends} padded actions={<Link to="/admin/applications" className="admin-link">{t.adminViewAll}</Link>}>
              <p className="admin-chart-legend">
                <span className="admin-legend-dot" style={{ background: "#3b82f6" }} />
                {t.navApplications}
              </p>
              {applicationState.status === "loading" ? <LoadingState message={t.adminLoading} /> : null}
              {applicationState.status === "error" ? (
                <ErrorState message={applicationState.message} onRetry={() => void load()} />
              ) : null}
              {applicationState.status === "ready" && trend.length === 0 ? (
                <p className="admin-empty">{t.adminChartEmpty}</p>
              ) : null}
              {applicationState.status === "ready" && trend.length > 0 ? (
                <TrendChart points={trend} label={t.adminApplicationTrends} />
              ) : null}
            </AdminPanel>
            <AdminPanel title={t.adminDocumentStatus} padded actions={<Link to="/admin/documents" className="admin-link">{t.adminViewAll}</Link>}>
              <StatusDonut
                label={t.adminDocumentStatus}
                segments={[
                  { key: "verified", label: t.adminVerified, value: data.verified_documents, color: "#14b8a6" },
                  { key: "pending", label: t.adminPending, value: data.pending_document_reviews, color: "#3b82f6" },
                  { key: "rejected", label: t.adminRejected, value: data.rejected_documents, color: "#f5c542" },
                ]}
              />
            </AdminPanel>
          </section>

          <section className="admin-analytics-grid">
            <AdminPanel title={t.adminSchemeCategories} padded actions={<Link to="/admin/schemes" className="admin-link">{t.adminViewAll}</Link>}>
              {catalogState.status === "loading" ? <LoadingState message={t.adminLoading} /> : null}
              {catalogState.status === "error" ? (
                <ErrorState message={catalogState.message} onRetry={() => void load()} />
              ) : null}
              {catalogState.status === "ready" && categories.length === 0 ? (
                <p className="admin-empty">{t.adminChartEmpty}</p>
              ) : null}
              {categories.map((row) => {
                const total = categories.reduce((sum, item) => sum + item.value, 0);
                const width = total > 0 ? Math.round((row.value / total) * 100) : 0;
                return (
                  <div key={row.label} className="admin-meter-row">
                    <div className="admin-meter-copy">
                      <span>{row.label}</span>
                      <strong>
                        {row.value} · {sharePercent(row.value, total)}
                      </strong>
                    </div>
                    <div className="admin-meter-track" aria-hidden="true">
                      <span className="admin-meter-fill admin-bar-accent" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </AdminPanel>
            <AdminPanel
              title={t.adminEligibilityDistribution}
              padded
              actions={<Link to="/admin/eligibility" className="admin-link">{t.adminViewAll}</Link>}
            >
              {evaluationTotal === 0 ? <p className="admin-empty">{t.adminChartEmpty}</p> : null}
              {[
                { label: t.catalogEligibilityEligible, value: data.eligible_scheme_results, tone: "ok" },
                { label: t.catalogEligibilityNotEligible, value: data.not_eligible_scheme_results, tone: "danger" },
              ].map((row) => {
                const width = evaluationTotal > 0 ? Math.round((row.value / evaluationTotal) * 100) : 0;
                return (
                  <div key={row.label} className="admin-meter-row">
                    <div className="admin-meter-copy">
                      <span>{row.label}</span>
                      <strong>
                        {row.value} · {sharePercent(row.value, evaluationTotal)}
                      </strong>
                    </div>
                    <div className="admin-meter-track" aria-hidden="true">
                      <span className={`admin-meter-fill admin-bar-${row.tone}`} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
              <p className="admin-meta admin-meter-note">{t.adminKpiIncompleteProfiles(data.cannot_fully_evaluate_users)}</p>
            </AdminPanel>
          </section>

          <AdminPanel
            title={t.adminRecentApplications}
            actions={
              <Link to="/admin/applications" className="admin-link">
                {t.adminViewAll}
              </Link>
            }
          >
            <div className="admin-toolbar">
              <label className="sr-only" htmlFor="admin-dashboard-app-search">
                {t.adminSearchApplications}
              </label>
              <input
                id="admin-dashboard-app-search"
                className="admin-input min-w-[220px] flex-1"
                value={appQuery}
                onChange={(event) => setAppQuery(event.target.value)}
                placeholder={t.adminSearchApplications}
              />
              <label className="admin-filter-label" htmlFor="admin-dashboard-app-filter">
                {t.adminFilterStatus}
              </label>
              <select
                id="admin-dashboard-app-filter"
                className="admin-input max-w-xs"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as ApplicationStatus | "all")}
              >
                <option value="all">{t.adminFilterAll}</option>
                {APPLICATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel[status]}
                  </option>
                ))}
              </select>
            </div>
            {applicationState.status === "loading" ? <LoadingState message={t.adminLoading} /> : null}
            {applicationState.status === "error" ? (
              <ErrorState message={applicationState.message} onRetry={() => void load()} />
            ) : null}
            {applicationState.status === "ready" && visibleApplications.length === 0 ? (
              <p className="admin-empty">
                {applications.length === 0 ? t.adminApplicationsEmpty : t.adminApplicationsNoMatch}
              </p>
            ) : null}
            {visibleApplications.length > 0 ? (
              <div className="admin-table-wrap">
                <table className="admin-table" aria-label={t.adminRecentApplications}>
                  <thead>
                    <tr>
                      <th scope="col">{t.adminApplicant}</th>
                      <th scope="col">{t.adminScheme}</th>
                      <th scope="col">{t.adminDepartment}</th>
                      <th scope="col">{t.adminFilterStatus}</th>
                      <th scope="col">{t.adminLastActivity}</th>
                      <th scope="col">{t.adminView}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleApplications.map((item) => (
                      <tr key={item.application_id}>
                        <td>
                          <div className="font-semibold">{item.owner_name}</div>
                          <div className="admin-meta">{item.owner_email}</div>
                        </td>
                        <td className="font-semibold">{item.scheme_name}</td>
                        <td>{item.department ?? "—"}</td>
                        <td>
                          <AdminStatusBadge status={item.status} />
                        </td>
                        <td>
                          <time dateTime={item.updated_at}>{formatActivityTime(item.updated_at, t)}</time>
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

          <section className="admin-analytics-grid">
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
                    <li key={`${item.activity_type}-${item.user_id}-${item.occurred_at}-${item.summary}`} className="admin-audit-card">
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
            <AdminPanel title={t.adminQuickActions} padded>
              <ul className="admin-quick admin-quick-grid">
                {quickActions.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="admin-quick-link"
                      aria-label={`${t.adminQuickActions}: ${item.label}`}
                    >
                      <span className="admin-quick-icon" aria-hidden="true">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </AdminPanel>
          </section>

          <section className="admin-analytics-grid">
            <AdminPanel
              title={t.adminModelSummary}
              padded
              actions={
                <Link to="/admin/evaluation" className="admin-link">
                  {t.adminSchemeEvaluation}
                </Link>
              }
            >
              {systemState.status === "loading" ? <LoadingState message={t.adminLoading} /> : null}
              {systemState.status === "error" ? (
                <ErrorState message={systemState.message} onRetry={() => void load()} />
              ) : null}
              {systemState.status === "ready" && !selectedModel ? <p className="admin-empty">{t.adminChartEmpty}</p> : null}
              {systemState.status === "ready" && selectedModel ? (
                <div className="admin-health-list">
                  <div className="admin-health-row">
                    <span>{t.selectedModel}</span>
                    <strong>{systemState.data.dataset.selected_model || selectedModel.model}</strong>
                  </div>
                  <div className="admin-health-row">
                    <span>{t.accuracy}</span>
                    <strong>{formatMetric(selectedModel.accuracy)}</strong>
                  </div>
                  <div className="admin-health-row">
                    <span>{t.precision}</span>
                    <strong>{formatMetric(selectedModel.precision)}</strong>
                  </div>
                  <div className="admin-health-row">
                    <span>{t.recall}</span>
                    <strong>{formatMetric(selectedModel.recall)}</strong>
                  </div>
                  <div className="admin-health-row">
                    <span>{t.f1}</span>
                    <strong>{formatMetric(selectedModel.f1)}</strong>
                  </div>
                  <div className="admin-health-row">
                    <span>{t.agreementPercentage}</span>
                    <strong>{systemState.data.hybrid.agreement_percentage.toFixed(1)}%</strong>
                  </div>
                  <p className="admin-meta">{systemState.data.prototype_notice}</p>
                  <p className="admin-meta">{systemState.data.ml_metrics_note}</p>
                </div>
              ) : null}
            </AdminPanel>
            <AdminPanel
              title={t.systemEvalHealthHeading}
              padded
              actions={
                <Link to="/admin/system-evaluation" className="admin-link">
                  {t.adminViewAll}
                </Link>
              }
            >
              {systemState.status === "loading" ? <LoadingState message={t.adminLoading} /> : null}
              {systemState.status === "error" ? (
                <ErrorState message={systemState.message} onRetry={() => void load()} />
              ) : null}
              {systemState.status === "ready" ? (
                <div className="admin-health-list">
                  <div className="admin-health-row">
                    <span>{t.systemEvalHealthStatus}</span>
                    <strong>{systemState.data.health.status}</strong>
                  </div>
                  <div className="admin-health-row">
                    <span>{t.systemEvalHealthDatabase}</span>
                    <strong>{systemState.data.health.database}</strong>
                  </div>
                  <div className="admin-health-row">
                    <span>{t.systemEvalHealthEnvironment}</span>
                    <strong>{systemState.data.health.environment}</strong>
                  </div>
                  <div className="admin-health-row">
                    <span>{t.systemEvalHealthModel}</span>
                    <strong>{systemState.data.health.model_loaded ? t.yes : t.no}</strong>
                  </div>
                  <div className="admin-health-row">
                    <span>{t.systemEvalHealthEvaluation}</span>
                    <strong>{systemState.data.health.evaluation_ready ? t.systemEvalReady : t.systemEvalNotReady}</strong>
                  </div>
                  <p className="admin-meta">{systemState.data.api_metrics_note}</p>
                </div>
              ) : null}
            </AdminPanel>
          </section>
        </>
      ) : null}
    </div>
  );
}
