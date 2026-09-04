import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { ProfileCompletenessCard } from "../components/ProfileCompletenessCard";
import { ResearchNotice } from "../components/ResearchNotice";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { useI18n } from "../context/LanguageContext";
import { ApiError, fetchEligibilityInsights } from "../services/api";
import type { InsightReviewCode, InsightScheme, InsightsResponse } from "../types/api";

function reviewCopy(code: InsightReviewCode, t: ReturnType<typeof useI18n>["t"]): string {
  if (code === "complete_profile") return t.insightsReviewComplete;
  if (code === "review_official_source") return t.insightsReviewOfficial;
  if (code === "review_disagreement") return t.insightsReviewDisagree;
  return t.insightsReviewVerify;
}

function SchemeInsightCard({
  scheme,
  whyLabel,
}: {
  scheme: InsightScheme;
  whyLabel: string;
}) {
  const { t } = useI18n();
  return (
    <article className="rounded-[14px] border border-line bg-canvas px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge tone={scheme.predicted_eligible ? "success" : "muted"}>
            {scheme.predicted_eligible ? t.predictedEligible : t.notRecommended}
          </Badge>
          <h3 className="mt-3 text-[18px] font-semibold text-ink-900">
            <Link to={`/schemes/${scheme.scheme_id}`} className="hover:text-action hover:underline">
              {scheme.scheme_name}
            </Link>
          </h3>
          <p className="mt-1 text-[15px] text-ink-500">{scheme.scheme_id}</p>
        </div>
        {scheme.official_source_url ? (
          <a
            href={scheme.official_source_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-[12px] border border-line px-3 py-2 text-[15px] font-semibold text-ink-900 hover:bg-canvas"
          >
            {t.visitOfficialWebsite}
          </a>
        ) : null}
      </div>
      <p className="mt-3 text-[15px] font-semibold text-ink-700">{whyLabel}</p>
      <p className="mt-1 text-[16px] leading-relaxed text-ink-500">{scheme.reason}</p>
      {scheme.rule_reasons.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-[15px] text-ink-500">
          {scheme.rule_reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export function InsightsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingWallet, setMissingWallet] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setMissingWallet(false);
      try {
        const next = await fetchEligibilityInsights();
        if (!cancelled) setInsights(next);
      } catch (caught) {
        if (!cancelled) {
          if (caught instanceof ApiError && caught.status === 404) {
            setMissingWallet(true);
            setInsights(null);
          } else {
            setError(caught instanceof ApiError ? caught.message : t.networkError);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const schemes = [...(insights?.recommended_schemes ?? []), ...(insights?.other_schemes ?? [])];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader title={t.insightsTitle} description={t.insightsLead} />
      <ResearchNotice compact />

      {loading ? <LoadingState message={t.insightsLoading} /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading && !error && missingWallet ? (
        <EmptyState title={t.insightsEmptyTitle} description={t.insightsEmptyLead}>
          <Button type="button" onClick={() => navigate("/wallet")}>
            {t.dashboardCreateMyProfile}
          </Button>
        </EmptyState>
      ) : null}

      {!loading && !error && insights ? (
        <>
          <section className="card-surface space-y-4 p-6 md:p-8" aria-labelledby="insights-overview">
            <h2 id="insights-overview" className="section-title">
              {t.insightsOverview}
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <article className="rounded-[12px] border border-line bg-canvas px-4 py-4">
                <p className="text-[15px] font-medium text-ink-500">{t.insightsEvaluatedCount(insights.total_schemes_evaluated)}</p>
              </article>
              <article className="rounded-[12px] border border-line bg-canvas px-4 py-4">
                <p className="text-[15px] font-medium text-ink-500">{t.insightsEligibleCount(insights.predicted_eligible_count)}</p>
              </article>
              <article className="rounded-[12px] border border-line bg-canvas px-4 py-4">
                <p className="text-[15px] font-medium text-ink-500">
                  {t.insightsNotRecommendedCount(insights.not_recommended_count)}
                </p>
              </article>
            </div>
          </section>

          <section className="card-surface space-y-4 p-6 md:p-8" aria-labelledby="insights-recommended">
            <h2 id="insights-recommended" className="section-title">
              {t.insightsRecommended}
            </h2>
            <p className="text-[16px] text-ink-500">{t.insightsRecommendedLead}</p>
            {insights.recommended_schemes.length === 0 ? (
              <p className="text-[16px] text-ink-500">{t.insightsNotRecommendedCount(insights.not_recommended_count)}</p>
            ) : (
              <div className="space-y-3">
                {insights.recommended_schemes.map((scheme) => (
                  <SchemeInsightCard key={scheme.scheme_id} scheme={scheme} whyLabel={t.insightsWhyRecommended} />
                ))}
              </div>
            )}
          </section>

          <section className="card-surface space-y-4 p-6 md:p-8" aria-labelledby="insights-other">
            <h2 id="insights-other" className="section-title">
              {t.insightsOther}
            </h2>
            <p className="text-[16px] text-ink-500">{t.insightsOtherLead}</p>
            {insights.other_schemes.length === 0 ? (
              <p className="text-[16px] text-ink-500">{t.insightsEligibleCount(insights.predicted_eligible_count)}</p>
            ) : (
              <div className="space-y-3">
                {insights.other_schemes.map((scheme) => (
                  <SchemeInsightCard key={scheme.scheme_id} scheme={scheme} whyLabel={t.insightsWhyNotRecommended} />
                ))}
              </div>
            )}
          </section>

          <section className="card-surface space-y-4 p-6 md:p-8" aria-labelledby="insights-transparency">
            <h2 id="insights-transparency" className="section-title">
              {t.insightsTransparency}
            </h2>
            <p className="text-[16px] text-ink-500">{t.insightsTransparencyLead}</p>
            <div className="space-y-3">
              {schemes.map((scheme) => (
                <article key={scheme.scheme_id} className="rounded-[12px] border border-line px-4 py-4">
                  <p className="text-[17px] font-semibold text-ink-900">{scheme.scheme_name}</p>
                  <dl className="mt-3 grid gap-2 text-[15px] sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-ink-500">{t.insightsRuleResult}</dt>
                      <dd className="text-ink-900">{scheme.rule_eligible ? t.predictedEligible : t.notRecommended}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-ink-500">{t.insightsMlPrediction}</dt>
                      <dd className="text-ink-900">
                        {scheme.ml_prediction === "eligible" ? t.predictedEligible : t.notRecommended}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-ink-500">{t.insightsModelProbability}</dt>
                      <dd className="text-ink-900">{Math.round(scheme.eligible_probability * 100)}%</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-ink-500">{t.insightsAgreement}</dt>
                      <dd className="text-ink-900">
                        {scheme.agreement ? t.insightsAgree : t.insightsDisagree}
                        {scheme.agreement ? null : ` ${t.insightsRuleReference}`}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </section>

          <section className="card-surface space-y-4 p-6 md:p-8" aria-labelledby="insights-review">
            <h2 id="insights-review" className="section-title">
              {t.insightsReview}
            </h2>
            <p className="text-[16px] text-ink-500">{t.insightsReviewLead}</p>
            <ul className="list-disc space-y-2 pl-5 text-[16px] text-ink-700">
              {insights.review_items.map((item) => (
                <li key={item.code}>{reviewCopy(item.code, t)}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="insights-completeness">
            <h2 id="insights-completeness" className="sr-only">
              {t.insightsCompleteness}
            </h2>
            <ProfileCompletenessCard
              completeness={insights.completeness}
              onCompleteProfile={() => navigate("/wallet")}
            />
          </section>
        </>
      ) : null}
    </div>
  );
}
