import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ErrorState } from "../components/ErrorState";
import {
  BellIcon,
  BrainIcon,
  CheckIcon,
  DocumentIcon,
  EvaluationIcon,
  HistoryIcon,
  InsightsIcon,
  ReadinessIcon,
  SchemesIcon,
  WalletIcon,
} from "../components/icons";
import { LoadingState } from "../components/LoadingState";
import { ProfileCompletenessCard } from "../components/ProfileCompletenessCard";
import { SchemeCard } from "../components/SchemeCard";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/LanguageContext";
import type { Messages } from "../i18n/types";
import { useRecommendation } from "../context/RecommendationContext";
import {
  ApiError,
  downloadRecommendationReport,
  fetchCurrentUser,
  fetchDashboardOverview,
  fetchNotifications,
  fetchSupportingUploads,
  fetchDocumentProgress,
  fetchEligibilityInsights,
  fetchReadinessProgress,
  fetchProfileCompleteness,
  fetchRecommendationHistory,
  getMyWallet,
} from "../services/api";
import type {
  AuthUser,
  CitizenWallet,
  DashboardActivityItem,
  DashboardJourneyKey,
  DashboardJourneyStatus,
  DashboardOverviewResponse,
  DocumentProgressResponse,
  HistorySchemeRef,
  InsightsResponse,
  NotificationItem,
  ProfileCompleteness,
  ReadinessProgressResponse,
  SupportingUploadListResponse,
  RecommendationHistoryItem,
  RecommendedScheme,
} from "../types/api";
import { formatCheckedAt } from "../utils/displayLabels";
import { notificationCategory, notificationMessage, notificationTitle } from "../utils/notificationCopy";

type Translate = Messages;

function journeyLabel(key: DashboardJourneyKey, t: Translate): string {
  if (key === "profile_created") return t.dashboardJourneyProfileCreated;
  if (key === "profile_completed") return t.dashboardJourneyProfileCompleted;
  if (key === "eligibility_checked") return t.dashboardJourneyEligibilityChecked;
  if (key === "schemes_recommended") return t.dashboardJourneySchemesRecommended;
  if (key === "documents_prepared") return t.dashboardJourneyDocumentsPrepared;
  return t.dashboardJourneyReadiness;
}

function journeyStatusLabel(status: DashboardJourneyStatus, t: Translate): string {
  if (status === "completed") return t.dashboardJourneyCompleted;
  if (status === "current") return t.dashboardJourneyCurrent;
  return t.dashboardJourneyPending;
}

function activityDescription(item: DashboardActivityItem, t: Translate): string {
  if (item.kind === "document") {
    return t.dashboardActivityDocument(item.scheme_name || item.scheme_id || "");
  }
  if (item.kind === "readiness") {
    return t.dashboardActivityReadiness(item.scheme_name || item.scheme_id || "");
  }
  return t.dashboardActivityRecommendation(item.recommendation_count ?? 0);
}

function activityHref(item: DashboardActivityItem): string {
  if (item.kind === "document") return "/documents";
  if (item.kind === "readiness") return "/readiness";
  return item.history_id ? `/history/${item.history_id}` : "/history";
}

function deriveOverview(
  wallet: CitizenWallet | null,
  completeness: ProfileCompleteness | null,
  history: RecommendationHistoryItem[],
  documents: DocumentProgressResponse | null,
  readiness: ReadinessProgressResponse | null,
): DashboardOverviewResponse {
  const recommended = new Set(history.flatMap((item) => item.recommended_scheme_ids));
  const completenessPercent = wallet ? (completeness?.percentage ?? 0) : 0;
  const docPercent = documents?.overall_progress_percent ?? 0;
  const readinessPercent = readiness?.overall_progress_percent ?? 0;
  const flags = [
    Boolean(wallet),
    completenessPercent === 100,
    history.length > 0,
    recommended.size > 0,
    (documents?.schemes_with_progress ?? 0) > 0,
    (readiness?.schemes_being_prepared ?? 0) > 0,
  ];
  const keys: DashboardJourneyKey[] = [
    "profile_created",
    "profile_completed",
    "eligibility_checked",
    "schemes_recommended",
    "documents_prepared",
    "application_readiness",
  ];
  let foundCurrent = false;
  const journey = keys.map((key, index) => {
    let status: DashboardJourneyStatus;
    if (flags[index]) {
      status = "completed";
    } else if (!foundCurrent) {
      status = "current";
      foundCurrent = true;
    } else {
      status = "pending";
    }
    return { key, status };
  });
  return {
    has_wallet: Boolean(wallet),
    progress: {
      profile_completeness_percent: completenessPercent,
      eligibility_checked: history.length > 0,
      latest_recommendation_count: history[0]?.recommendation_count ?? 0,
      document_progress_percent: docPercent,
      readiness_progress_percent: readinessPercent,
    },
    journey,
    summary: {
      total_recommended_schemes: recommended.size,
      schemes_being_prepared: readiness?.schemes_being_prepared ?? 0,
      schemes_with_document_progress: documents?.schemes_with_progress ?? 0,
      overall_preparation_progress: recommended.size ? Math.round((docPercent + readinessPercent) / 2) : 0,
    },
    activity: history.slice(0, 8).map((item) => ({
      kind: "recommendation" as const,
      occurred_at: item.checked_at,
      recommendation_count: item.recommendation_count,
      history_id: item.id,
      scheme_name: item.recommended_schemes.map((scheme) => scheme.scheme_name).slice(0, 3).join(", ") || null,
    })),
    disclaimer:
      "This dashboard summarizes your research-prototype progress only. It is not government approval, application submission, or official verification.",
  };
}

function DashboardSkeleton({ message }: { message: string }) {
  return (
    <div className="space-y-6" aria-busy="true">
      <LoadingState message={message} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="card-surface h-36 animate-pulse bg-canvas" />
        ))}
      </div>
    </div>
  );
}

function ActionCard({
  to,
  icon,
  title,
  description,
  disabled = false,
}: {
  to?: string;
  icon: ReactNode;
  title: string;
  description: string;
  disabled?: boolean;
}) {
  const className = "card-surface flex h-full flex-col gap-3 p-5 transition duration-150 hover:border-slate-300 hover:shadow-lift";
  const body = (
    <>
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-action/10 text-action">
        {icon}
      </span>
      <h3 className="text-[20px] font-semibold text-ink-900">{title}</h3>
      <p className="text-[16px] leading-relaxed text-ink-500">{description}</p>
    </>
  );
  if (!to || disabled) {
    return <div className={className}>{body}</div>;
  }
  return (
    <Link to={to} className={`${className} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action`}>
      {body}
    </Link>
  );
}

function HistorySchemePreview({ scheme }: { scheme: HistorySchemeRef }) {
  const { t } = useI18n();
  return (
    <article className="rounded-[12px] border border-line bg-canvas px-4 py-4">
      <Badge tone="success">{t.predictedEligible}</Badge>
      <h3 className="mt-3 text-[18px] font-semibold text-ink-900">
        <Link to={`/schemes/${scheme.scheme_id}`} className="hover:text-action hover:underline">
          {scheme.scheme_name}
        </Link>
      </h3>
    </article>
  );
}

function ProgressCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="card-surface p-5 md:p-6">
      <p className="text-[15px] font-medium text-ink-500">{title}</p>
      <p className="mt-3 font-display text-[32px] font-extrabold leading-none text-navy-900">{value}</p>
      <p className="mt-3 text-[16px] text-ink-500">{detail}</p>
    </article>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, t } = useI18n();
  const { result } = useRecommendation();
  const [account, setAccount] = useState<AuthUser | null>(user);
  const [wallet, setWallet] = useState<CitizenWallet | null>(null);
  const [completeness, setCompleteness] = useState<ProfileCompleteness | null>(null);
  const [history, setHistory] = useState<RecommendationHistoryItem[]>([]);
  const [docProgress, setDocProgress] = useState<DocumentProgressResponse | null>(null);
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [readiness, setReadiness] = useState<ReadinessProgressResponse | null>(null);
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [uploads, setUploads] = useState<SupportingUploadListResponse | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);
      try {
        const [meResult, walletResult, historyResult, docsResult, insightsResult, readinessResult, overviewResult, uploadsResult, notificationsResult] =
          await Promise.allSettled([
            fetchCurrentUser(),
            getMyWallet(),
            fetchRecommendationHistory(),
            fetchDocumentProgress(),
            fetchEligibilityInsights(),
            fetchReadinessProgress(),
            fetchDashboardOverview(),
            fetchSupportingUploads(),
            fetchNotifications(),
          ]);

        if (cancelled) return;

        if (meResult.status === "fulfilled") {
          setAccount(meResult.value);
        }

        if (walletResult.status === "fulfilled") {
          setWallet(walletResult.value);
          try {
            const nextCompleteness = await fetchProfileCompleteness();
            if (!cancelled) setCompleteness(nextCompleteness);
          } catch {
            if (!cancelled) setCompleteness(null);
          }
        } else if (walletResult.reason instanceof ApiError && walletResult.reason.status === 404) {
          setWallet(null);
          setCompleteness(null);
        } else {
          throw walletResult.reason;
        }

        if (historyResult.status === "fulfilled") {
          setHistory(historyResult.value.history);
        } else {
          throw historyResult.reason;
        }

        if (docsResult.status === "fulfilled") {
          setDocProgress(docsResult.value);
        } else {
          setDocProgress(null);
        }

        if (insightsResult.status === "fulfilled") {
          setInsights(insightsResult.value);
        } else {
          setInsights(null);
        }

        if (readinessResult.status === "fulfilled") {
          setReadiness(readinessResult.value);
        } else {
          setReadiness(null);
        }

        if (overviewResult.status === "fulfilled") {
          setOverview(overviewResult.value);
        } else {
          setOverview(null);
        }

        if (uploadsResult.status === "fulfilled") {
          setUploads(uploadsResult.value);
        } else {
          setUploads(null);
        }

        if (notificationsResult.status === "fulfilled") {
          setNotifications(notificationsResult.value.notifications.filter((item) => !item.is_read).slice(0, 3));
        } else {
          setNotifications([]);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : t.networkError);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const latestHistory = history[0] ?? null;
  const sessionRecommendations = result?.recommendations ?? [];
  const historySchemes = latestHistory?.recommended_schemes ?? [];
  const recommendedSchemes: RecommendedScheme[] = sessionRecommendations;
  const previewSchemes = recommendedSchemes.length > 0 ? recommendedSchemes.slice(0, 3) : [];
  const eligibleCount = result?.eligible_scheme_count ?? latestHistory?.recommendation_count ?? 0;
  const compareIds = (
    recommendedSchemes.length > 0
      ? recommendedSchemes.map((scheme) => scheme.scheme_id)
      : historySchemes.map((scheme) => scheme.scheme_id)
  ).slice(0, 3);
  const canCompare = compareIds.length >= 2;
  const hasRecommendationData = eligibleCount > 0 || previewSchemes.length > 0 || historySchemes.length > 0;
  const displayName = account?.full_name || user?.full_name || user?.email || "";
  const snapshot = overview ?? deriveOverview(wallet, completeness, history, docProgress, readiness);

  async function handleDownloadReport() {
    if (compareIds.length === 0) return;
    setDownloading(true);
    setReportError(null);
    try {
      await downloadRecommendationReport(canCompare ? compareIds : []);
    } catch (caught) {
      setReportError(caught instanceof ApiError ? caught.message : t.networkError);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t.dashboardWelcome(displayName)} description={t.dashboardLead} />

      {loading ? <DashboardSkeleton message={t.dashboardLoading} /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <>
          {!wallet ? (
            <EmptyState title={t.dashboardProfileNotCreated} description={t.dashboardCreateProfileLead}>
              <Button type="button" onClick={() => navigate("/wallet")}>
                {t.dashboardCreateMyProfile}
              </Button>
            </EmptyState>
          ) : completeness && completeness.incomplete_fields.length > 0 ? (
            <ProfileCompletenessCard completeness={completeness} onCompleteProfile={() => navigate("/wallet")} />
          ) : null}

          <section aria-labelledby="dashboard-progress">
            <h2 id="dashboard-progress" className="section-title">
              {t.dashboardProgressOverview}
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ProgressCard
                title={t.dashboardProgressProfile}
                value={`${snapshot.progress.profile_completeness_percent}%`}
                detail={wallet ? t.completenessTitle : t.dashboardProfileNotCreated}
              />
              <ProgressCard
                title={t.dashboardProgressEligibility}
                value={
                  snapshot.progress.eligibility_checked
                    ? String(snapshot.progress.latest_recommendation_count)
                    : "—"
                }
                detail={
                  snapshot.progress.eligibility_checked
                    ? t.dashboardEligibilityChecked
                    : t.dashboardEligibilityNotChecked
                }
              />
              <ProgressCard
                title={t.dashboardProgressDocuments}
                value={`${snapshot.progress.document_progress_percent}%`}
                detail={t.documentsPreparationProgress}
              />
              <ProgressCard
                title={t.dashboardProgressReadiness}
                value={`${snapshot.progress.readiness_progress_percent}%`}
                detail={t.readinessDashboardLead}
              />
            </div>
          </section>

          <section className="card-surface space-y-5 p-6 md:p-8" aria-labelledby="dashboard-journey">
            <div>
              <h2 id="dashboard-journey" className="section-title">
                {t.dashboardJourneyTitle}
              </h2>
              <p className="mt-2 text-[17px] text-ink-500">{t.dashboardJourneyLead}</p>
            </div>
            <ol className="grid gap-4 md:grid-cols-6">
              {snapshot.journey.map((step, index) => (
                <li key={step.key} className="relative flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                        step.status === "completed"
                          ? "bg-action text-white"
                          : step.status === "current"
                            ? "border-2 border-action bg-[#E8F0FE] text-action"
                            : "border border-line bg-canvas text-ink-500"
                      }`}
                    >
                      {index + 1}
                    </span>
                    {index < snapshot.journey.length - 1 ? (
                      <span className="hidden h-px flex-1 bg-line md:block" aria-hidden="true" />
                    ) : null}
                  </div>
                  <div>
                    <p className="text-[16px] font-semibold text-ink-900">{journeyLabel(step.key, t)}</p>
                    <p className="mt-1 text-[14px] text-ink-500">{journeyStatusLabel(step.status, t)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="card-surface space-y-5 p-6 md:p-8" aria-labelledby="dashboard-summary">
            <div>
              <h2 id="dashboard-summary" className="section-title">
                {t.dashboardSmartSummary}
              </h2>
              <p className="mt-2 text-[17px] text-ink-500">{t.dashboardSmartSummaryLead}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-[12px] border border-line bg-canvas px-4 py-4">
                <p className="text-[18px] font-semibold text-ink-900">
                  {t.dashboardTotalRecommended(snapshot.summary.total_recommended_schemes)}
                </p>
              </article>
              <article className="rounded-[12px] border border-line bg-canvas px-4 py-4">
                <p className="text-[18px] font-semibold text-ink-900">
                  {t.readinessSchemesPreparing(snapshot.summary.schemes_being_prepared)}
                </p>
              </article>
              <article className="rounded-[12px] border border-line bg-canvas px-4 py-4">
                <p className="text-[18px] font-semibold text-ink-900">
                  {t.documentsSchemesWithProgress(snapshot.summary.schemes_with_document_progress)}
                </p>
              </article>
              <article className="rounded-[12px] border border-line bg-canvas px-4 py-4">
                <p className="text-[18px] font-semibold text-ink-900">
                  {t.dashboardOverallPrep(snapshot.summary.overall_preparation_progress)}
                </p>
              </article>
            </div>
          </section>

          <section className="card-surface space-y-5 p-6 md:p-8" aria-labelledby="dashboard-notifications">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="dashboard-notifications" className="section-title">
                  {t.notificationsDashboardTitle}
                </h2>
                <p className="mt-2 text-[17px] text-ink-500">{t.notificationsDashboardLead}</p>
              </div>
              <Link
                to="/notifications"
                className="inline-flex items-center justify-center rounded-[12px] bg-action px-4 py-2.5 text-[16px] font-semibold text-white hover:bg-action-hover"
              >
                {t.notificationsDashboardCta}
              </Link>
            </div>
            {notifications.length > 0 ? (
              <ul className="divide-y divide-line">
                {notifications.map((item) => (
                  <li key={item.notification_id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <p className="text-[15px] font-medium text-ink-500">
                        {notificationCategory(item.type, t)} · {formatCheckedAt(item.created_at, language)}
                      </p>
                      <p className="text-[18px] font-semibold text-ink-900">{notificationTitle(item, t)}</p>
                      <p className="text-[16px] text-ink-700">{notificationMessage(item, t)}</p>
                    </div>
                    <Link
                      to={item.href}
                      className="inline-flex shrink-0 items-center justify-center rounded-[12px] border border-line px-4 py-2.5 text-[16px] font-semibold text-ink-900 hover:bg-canvas"
                    >
                      {t.notificationsOpen}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[16px] text-ink-500">{t.notificationsDashboardEmpty}</p>
            )}
          </section>

          <section aria-labelledby="dashboard-quick-actions">
            <h2 id="dashboard-quick-actions" className="section-title">
              {t.dashboardQuickActions}
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <ActionCard to="/check" icon={<CheckIcon />} title={t.navCheck} description={t.checkDescription} />
              <ActionCard to="/wallet" icon={<WalletIcon />} title={t.navWallet} description={t.walletDescription} />
              <ActionCard to="/insights" icon={<InsightsIcon />} title={t.insightsDashboardCta} description={t.insightsDashboardLead} />
              <ActionCard to="/documents" icon={<DocumentIcon />} title={t.documentsManage} description={t.documentsDashboardLead} />
              <ActionCard to="/readiness" icon={<ReadinessIcon />} title={t.readinessDashboardCta} description={t.readinessDashboardLead} />
              <ActionCard to="/history" icon={<HistoryIcon />} title={t.dashboardViewHistory} description={t.historySubtitle} />
            </div>
          </section>

          <section className="card-surface p-6 md:p-8" aria-labelledby="dashboard-activity">
            <h2 id="dashboard-activity" className="section-title">
              {t.dashboardRecentActivity}
            </h2>
            {snapshot.activity.length === 0 ? (
              <EmptyState title={t.dashboardActivityEmptyTitle} description={t.dashboardActivityEmptyLead}>
                <Button type="button" onClick={() => navigate("/check")}>
                  {t.navCheck}
                </Button>
              </EmptyState>
            ) : (
              <ul className="mt-5 divide-y divide-line">
                {snapshot.activity.map((item, index) => (
                  <li
                    key={`${item.kind}-${item.occurred_at}-${item.scheme_id ?? item.history_id ?? index}`}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 space-y-2">
                      <p className="text-[15px] font-medium text-ink-500">
                        <span className="sr-only">{t.dashboardActivityDate}: </span>
                        {formatCheckedAt(item.occurred_at, language)}
                      </p>
                      <p className="text-[18px] font-semibold text-ink-900">{activityDescription(item, t)}</p>
                    </div>
                    <Link
                      to={activityHref(item)}
                      className="inline-flex shrink-0 items-center justify-center rounded-[12px] border border-line px-4 py-2.5 text-[16px] font-semibold text-ink-900 hover:bg-canvas"
                    >
                      {item.kind === "recommendation" ? t.viewHistoryDetails : t.dashboardViewAllRecommendations}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card-surface space-y-5 p-6 md:p-8" aria-labelledby="dashboard-recommendations">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="dashboard-recommendations" className="section-title">
                  {t.dashboardRecommendationSummary}
                </h2>
                {hasRecommendationData ? (
                  <p className="mt-2 text-[17px] text-ink-500">{t.dashboardEligibleCount(eligibleCount)}</p>
                ) : null}
              </div>
              {hasRecommendationData ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate(result ? "/results" : "/history")}
                >
                  {t.dashboardViewAllRecommendations}
                </Button>
              ) : null}
            </div>

            {hasRecommendationData ? (
              <div className="grid gap-4">
                {previewSchemes.length > 0
                  ? previewSchemes.map((scheme) => (
                      <SchemeCard
                        key={scheme.scheme_id}
                        scheme={scheme}
                        incompleteFields={completeness?.incomplete_fields ?? []}
                      />
                    ))
                  : historySchemes.slice(0, 3).map((scheme) => (
                      <HistorySchemePreview key={scheme.scheme_id} scheme={scheme} />
                    ))}
              </div>
            ) : (
              <EmptyState
                title={t.dashboardNoRecommendationsTitle}
                description={t.dashboardNoRecommendationsDescription}
              >
                <Button type="button" onClick={() => navigate("/wallet")}>
                  {t.findEligibleSchemes}
                </Button>
              </EmptyState>
            )}
          </section>

          <section className="card-surface space-y-5 p-6 md:p-8" aria-labelledby="dashboard-insights">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="dashboard-insights" className="section-title">
                  {t.insightsDashboardTitle}
                </h2>
                <p className="mt-2 text-[17px] text-ink-500">{t.insightsDashboardLead}</p>
              </div>
              <Link
                to="/insights"
                className="inline-flex items-center justify-center rounded-[12px] bg-action px-4 py-2.5 text-[16px] font-semibold text-white hover:bg-action-hover"
              >
                {t.insightsDashboardCta}
              </Link>
            </div>
            {insights ? (
              <p className="text-[18px] font-semibold text-ink-900">
                {t.insightsEligibleCount(insights.predicted_eligible_count)}
              </p>
            ) : (
              <p className="text-[16px] text-ink-500">{t.insightsDashboardEmpty}</p>
            )}
          </section>

          <section className="card-surface space-y-5 p-6 md:p-8" aria-labelledby="dashboard-readiness">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="dashboard-readiness" className="section-title">
                  {t.readinessDashboardTitle}
                </h2>
                <p className="mt-2 text-[17px] text-ink-500">{t.readinessDashboardLead}</p>
              </div>
              <Link
                to="/readiness"
                className="inline-flex items-center justify-center rounded-[12px] bg-action px-4 py-2.5 text-[16px] font-semibold text-white hover:bg-action-hover"
              >
                {t.readinessDashboardCta}
              </Link>
            </div>
            {readiness && readiness.schemes_being_prepared > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <article className="rounded-[12px] border border-line bg-canvas px-4 py-4">
                  <p className="text-[18px] font-semibold text-ink-900">
                    {t.readinessSchemesPreparing(readiness.schemes_being_prepared)}
                  </p>
                </article>
                <article className="rounded-[12px] border border-line bg-canvas px-4 py-4">
                  <p className="text-[18px] font-semibold text-ink-900">
                    {t.readinessOverallProgress(readiness.overall_progress_percent)}
                  </p>
                </article>
              </div>
            ) : (
              <p className="text-[16px] text-ink-500">{t.readinessDashboardEmpty}</p>
            )}
          </section>

          <section className="card-surface space-y-5 p-6 md:p-8" aria-labelledby="dashboard-documents">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="dashboard-documents" className="section-title">
                  {t.documentsDashboardTitle}
                </h2>
                <p className="mt-2 text-[17px] text-ink-500">{t.documentsDashboardLead}</p>
              </div>
              <Link
                to="/documents"
                className="inline-flex items-center justify-center rounded-[12px] bg-action px-4 py-2.5 text-[16px] font-semibold text-white hover:bg-action-hover"
              >
                {t.documentsManage}
              </Link>
            </div>
            {docProgress && docProgress.schemes.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <article className="rounded-[12px] border border-line bg-canvas px-4 py-4">
                  <p className="text-[15px] font-medium text-ink-500">{t.documentsProgress}</p>
                  <p className="mt-2 text-[22px] font-semibold text-ink-900">
                    {t.documentsSchemesWithProgress(docProgress.schemes_with_progress)}
                  </p>
                </article>
                <article className="rounded-[12px] border border-line bg-canvas px-4 py-4">
                  <p className="text-[15px] font-medium text-ink-500">{t.documentsPreparationProgress}</p>
                  <p className="mt-2 text-[22px] font-semibold text-ink-900">
                    {t.documentsOverallProgress(docProgress.overall_progress_percent)}
                  </p>
                </article>
              </div>
            ) : (
              <p className="text-[16px] text-ink-500">{t.documentsEmptyLead}</p>
            )}
          </section>

          <section className="card-surface space-y-5 p-6 md:p-8" aria-labelledby="dashboard-uploads">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="dashboard-uploads" className="section-title">
                  {t.uploadsDashboardTitle}
                </h2>
                <p className="mt-2 text-[17px] text-ink-500">{t.uploadsDashboardLead}</p>
              </div>
              <Link
                to="/uploads"
                className="inline-flex items-center justify-center rounded-[12px] bg-action px-4 py-2.5 text-[16px] font-semibold text-white hover:bg-action-hover"
              >
                {t.uploadsDashboardCta}
              </Link>
            </div>
            {uploads && uploads.count > 0 ? (
              <p className="text-[18px] font-semibold text-ink-900">{t.uploadsCount(uploads.count)}</p>
            ) : (
              <p className="text-[16px] text-ink-500">{t.uploadsDashboardEmpty}</p>
            )}
          </section>

          <section className="card-surface p-6 md:p-8" aria-labelledby="dashboard-more-actions">
            <h2 id="dashboard-more-actions" className="section-title">
              {t.dashboardMoreActions}
            </h2>
            {reportError ? <div className="mt-4"><ErrorState message={reportError} /></div> : null}
            {downloading ? <div className="mt-4"><LoadingState message={t.dashboardPreparingReport} /></div> : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/schemes"
                className="inline-flex items-center gap-2 rounded-[12px] border border-line px-4 py-2.5 text-[16px] font-semibold text-ink-900 hover:bg-canvas"
              >
                <SchemesIcon />
                {t.dashboardBrowseSchemes}
              </Link>
              <Link
                to="/evaluation"
                className="inline-flex items-center gap-2 rounded-[12px] border border-line px-4 py-2.5 text-[16px] font-semibold text-ink-900 hover:bg-canvas"
              >
                <EvaluationIcon />
                {t.navEvaluation}
              </Link>
              <Link
                to="/system-evaluation"
                className="inline-flex items-center gap-2 rounded-[12px] border border-line px-4 py-2.5 text-[16px] font-semibold text-ink-900 hover:bg-canvas"
              >
                <BrainIcon />
                {t.navSystemEvaluation}
              </Link>
              <Link
                to="/notifications"
                className="inline-flex items-center gap-2 rounded-[12px] border border-line px-4 py-2.5 text-[16px] font-semibold text-ink-900 hover:bg-canvas"
              >
                <BellIcon />
                {t.navNotifications}
              </Link>
              {canCompare ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate("/compare", { state: { schemeIds: compareIds } })}
                >
                  {t.compareSchemes}
                </Button>
              ) : null}
              {hasRecommendationData ? (
                <Button type="button" onClick={() => void handleDownloadReport()} disabled={downloading}>
                  <span className="inline-flex items-center gap-2">
                    <DocumentIcon />
                    {t.downloadPdf}
                  </span>
                </Button>
              ) : null}
            </div>
            <p className="mt-6 text-[16px] leading-relaxed text-ink-500">{t.dashboardDisclaimer}</p>
          </section>
        </>
      ) : null}
    </div>
  );
}
