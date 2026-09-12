import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { useI18n } from "../context/LanguageContext";
import {
  ApiError,
  deleteRecommendationHistory,
  fetchRecommendationHistory,
  fetchRecommendationHistoryDetail,
} from "../services/api";
import type { RecommendationHistoryItem } from "../types/api";
import { formatCheckedAt, walletSummaryGroups } from "../utils/displayLabels";

export function HistoryPage() {
  const navigate = useNavigate();
  const { historyId } = useParams();
  const { language, t } = useI18n();
  const [items, setItems] = useState<RecommendationHistoryItem[]>([]);
  const [detail, setDetail] = useState<RecommendationHistoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      setLoading(true);
      setApiError(null);
      try {
        const response = await fetchRecommendationHistory();
        if (cancelled) return;
        setItems(response.history);
        if (historyId) {
          const record = await fetchRecommendationHistoryDetail(historyId);
          if (!cancelled) setDetail(record);
        }
      } catch (error) {
        if (!cancelled) {
          setApiError(error instanceof ApiError ? error.message : t.networkError);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [historyId, t]);

  async function handleViewDetails(historyId: string) {
    setWorking(true);
    setApiError(null);
    try {
      const record = await fetchRecommendationHistoryDetail(historyId);
      setDetail(record);
    } catch (error) {
      setApiError(error instanceof ApiError ? error.message : t.networkError);
    } finally {
      setWorking(false);
    }
  }

  async function handleDelete(historyId: string) {
    setWorking(true);
    setApiError(null);
    try {
      await deleteRecommendationHistory(historyId);
      setItems((current) => current.filter((item) => item.id !== historyId));
      if (detail?.id === historyId) setDetail(null);
      setConfirmId(null);
    } catch (error) {
      setApiError(error instanceof ApiError ? error.message : t.networkError);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl page-stack">
      <PageHeader title={t.historyTitle} description={t.historySubtitle} />
      <aside className="rounded-[14px] border border-line bg-surface px-5 py-4 text-[16px] text-ink-500 shadow-card" role="note">
        {t.historyDisclaimer}
      </aside>

      {loading ? <LoadingState message={t.loadingHistory} /> : null}
      {apiError ? <ErrorState message={apiError} /> : null}

      {!loading && items.length === 0 && !apiError ? (
        <EmptyState title={t.historyEmptyTitle} description={t.historyEmptyDescription}>
          <Button type="button" onClick={() => navigate("/wallet")}>
            {t.goToWallet}
          </Button>
        </EmptyState>
      ) : null}

      <div className="relative space-y-5">
        {items.length > 0 ? (
          <div className="absolute bottom-4 left-[15px] top-4 hidden w-px bg-line sm:block" aria-hidden="true" />
        ) : null}
        {items.map((item) => (
          <article key={item.id} className="relative card-surface p-6 sm:ml-10">
            <span
              className="absolute -left-[29px] top-8 hidden h-3.5 w-3.5 rounded-full border-2 border-accent bg-surface sm:block"
              aria-hidden="true"
            />
            <p className="text-[15px] font-medium text-ink-500">{formatCheckedAt(item.checked_at, language)}</p>
            <h2 className="card-title mt-2">{t.historySchemeCount(item.recommendation_count)}</h2>
            {item.recommended_schemes.length > 0 ? (
              <ul className="mt-4 space-y-2 text-[17px] text-ink-500">
                {item.recommended_schemes.map((scheme) => (
                  <li key={scheme.scheme_id}>
                    <Link to={`/schemes/${scheme.scheme_id}`} className="font-medium text-action hover:underline">
                      {scheme.scheme_name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-[17px] text-ink-500">{t.historyNoSchemes}</p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleViewDetails(item.id)}
                disabled={working}
              >
                {t.viewHistoryDetails}
              </Button>
              <Button type="button" variant="danger" onClick={() => setConfirmId(item.id)} disabled={working}>
                {t.delete}
              </Button>
            </div>
            {confirmId === item.id ? (
              <div
                className="mt-5 rounded-[12px] border border-red-200 bg-red-50 p-4"
                role="alertdialog"
                aria-labelledby={`delete-history-${item.id}`}
              >
                <p id={`delete-history-${item.id}`} className="font-semibold text-danger">
                  {t.historyDeleteTitle}
                </p>
                <p className="mt-2 text-ink-700">{t.historyDeleteDetail}</p>
                <div className="mt-3 flex gap-3">
                  <Button type="button" variant="danger" onClick={() => void handleDelete(item.id)} disabled={working}>
                    {t.historyDeleteYes}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setConfirmId(null)}>
                    {t.cancel}
                  </Button>
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {detail ? (
        <section className="card-surface p-7" aria-labelledby="history-detail-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="history-detail-title" className="section-title">
                {t.historyDetailTitle}
              </h2>
              <p className="mt-2 text-ink-500">{formatCheckedAt(detail.checked_at, language)}</p>
            </div>
            <Button type="button" variant="ghost" onClick={() => setDetail(null)}>
              {t.close}
            </Button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {walletSummaryGroups(detail.profile_snapshot, t).map((group) => (
              <article key={group.title} className="rounded-[12px] border border-line bg-sage p-5">
                <h3 className="text-[18px] font-semibold text-ink-900">{group.title}</h3>
                <dl className="mt-3 space-y-2">
                  {group.rows.map((row) => (
                    <div key={row.label}>
                      <dt className="text-[16px] text-ink-500">{row.label}</dt>
                      <dd className="text-[16px] text-ink-900">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
          <h3 className="mt-7 text-[18px] font-semibold text-ink-900">{t.recommendedSchemes}</h3>
          {detail.recommended_schemes.length > 0 ? (
            <ul className="mt-2 space-y-2 text-[17px] text-ink-500">
              {detail.recommended_schemes.map((scheme) => (
                <li key={scheme.scheme_id}>
                  <Link to={`/schemes/${scheme.scheme_id}`} className="font-medium text-action hover:underline">
                    {scheme.scheme_name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[17px] text-ink-500">{t.historyNoSchemes}</p>
          )}
          <p className="mt-5 text-[15px] text-ink-500">{t.historyDisclaimer}</p>
        </section>
      ) : null}
    </div>
  );
}
