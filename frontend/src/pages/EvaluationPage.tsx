import { useEffect, useState } from "react";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { ResearchNotice } from "../components/ResearchNotice";
import { SystemFlow } from "../components/SystemFlow";
import { StatCard } from "../components/ui/StatCard";
import { useI18n } from "../context/LanguageContext";
import type { Messages } from "../i18n/types";
import { ApiError, fetchEvaluationBundle } from "../services/api";
import type { ConfusionMatrixRow, EvaluationBundle, FeatureRow } from "../types/api";

function formatMetric(value: number): string {
  return value.toFixed(4);
}

function FeatureTable({
  title,
  rows,
  valueLabel,
  featureLabel,
}: {
  title: string;
  rows: FeatureRow[];
  valueLabel: string;
  featureLabel: string;
}) {
  return (
    <div className="overflow-x-auto">
      <h3 className="mb-2 text-base font-semibold text-ink-900">{title}</h3>
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-ink-700">
            <th className="py-2 pr-4 font-medium">{featureLabel}</th>
            <th className="py-2 font-medium">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 12).map((row) => (
            <tr key={row.feature} className="border-b border-line">
              <td className="py-2 pr-4 font-mono text-xs sm:text-sm">{row.feature}</td>
              <td className="py-2">{row.value.toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConfusionGrid({ matrix, t }: { matrix: ConfusionMatrixRow; t: Messages }) {
  return (
    <div className="max-w-xl space-y-3" role="table" aria-label={`${matrix.model} ${t.confusionHeading.toLowerCase()}`}>
      <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-3">
        <p className="sr-only">{t.confusionHelp}</p>
        <span />
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-ink-500">
          {t.predictedNotEligible}
        </p>
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-ink-500">
          {t.predictedEligibleShort}
        </p>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 [writing-mode:vertical-rl] rotate-180">
          {t.actual}
        </p>
        <div className="rounded-xl border border-line bg-canvas p-4">
          <p className="text-xs font-medium uppercase text-ink-500">{t.trueNegative}</p>
          <p className="mt-1 text-2xl font-semibold">{matrix.true_negative}</p>
        </div>
        <div className="rounded-xl border border-line bg-canvas p-4">
          <p className="text-xs font-medium uppercase text-ink-500">{t.falsePositive}</p>
          <p className="mt-1 text-2xl font-semibold">{matrix.false_positive}</p>
        </div>
        <span />
        <div className="rounded-xl border border-line bg-canvas p-4">
          <p className="text-xs font-medium uppercase text-ink-500">{t.falseNegative}</p>
          <p className="mt-1 text-2xl font-semibold">{matrix.false_negative}</p>
        </div>
        <div className="rounded-xl border border-line bg-canvas p-4">
          <p className="text-xs font-medium uppercase text-ink-500">{t.truePositive}</p>
          <p className="mt-1 text-2xl font-semibold">{matrix.true_positive}</p>
        </div>
      </div>
    </div>
  );
}

export function EvaluationPage() {
  const { t } = useI18n();
  const [data, setData] = useState<EvaluationBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [matrixModel, setMatrixModel] = useState("Decision Tree");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchEvaluationBundle());
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.evaluationLoadError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedMatrix = data?.confusion.matrices.find((item) => item.model === matrixModel);

  return (
    <div className="space-y-12">
      <header className="space-y-5">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-accent">
          {t.evaluationEyebrow}
        </p>
        <h1 className="page-title">{t.evaluationTitle}</h1>
        <p className="inline-flex rounded-[12px] bg-brand-900 px-4 py-3 text-[16px] font-semibold text-white">
          {t.evaluationSynthetic}
        </p>
        <p className="rounded-[12px] border border-line bg-surface px-4 py-3 text-[16px] font-medium text-ink-700 shadow-card">
          {t.evaluationBanner}
        </p>
        <p className="max-w-3xl text-[18px] leading-relaxed text-ink-500">{t.evaluationLead}</p>
      </header>
      <ResearchNotice />

      {loading ? <LoadingState message={t.loadingEvaluation} /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {data ? (
        <>
          <section aria-labelledby="overview-heading" className="space-y-4">
            <h2 id="overview-heading" className="section-title">
              {t.overviewHeading}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label={t.syntheticCitizens} value={data.overview.dataset_citizen_count.toLocaleString()} hint={t.datasetStatistic} />
              <StatCard label={t.citizenSchemeRecords} value={data.overview.eligibility_record_count.toLocaleString()} hint={t.datasetStatistic} />
              <StatCard label={t.labelledEligible} value={data.overview.eligible_count.toLocaleString()} hint={t.ruleDerivedLabels} />
              <StatCard label={t.eligibleShare} value={`${data.overview.eligible_percentage}%`} hint={t.datasetStatistic} />
              <StatCard label={t.selectedModel} value={data.overview.selected_model} />
              <StatCard label={t.coreMlSchemes} value={String(data.overview.core_scheme_count)} />
            </div>
          </section>

          <section aria-labelledby="distribution-heading" className="space-y-4">
            <h2 id="distribution-heading" className="section-title">
              {t.distributionHeading}
            </h2>
            <p className="text-[16px] text-ink-500">
              {t.distributionSummary(
                data.overview.eligible_count.toLocaleString(),
                data.overview.eligible_percentage,
                data.overview.not_eligible_count.toLocaleString(),
                data.overview.not_eligible_percentage,
              )}
            </p>
            <div className="card-surface p-5">
              <div className="flex h-8 overflow-hidden rounded-[10px]" role="img" aria-label={t.eligibleVsNot}>
                <div className="bg-accent" style={{ width: `${data.overview.eligible_percentage}%` }} />
                <div className="bg-line" style={{ width: `${data.overview.not_eligible_percentage}%` }} />
              </div>
            </div>
          </section>

          <section aria-labelledby="models-heading" className="space-y-4">
            <h2 id="models-heading" className="section-title">
              {t.modelComparison}
            </h2>
            <p className="text-[16px] text-ink-500">{data.models.note}</p>
            <p className="text-[16px] text-ink-500">{t.decisionTreeSelected}</p>
            <div className="overflow-x-auto rounded-[14px] border border-line bg-surface shadow-card">
              <table className="min-w-full text-left text-[15px]">
                <thead>
                  <tr className="border-b border-line text-ink-700">
                    <th className="px-3 py-2 font-medium">{t.model}</th>
                    <th className="px-3 py-2 font-medium">{t.accuracy}</th>
                    <th className="px-3 py-2 font-medium">{t.precision}</th>
                    <th className="px-3 py-2 font-medium">{t.recall}</th>
                    <th className="px-3 py-2 font-medium">{t.f1}</th>
                    <th className="px-3 py-2 font-medium">{t.balancedAccuracy}</th>
                    <th className="px-3 py-2 font-medium">{t.rocAuc}</th>
                    <th className="px-3 py-2 font-medium">{t.prAuc}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.models.models.map((model) => (
                    <tr key={model.model_key} className={model.selected ? "bg-canvas font-semibold" : ""}>
                      <td className="px-3 py-2">
                        {model.model}
                        {model.selected ? (
                          <span className="ml-2 text-xs font-normal text-brand-800">
                            {t.selectedPrototype}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">{formatMetric(model.accuracy)}</td>
                      <td className="px-3 py-2">{formatMetric(model.precision)}</td>
                      <td className="px-3 py-2">{formatMetric(model.recall)}</td>
                      <td className="px-3 py-2">{formatMetric(model.f1)}</td>
                      <td className="px-3 py-2">{formatMetric(model.balanced_accuracy)}</td>
                      <td className="px-3 py-2">{formatMetric(model.roc_auc)}</td>
                      <td className="px-3 py-2">{formatMetric(model.pr_auc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="schemes-heading" className="space-y-4">
            <h2 id="schemes-heading" className="section-title">
              {t.schemeDistribution}
            </h2>
            <p className="text-[16px] text-ink-500">{data.schemes.note}</p>
            <div className="card-surface space-y-4 p-5">
              {data.schemes.schemes.map((scheme) => (
                <div key={scheme.scheme_id}>
                  <div className="flex flex-wrap justify-between gap-2 text-sm">
                    <p className="font-medium text-ink-900">{scheme.scheme_name}</p>
                    <p className="text-ink-700">
                      {t.eligibleLabel} {scheme.eligible_count.toLocaleString()} · {t.notEligibleLabel}{" "}
                      {scheme.not_eligible_count.toLocaleString()} · {scheme.eligible_percentage}%
                    </p>
                  </div>
                  <div className="mt-1 h-3 overflow-hidden rounded bg-line">
                    <div className="h-full bg-action" style={{ width: `${scheme.eligible_percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="confusion-heading" className="space-y-4">
            <h2 id="confusion-heading" className="section-title">
              {t.confusionHeading}
            </h2>
            <p className="text-[16px] text-ink-500">{data.confusion.note}</p>
            <p className="text-[16px] text-ink-500">{t.confusionHelp}</p>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label={t.confusionTabs}>
              {data.confusion.matrices.map((item) => (
                <button
                  key={item.model}
                  type="button"
                  role="tab"
                  aria-selected={matrixModel === item.model}
                  onClick={() => setMatrixModel(item.model)}
                  className={
                    matrixModel === item.model
                      ? "rounded-lg bg-brand-900 px-3 py-1.5 text-sm font-medium text-white"
                      : "rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink-700"
                  }
                >
                  {item.model}
                </button>
              ))}
            </div>
            {selectedMatrix ? <ConfusionGrid matrix={selectedMatrix} t={t} /> : null}
          </section>

          {data.hybrid ? (
            <section aria-labelledby="hybrid-heading" className="space-y-4">
              <h2 id="hybrid-heading" className="section-title">
                {t.hybridHeading}
              </h2>
              <p className="text-[16px] text-ink-500">{data.hybrid.note}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label={t.agreementCount} value={data.hybrid.agreement_count.toLocaleString()} hint={t.heldOutRows} />
                <StatCard label={t.disagreementCount} value={data.hybrid.disagreement_count.toLocaleString()} hint={t.heldOutRows} />
                <StatCard label={t.agreementPercentage} value={`${data.hybrid.agreement_percentage}%`} hint={data.hybrid.model} />
              </div>
              <p className="text-sm text-ink-500">{t.hybridAgreementNote}</p>
            </section>
          ) : null}

          <section aria-labelledby="features-heading" className="space-y-4">
            <h2 id="features-heading" className="section-title">
              {t.featuresHeading}
            </h2>
            <p className="text-[16px] text-ink-500">{data.features.note}</p>
            <div className="card-surface grid gap-6 p-6 lg:grid-cols-3">
              <FeatureTable title={t.dtImportance} rows={data.features.decision_tree_importance} valueLabel={t.importance} featureLabel={t.feature} />
              <FeatureTable title={t.lrCoefficients} rows={data.features.logistic_regression_coefficients} valueLabel={t.coefficient} featureLabel={t.feature} />
              <FeatureTable title={t.rfImportance} rows={data.features.random_forest_importance} valueLabel={t.importance} featureLabel={t.feature} />
            </div>
          </section>

          <section aria-labelledby="flow-heading" className="space-y-4">
            <h2 id="flow-heading" className="section-title">
              {t.systemWorks}
            </h2>
            <SystemFlow />
          </section>

          <section aria-labelledby="limits-heading" className="space-y-4">
            <h2 id="limits-heading" className="section-title">
              {t.limitationsHeading}
            </h2>
            <p className="rounded-xl border border-line bg-amber-50 px-4 py-3 text-ink-700">
              {data.limitations.prototype_notice}
            </p>
            <ul className="space-y-3">
              {data.limitations.limitations.map((item) => (
                <li key={item.id} className="rounded-2xl border border-line bg-surface p-4">
                  <p className="font-medium text-ink-900">{item.title}</p>
                  <p className="mt-1 text-sm text-ink-700">{item.detail}</p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="sources-heading" className="space-y-4">
            <h2 id="sources-heading" className="section-title">
              {t.officialSources}
            </h2>
            <ul className="space-y-2 rounded-2xl border border-line bg-surface p-4">
              {data.limitations.official_sources.map((source) => (
                <li key={source.scheme_id}>
                  <span className="font-mono text-xs text-ink-500">{source.scheme_id}</span>{" "}
                  {source.official_source_url ? (
                    <a href={source.official_source_url} className="text-action underline" target="_blank" rel="noreferrer">
                      {source.scheme_name}
                    </a>
                  ) : (
                    <span>{source.scheme_name}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
