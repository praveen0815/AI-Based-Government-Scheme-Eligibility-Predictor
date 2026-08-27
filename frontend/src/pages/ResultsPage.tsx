import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { EmptyRecommendations } from "../components/EmptyRecommendations";
import { ErrorState } from "../components/ErrorState";
import { ProfileSummary } from "../components/ProfileSummary";
import { ResearchNotice } from "../components/ResearchNotice";
import { SchemeCard } from "../components/SchemeCard";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/LanguageContext";
import { useRecommendation } from "../context/RecommendationContext";
import { ApiError, downloadRecommendationReport } from "../services/api";

const MAX_COMPARE = 3;

export function ResultsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t } = useI18n();
  const { profile, result } = useRecommendation();
  const [selected, setSelected] = useState<string[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!result) {
    return <Navigate to="/check" replace />;
  }

  const count = result.eligible_scheme_count;
  const editPath = isAuthenticated ? "/wallet" : "/check";
  const summary = count === 1 ? t.resultsOneMatch : t.resultsManyMatches(count);
  const canCompare = isAuthenticated && count >= 2;

  function toggleScheme(schemeId: string) {
    setSelected((current) => {
      if (current.includes(schemeId)) {
        return current.filter((id) => id !== schemeId);
      }
      if (current.length >= MAX_COMPARE) {
        return current;
      }
      return [...current, schemeId];
    });
  }

  async function handleDownload() {
    setDownloading(true);
    setActionError(null);
    try {
      await downloadRecommendationReport(selected.length >= 2 ? selected : []);
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : t.networkError);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-10">
      <PageHeader title={t.resultsTitle} description={summary} />
      <ResearchNotice compact />
      {profile ? <ProfileSummary profile={profile} onEdit={() => navigate(editPath)} /> : null}

      {isAuthenticated ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => void handleDownload()} disabled={downloading}>
            {t.downloadPdf}
          </Button>
          {canCompare ? (
            <Button
              type="button"
              variant="secondary"
              disabled={selected.length < 2}
              onClick={() => navigate("/compare", { state: { schemeIds: selected } })}
            >
              {t.compareSchemes}
            </Button>
          ) : null}
          {canCompare ? <p className="text-[15px] text-ink-500">{t.compareHint}</p> : null}
        </div>
      ) : (
        <p className="text-[16px] text-ink-500">
          {t.compareSignIn}{" "}
          <Link to="/login" className="font-semibold text-action hover:underline">
            {t.signIn}
          </Link>
        </p>
      )}
      {isAuthenticated ? <p className="text-[15px] text-ink-500">{t.compareWalletNote}</p> : null}
      {actionError ? <ErrorState message={actionError} /> : null}

      {count === 0 ? (
        <EmptyRecommendations onEditProfile={() => navigate(editPath)} />
      ) : (
        <div className="grid gap-6">
          <h2 className="section-title">{t.predictedEligibleHeading}</h2>
          {result.recommendations.map((scheme) => {
            const checked = selected.includes(scheme.scheme_id);
            const selectionLocked = selected.length >= MAX_COMPARE && !checked;
            return (
              <SchemeCard
                key={scheme.scheme_id}
                scheme={scheme}
                compareEnabled={canCompare}
                compareChecked={checked}
                compareLocked={selectionLocked}
                onCompareToggle={() => toggleScheme(scheme.scheme_id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
