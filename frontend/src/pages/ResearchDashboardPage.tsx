import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { ResearchNotice } from "../components/ResearchNotice";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { useI18n } from "../context/LanguageContext";
import { ApiError, fetchEvaluationBundle, fetchSystemEvaluation } from "../services/api";
import type { EvaluationBundle, SystemEvaluationResponse } from "../types/api";

export function ResearchDashboardPage() {
  const { t } = useI18n();
  const [system, setSystem] = useState<SystemEvaluationResponse | null>(null);
  const [bundle, setBundle] = useState<EvaluationBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [nextSystem, nextBundle] = await Promise.all([
        fetchSystemEvaluation(),
        fetchEvaluationBundle().catch(() => null),
      ]);
      setSystem(nextSystem);
      setBundle(nextBundle);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.networkError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const overview = system?.dataset ?? bundle?.overview;
  const hybrid = system?.hybrid ?? bundle?.hybrid;
  const selectedModel = system?.models.find((model) => model.selected) ?? system?.models[0];

  return (
    <div className="mx-auto max-w-6xl page-stack">
      <PageHeader eyebrow={t.researchBadge} title={t.researchDashTitle} description={t.researchDashLead} />
      <ResearchNotice />
      <p className="rounded-[12px] border border-line bg-surface px-5 py-4 text-[16px] leading-relaxed text-ink-700" role="note">
        {t.researchDashDisclaimer}
      </p>
      {loading ? <LoadingState message={t.dashboardLoading} /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {overview ? (
        <section className="space-y-4">
          <h2 className="section-title">{t.systemEvalTitle}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard label={t.researchCitizens} value={overview.dataset_citizen_count.toLocaleString()} />
            <StatCard label={t.researchSchemes} value={overview.official_scheme_count.toLocaleString()} />
            <StatCard label={t.researchEvaluations} value={overview.eligibility_record_count.toLocaleString()} />
            <StatCard label={t.researchEligible} value={`${overview.eligible_percentage}%`} />
            <StatCard label={t.researchNotEligible} value={`${overview.not_eligible_percentage}%`} />
            <StatCard label={t.dashCannotEvaluate} value="—" hint={t.whyRequiredToEvaluate} />
          </div>
        </section>
      ) : null}

      {selectedModel ? (
        <section className="card-surface space-y-3 p-6">
          <h2 className="section-title">{t.systemEvalMlHeading}</h2>
          <p className="text-[16px] text-ink-700">
            {selectedModel.model}: F1 {selectedModel.f1.toFixed(3)}, accuracy {selectedModel.accuracy.toFixed(3)}
          </p>
          {hybrid ? (
            <p className="text-[16px] text-ink-700">
              {t.whyAgreementLabel}: {hybrid.agreement_percentage}%
            </p>
          ) : null}
        </section>
      ) : null}

      {system?.api_performance ? (
        <section className="card-surface space-y-3 p-6">
          <h2 className="section-title">{t.systemEvalApiHeading}</h2>
          <ul className="space-y-2 text-[16px] text-ink-700">
            {system.api_performance.endpoints.slice(0, 8).map((row) => (
              <li key={row.endpoint} className="flex justify-between gap-3">
                <span className="font-mono">{row.endpoint}</span>
                <span>{row.average_ms == null ? "—" : `${row.average_ms.toFixed(1)} ms`}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {system?.health ? (
        <section className="card-surface space-y-2 p-6">
          <h2 className="section-title">{t.systemEvalHealthHeading}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label={t.systemEvalHealthStatus} value={system.health.status} />
            <StatCard label={t.systemEvalHealthDatabase} value={system.health.database} />
            <StatCard label={t.systemEvalHealthEnvironment} value={system.health.environment} />
            <StatCard
              label={t.systemEvalHealthModel}
              value={system.health.model_loaded ? t.yes : t.no}
            />
          </div>
        </section>
      ) : null}

      <nav className="flex flex-wrap gap-3">
        <Link to="/evaluation" className="rounded-[12px] border border-line px-4 py-2.5 text-[16px] font-semibold hover:bg-sage">
          {t.navEvaluation}
        </Link>
        <Link to="/system-evaluation" className="rounded-[12px] border border-line px-4 py-2.5 text-[16px] font-semibold hover:bg-sage">
          {t.navSystemEvaluation}
        </Link>
        <Link to="/schemes" className="rounded-[12px] border border-line px-4 py-2.5 text-[16px] font-semibold hover:bg-sage">
          {t.navSchemes}
        </Link>
      </nav>
    </div>
  );
}
