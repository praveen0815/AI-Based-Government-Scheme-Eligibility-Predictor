import type { ReactNode } from "react";
import type { AdminActivityType, ApplicationStatus, DocumentReviewStatus } from "../../types/api";
import { useI18n } from "../../context/LanguageContext";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="admin-page-head">
      <div>
        {eyebrow ? <p className="admin-crumb">{eyebrow}</p> : null}
        <h1 className="admin-page-title">{title}</h1>
        {description ? <p className="admin-page-lead">{description}</p> : null}
        {children}
      </div>
      {actions ? <div>{actions}</div> : null}
    </header>
  );
}

export function AdminKpiCard({
  label,
  value,
  hint,
  tone = "blue",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "blue" | "green" | "amber" | "purple";
  icon?: ReactNode;
}) {
  return (
    <article className={`admin-kpi admin-kpi-${tone}`}>
      <div className="admin-kpi-top">
        <p className="admin-kpi-label">{label}</p>
        {icon ? <span className="admin-kpi-icon">{icon}</span> : null}
      </div>
      <div>
        <p className="admin-kpi-value">{value}</p>
        {hint ? <p className="admin-kpi-hint">{hint}</p> : null}
      </div>
    </article>
  );
}

export function AdminStatusBadge({
  status,
}: {
  status:
    | DocumentReviewStatus
    | ApplicationStatus
    | AdminActivityType
    | "eligible"
    | "not_eligible"
    | "cannot_fully_evaluate"
    | "not_evaluated"
    | "completed"
    | "active"
    | "submitted";
}) {
  const { t } = useI18n();
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: t.adminPending, className: "admin-badge-pending" },
    verified: { label: t.adminVerified, className: "admin-badge-verified" },
    rejected: { label: t.adminRejected, className: "admin-badge-rejected" },
    eligible: { label: t.catalogEligibilityEligible, className: "admin-badge-verified" },
    not_eligible: { label: t.catalogEligibilityNotEligible, className: "admin-badge-muted" },
    cannot_fully_evaluate: { label: t.catalogEligibilityIncomplete, className: "admin-badge-pending" },
    not_evaluated: { label: t.adminNotEvaluated, className: "admin-badge-muted" },
    not_applied: { label: t.appStatusNotApplied, className: "admin-badge-muted" },
    planning: { label: t.appStatusPlanning, className: "admin-badge-pending" },
    documents_ready: { label: t.appStatusDocumentsReady, className: "admin-badge-accent" },
    applied: { label: t.appStatusApplied, className: "admin-badge-accent" },
    under_review: { label: t.appStatusUnderReview, className: "admin-badge-pending" },
    approved: { label: t.appStatusApproved, className: "admin-badge-verified" },
    upload: { label: t.adminPending, className: "admin-badge-pending" },
    application: { label: t.adminSubmitted, className: "admin-badge-accent" },
    history: { label: t.adminCompleted, className: "admin-badge-verified" },
    wallet: { label: t.adminActiveBadge, className: "admin-badge-verified" },
    completed: { label: t.adminCompleted, className: "admin-badge-verified" },
    active: { label: t.adminActiveBadge, className: "admin-badge-verified" },
    submitted: { label: t.adminSubmitted, className: "admin-badge-accent" },
  };
  const item = map[status] ?? { label: status, className: "admin-badge-muted" };
  return <span className={`admin-badge ${item.className}`}>{item.label}</span>;
}

export function AdminPanel({
  title,
  actions,
  padded,
  children,
}: {
  title?: string;
  actions?: ReactNode;
  padded?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="admin-panel">
      {title || actions ? (
        <div className="admin-panel-head">
          {title ? <h2 className="admin-panel-title">{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      {padded ? <div className="admin-panel-body">{children}</div> : children}
    </section>
  );
}

export function sharePercent(part: number, total: number): string {
  if (total <= 0) return "0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}
