import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ComparisonTable } from "../components/ComparisonTable";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { ResearchNotice } from "../components/ResearchNotice";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/LanguageContext";
import { ApiError, compareSchemes, downloadRecommendationReport } from "../services/api";
import type { CompareResponse } from "../types/api";

interface CompareLocationState {
  schemeIds?: string[];
}

const EMPTY_SCHEME_IDS: string[] = [];

export function ComparePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { t } = useI18n();
  const schemeIds = (location.state as CompareLocationState | null)?.schemeIds ?? EMPTY_SCHEME_IDS;
  const [comparison, setComparison] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadComparison() {
      if (!isAuthenticated || schemeIds.length < 2) return;
      setLoading(true);
      setError(null);
      try {
        const result = await compareSchemes(schemeIds);
        if (!cancelled) setComparison(result);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : t.networkError);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadComparison();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, schemeIds, t]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (schemeIds.length < 2 || schemeIds.length > 3) {
    return (
      <div className="page-stack">
        <PageHeader title={t.compareTitle} description={t.compareSubtitle} />
        <ResearchNotice compact />
        <EmptyState title={t.compareEmptyTitle} description={t.compareEmptyLead}>
          <Link to="/results" className="btn-text inline-flex rounded-[12px] bg-action px-5 py-3 text-white">
            {t.backToRecommendations}
          </Link>
          <Link to="/schemes" className="btn-text inline-flex rounded-[12px] border border-line px-5 py-3 text-ink-900">
            {t.navSchemes}
          </Link>
        </EmptyState>
      </div>
    );
  }

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      await downloadRecommendationReport(schemeIds);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.networkError);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader title={t.compareTitle} description={t.compareSubtitle} />
      <ResearchNotice compact />
      <p className="text-[15px] text-ink-500">{t.compareWalletNote}</p>
      {loading ? <LoadingState message={t.comparePreparing} /> : null}
      {error ? <ErrorState message={error} /> : null}
      {comparison ? (
        <>
          <ComparisonTable schemes={comparison.schemes} />
          <p className="text-[15px] text-ink-500">{comparison.disclaimer}</p>
          <p className="text-[15px] text-ink-500">{t.reportDisclaimer}</p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => void handleDownload()} disabled={downloading}>
              {t.downloadPdf}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/results")}>
              {t.backToRecommendations}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
