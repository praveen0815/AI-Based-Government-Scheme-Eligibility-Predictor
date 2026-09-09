import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { ResearchNotice } from "../components/ResearchNotice";
import { Badge } from "../components/ui/Badge";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { useI18n } from "../context/LanguageContext";
import { ApiError, fetchSystemEvaluation } from "../services/api";
import type { EndpointPerformance, SystemEvaluationResponse } from "../types/api";

function formatMetric(value: number): string {
  return value.toFixed(4);
}

function formatMsOrDash(value: number | null, formatMs: (value: number) => string): string {
  return value === null ? "—" : formatMs(value);
}

function ApiTimingBar({ endpoints }: { endpoints: EndpointPerformance[] }) {
  const maxAverage = Math.max(...endpoints.map((row) => row.average_ms ?? 0), 0);
  if (maxAverage <= 0) return null;
  return (
    <div className="space-y-3" aria-hidden="true">
      {endpoints.map((row) => {
        const width = row.average_ms === null ? 0 : (row.average_ms / maxAverage) * 100;
        return (
          <div key={row.endpoint}>
            <div className="mb-2 flex justify-between gap-3 text-[16px] text-ink-500">
              <span className="font-mono">{row.endpoint}</span>
              <span>{row.average_ms === null ? "—" : `${row.average_ms.toFixed(2)} ms`}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-sage">
              <div className="h-full rounded-full bg-action" style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SystemEvaluationPage() {
  const { t } = useI18n();
  const [data, setData] = useState<SystemEvaluationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchSystemEvaluation());
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.systemEvalLoadError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const selectedModel = data?.models.find((model) => model.selected) ?? data?.models[0];
  const recorded = data?.api_performance.endpoints.some((row) => row.request_count > 0) ?? false;

  return (
    <div className="mx-auto max-w-6xl page-stack">
      <PageHeader
        eyebrow={t.researchBadge}
        title={t.systemEvalTitle}
        description={t.systemEvalLead}
      />
      <ResearchNotice />
      <p className="rounded-[12px] border border-line bg-surface px-5 py-4 text-[16px] leading-relaxed text-ink-700 shadow-card" role="note">
        {t.systemEvalDisclaimer}
      </p>
      <p className="text-[16px] leading-relaxed text-ink-500">{t.systemEvalDistinction}</p>

      {loading ? <LoadingState message={t.systemEvalLoading} /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {data ? (
        <>
          <section className="card-surface space-y-5 p-6 md:p-8" aria-labelledby="system-eval-ml">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 id="system-eval-ml" className="section-title">
                {t.systemEvalMlHeading}
              </h2>
              <Badge>{t.datasetStatistic}</Badge>
            </div>
            <p className="text-[16px] text-ink-500">{data.ml_metrics_note}</p>
            {selectedModel ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label={t.selectedModel} value={selectedModel.model} />
                <StatCard label={t.accuracy} value={formatMetric(selectedModel.accuracy)} />
                <StatCard label={t.precision} value={formatMetric(selectedModel.precision)} />
                <StatCard label={t.recall} value={formatMetric(selectedModel.recall)} />
                <StatCard label={t.f1} value={formatMetric(selectedModel.f1)} />
                <StatCard label={t.balancedAccuracy} value={formatMetric(selectedModel.balanced_accuracy)} />
                <StatCard label={t.rocAuc} value={formatMetric(selectedModel.roc_auc)} />
                <StatCard label={t.prAuc} value={formatMetric(selectedModel.pr_auc)} />
              </div>
            ) : null}
            <div className="overflow-x-auto rounded-[14px] border border-line">
              <table className="data-table">
                <thead>
                  <tr className="border-b border-line text-ink-700">
                    <th>{t.model}</th>
                    <th>{t.accuracy}</th>
                    <th>{t.precision}</th>
                    <th>{t.recall}</th>
                    <th>{t.f1}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.models.map((model) => (
                    <tr key={model.model_key} className={model.selected ? "bg-sage font-semibold" : ""}>
                      <td>
                        {model.model}
                        {model.selected ? (
                          <span className="ml-2 text-[15px] font-semibold text-brand-800">{t.selectedPrototype}</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">{formatMetric(model.accuracy)}</td>
                      <td className="px-3 py-2">{formatMetric(model.precision)}</td>
                      <td className="px-3 py-2">{formatMetric(model.recall)}</td>
                      <td className="px-3 py-2">{formatMetric(model.f1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link to="/evaluation" className="inline-flex font-semibold text-action underline-offset-2 hover:underline">
              {t.systemEvalOpenEvaluation}
            </Link>
          </section>

          <section className="card-surface space-y-5 p-6 md:p-8" aria-labelledby="system-eval-hybrid">
            <h2 id="system-eval-hybrid" className="section-title">
              {t.systemEvalHybridHeading}
            </h2>
            <p className="text-[16px] text-ink-500">{data.hybrid.note}</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label={t.agreementCount}
                value={data.hybrid.agreement_count.toLocaleString()}
                hint={t.heldOutRows}
              />
              <StatCard
                label={t.disagreementCount}
                value={data.hybrid.disagreement_count.toLocaleString()}
                hint={t.heldOutRows}
              />
              <StatCard
                label={t.agreementPercentage}
                value={`${data.hybrid.agreement_percentage}%`}
                hint={data.hybrid.model}
              />
            </div>
            <div className="flex h-8 overflow-hidden rounded-[10px]" role="img" aria-label={t.systemEvalHybridHeading}>
              <div className="bg-accent" style={{ width: `${data.hybrid.agreement_percentage}%` }} />
              <div className="bg-line" style={{ width: `${Math.max(0, 100 - data.hybrid.agreement_percentage)}%` }} />
            </div>
          </section>

          <section className="card-surface space-y-5 p-6 md:p-8" aria-labelledby="system-eval-dataset">
            <h2 id="system-eval-dataset" className="section-title">
              {t.systemEvalDatasetHeading}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label={t.syntheticCitizens} value={data.dataset.dataset_citizen_count.toLocaleString()} />
              <StatCard label={t.citizenSchemeRecords} value={data.dataset.eligibility_record_count.toLocaleString()} />
              <StatCard label={t.labelledEligible} value={data.dataset.eligible_count.toLocaleString()} />
              <StatCard label={t.notEligibleLabel} value={data.dataset.not_eligible_count.toLocaleString()} />
              <StatCard label={t.coreMlSchemes} value={String(data.dataset.core_scheme_count)} />
              <StatCard label={t.selectedModel} value={data.dataset.selected_model} />
            </div>
            <p className="text-[16px] text-ink-500">
              {t.distributionSummary(
                data.dataset.eligible_count.toLocaleString(),
                data.dataset.eligible_percentage,
                data.dataset.not_eligible_count.toLocaleString(),
                data.dataset.not_eligible_percentage,
              )}
            </p>
            <div className="flex h-8 overflow-hidden rounded-[10px]" role="img" aria-label={t.eligibleVsNot}>
              <div className="bg-accent" style={{ width: `${data.dataset.eligible_percentage}%` }} />
              <div className="bg-line" style={{ width: `${data.dataset.not_eligible_percentage}%` }} />
            </div>
          </section>

          <section className="card-surface space-y-5 p-6 md:p-8" aria-labelledby="system-eval-api">
            <h2 id="system-eval-api" className="section-title">
              {t.systemEvalApiHeading}
            </h2>
            <p className="text-[16px] text-ink-500">{data.api_metrics_note}</p>
            {!recorded ? <p className="text-[16px] text-ink-500">{t.systemEvalNoSamples}</p> : null}
            <ApiTimingBar endpoints={data.api_performance.endpoints} />
            <div className="overflow-x-auto rounded-[14px] border border-line">
              <table className="min-w-full text-left text-[15px]">
                <thead>
                  <tr className="border-b border-line text-ink-700">
                    <th className="px-3 py-2 font-medium">{t.systemEvalEndpoint}</th>
                    <th className="px-3 py-2 font-medium">{t.systemEvalRequests}</th>
                    <th className="px-3 py-2 font-medium">{t.systemEvalErrors}</th>
                    <th className="px-3 py-2 font-medium">{t.systemEvalAvgMs}</th>
                    <th className="px-3 py-2 font-medium">{t.systemEvalMinMs}</th>
                    <th className="px-3 py-2 font-medium">{t.systemEvalMaxMs}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.api_performance.endpoints.map((row) => (
                    <tr key={row.endpoint}>
                      <td className="px-3 py-2 font-mono">{row.endpoint}</td>
                      <td className="px-3 py-2">{row.request_count}</td>
                      <td className="px-3 py-2">{row.error_count}</td>
                      <td className="px-3 py-2">{formatMsOrDash(row.average_ms, t.formatMs)}</td>
                      <td className="px-3 py-2">{formatMsOrDash(row.min_ms, t.formatMs)}</td>
                      <td className="px-3 py-2">{formatMsOrDash(row.max_ms, t.formatMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card-surface space-y-5 p-6 md:p-8" aria-labelledby="system-eval-health">
            <h2 id="system-eval-health" className="section-title">
              {t.systemEvalHealthHeading}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label={t.systemEvalHealthStatus} value={data.health.status} />
              <StatCard label={t.systemEvalHealthDatabase} value={data.health.database} />
              <StatCard label={t.systemEvalHealthEnvironment} value={data.health.environment} />
              <StatCard
                label={t.systemEvalHealthModel}
                value={data.health.model_loaded ? t.systemEvalReady : t.systemEvalNotReady}
              />
              <StatCard
                label={t.systemEvalHealthEvaluation}
                value={data.health.evaluation_ready ? t.systemEvalReady : t.systemEvalNotReady}
              />
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
