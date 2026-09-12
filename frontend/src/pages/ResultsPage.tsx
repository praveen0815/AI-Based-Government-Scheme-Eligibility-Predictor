import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { EmptyRecommendations } from "../components/EmptyRecommendations";
import { ErrorState } from "../components/ErrorState";
import { ProfileSummary } from "../components/ProfileSummary";
import { ResearchNotice } from "../components/ResearchNotice";
import { SchemeCard } from "../components/SchemeCard";
import { WhyThisScheme } from "../components/WhyThisScheme";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/LanguageContext";
import { useRecommendation } from "../context/RecommendationContext";
import { ApiError, downloadRecommendationReport } from "../services/api";
import { profileFieldLabel } from "../utils/displayLabels";
import { incompleteProfileFields } from "../utils/profileCompleteness";

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
  const incompleteFields = incompleteProfileFields(profile);

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
    <div className="page-stack">
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
          {canCompare ? <p className="text-[16px] text-ink-500">{t.compareHint}</p> : null}
        </div>
      ) : (
        <p className="text-[16px] text-ink-500">
          {t.compareSignIn}{" "}
          <Link to="/login" className="font-semibold text-action hover:underline">
            {t.signIn}
          </Link>
        </p>
      )}
      {isAuthenticated ? <p className="text-[16px] text-ink-500">{t.compareWalletNote}</p> : null}
      {actionError ? <ErrorState message={actionError} /> : null}

      {isAuthenticated ? (
        <nav className="card-surface flex flex-wrap gap-3 p-5 sm:p-6" aria-label={t.resultsContinue}>
          <p className="w-full text-[16px] font-semibold text-ink-900">{t.resultsContinue}</p>
          <Link to="/history" className="btn-text rounded-[12px] border border-line px-4 py-2.5 text-ink-900 hover:bg-sage">
            {t.navHistory}
          </Link>
          <Link to="/documents" className="btn-text rounded-[12px] border border-line px-4 py-2.5 text-ink-900 hover:bg-sage">
            {t.navDocuments}
          </Link>
          <Link to="/readiness" className="btn-text rounded-[12px] border border-line px-4 py-2.5 text-ink-900 hover:bg-sage">
            {t.navReadiness}
          </Link>
          <Link to="/insights" className="btn-text rounded-[12px] border border-line px-4 py-2.5 text-ink-900 hover:bg-sage">
            {t.navInsights}
          </Link>
          <Link to="/notifications" className="btn-text rounded-[12px] border border-line px-4 py-2.5 text-ink-900 hover:bg-sage">
            {t.navNotifications}
          </Link>
          <Link to="/applications" className="btn-text rounded-[12px] border border-line px-4 py-2.5 text-ink-900 hover:bg-sage">
            {t.navApplications}
          </Link>
          <Link to="/eligibility-simulator" className="btn-text rounded-[12px] border border-line px-4 py-2.5 text-ink-900 hover:bg-sage">
            {t.navSimulator}
          </Link>
        </nav>
      ) : null}

      {incompleteFields.length > 0 ? (
        <section className="rounded-[14px] border border-amber-200 bg-amber-50 px-5 py-5" role="status">
          <h2 className="section-title">{t.whyCannotEvaluate}</h2>
          <p className="mt-2 text-[16px] leading-relaxed text-ink-700">{t.resultsIncompleteLead}</p>
          <p className="mt-2 text-[16px] leading-relaxed text-ink-700">{t.whyRequiredToEvaluate}</p>
          <p className="mt-3 text-[16px] font-semibold text-ink-900">{t.whyMissingInformation}</p>
          <ul className="mt-2 space-y-1 text-[16px] text-ink-700">
            {incompleteFields.map((field) => (
              <li key={field}>⚠ {profileFieldLabel(field, t)}</li>
            ))}
          </ul>
        </section>
      ) : null}

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
                incompleteFields={incompleteFields}
                outcome="eligible"
              />
            );
          })}
        </div>
      )}

      {result.evaluated_schemes.filter(
        (scheme) =>
          scheme.prediction === "not_eligible" &&
          !result.recommendations.some((recommended) => recommended.scheme_id === scheme.scheme_id),
      ).length > 0 ? (
        <div className="grid gap-6">
          <h2 className="section-title">{t.resultsNotEligibleHeading}</h2>
          {result.evaluated_schemes
            .filter(
              (scheme) =>
                scheme.prediction === "not_eligible" &&
                !result.recommendations.some((recommended) => recommended.scheme_id === scheme.scheme_id),
            )
            .map((scheme) => (
              <article key={scheme.scheme_id} className="card-surface p-6 md:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="card-title">
                    <Link to={`/schemes/${scheme.scheme_id}`} className="hover:text-action hover:underline">
                      {scheme.scheme_name}
                    </Link>
                  </h3>
                </div>
                <WhyThisScheme
                  title={t.whyThisResult}
                  data={{
                    ruleEligible: scheme.rule_eligible,
                    ruleReasons: scheme.reason ? [scheme.reason] : [],
                    fallbackReason: scheme.reason,
                    mlPrediction: scheme.ml_prediction,
                    agreement: scheme.agreement,
                    eligibleProbability: scheme.eligible_probability,
                    incompleteFields,
                    outcome: "not_eligible",
                  }}
                />
              </article>
            ))}
        </div>
      ) : null}
    </div>
  );
}
