import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CitizenForm } from "../components/CitizenForm";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { ResearchNotice } from "../components/ResearchNotice";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { useI18n } from "../context/LanguageContext";
import { useRecommendation } from "../context/RecommendationContext";
import { ApiError, getMyWallet, recommendSchemes, walletToProfile } from "../services/api";
import type { RecommendResponse } from "../types/api";
import { WhyThisScheme } from "../components/WhyThisScheme";
import {
  EMPTY_FORM,
  profileToForm,
  validateCitizenForm,
  type CitizenFormValues,
  type FieldErrors,
} from "../utils/validateCitizen";

function statusOf(schemeId: string, result: RecommendResponse | null): "eligible" | "not_eligible" | "unknown" {
  if (!result) return "unknown";
  if (result.recommendations.some((scheme) => scheme.scheme_id === schemeId)) return "eligible";
  const evaluated = result.evaluated_schemes.find((scheme) => scheme.scheme_id === schemeId);
  return evaluated?.prediction === "not_eligible" ? "not_eligible" : evaluated?.prediction === "eligible" ? "eligible" : "unknown";
}

export function EligibilitySimulatorPage() {
  const { t } = useI18n();
  const { result: sessionResult } = useRecommendation();
  const [values, setValues] = useState<CitizenFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [baseline, setBaseline] = useState<RecommendResponse | null>(null);
  const [simulated, setSimulated] = useState<RecommendResponse | null>(null);
  const [hasWallet, setHasWallet] = useState(true);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const wallet = await getMyWallet();
        if (cancelled) return;
        setHasWallet(true);
        const profile = walletToProfile(wallet);
        setValues(profileToForm(profile));
        if (sessionResult) {
          setBaseline(sessionResult);
        } else {
          const current = await recommendSchemes(profile);
          if (!cancelled) setBaseline(current);
        }
      } catch (caught) {
        if (cancelled) return;
        if (caught instanceof ApiError && caught.status === 404) {
          setHasWallet(false);
        } else {
          setError(caught instanceof ApiError ? caught.message : t.networkError);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [sessionResult, t]);

  function handleChange<K extends keyof CitizenFormValues>(field: K, value: CitizenFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validated = validateCitizenForm(values, t);
    setErrors(validated.errors);
    if (!validated.profile) return;
    setRunning(true);
    setError(null);
    try {
      const next = await recommendSchemes(validated.profile);
      setSimulated(next);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.networkError);
    } finally {
      setRunning(false);
    }
  }

  const comparedIds = Array.from(
    new Set([
      ...(baseline?.evaluated_schemes.map((scheme) => scheme.scheme_id) ?? []),
      ...(simulated?.evaluated_schemes.map((scheme) => scheme.scheme_id) ?? []),
    ]),
  );
  const nameFor = (schemeId: string) =>
    baseline?.evaluated_schemes.find((scheme) => scheme.scheme_id === schemeId)?.scheme_name ??
    simulated?.evaluated_schemes.find((scheme) => scheme.scheme_id === schemeId)?.scheme_name ??
    schemeId;

  return (
    <div className="page-stack">
      <PageHeader title={t.simTitle} description={t.simLead} />
      <ResearchNotice compact />
      <p className="rounded-[12px] border border-line bg-surface px-5 py-4 text-[16px] leading-relaxed text-ink-700" role="note">
        {t.simDisclaimer}
      </p>
      {loading ? <LoadingState message={t.simLoading} /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && !hasWallet ? (
        <EmptyState title={t.simNoWallet} description={t.walletDescription}>
          <Link to="/wallet" className="btn-text inline-flex rounded-[12px] bg-action px-5 py-3 text-white">
            {t.navWallet}
          </Link>
        </EmptyState>
      ) : null}
      {!loading && hasWallet ? (
        <section aria-labelledby="sim-current-profile" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="sim-current-profile" className="section-title">
              {t.simCurrentProfile}
            </h2>
            <Badge tone="warning">{t.simLabel}</Badge>
          </div>
          <p className="text-[16px] leading-relaxed text-ink-700">{t.simTemporaryCopy}</p>
          <CitizenForm
            values={values}
            errors={errors}
            loading={running}
            submitLabel={t.simRun}
            onChange={handleChange}
            onSubmit={handleSubmit}
            onErrors={setErrors}
          >
            <Button type="button" variant="secondary" onClick={() => setSimulated(null)}>
              {t.simDiscard}
            </Button>
          </CitizenForm>
        </section>
      ) : null}

      {simulated ? (
        <section className="space-y-5" aria-labelledby="simulation-results">
          <div>
            <h2 id="simulation-results" className="section-title">
              {t.simResults}
            </h2>
            <Badge tone="warning">{t.simLabel}</Badge>
          </div>
          <div className="grid gap-4">
            {comparedIds.map((schemeId) => {
              const before = statusOf(schemeId, baseline);
              const after = statusOf(schemeId, simulated);
              const changed = before !== after;
              const evaluated = simulated.evaluated_schemes.find((scheme) => scheme.scheme_id === schemeId);
              return (
                <article key={schemeId} className="card-surface space-y-3 p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="card-title">{nameFor(schemeId)}</h3>
                    <Badge tone={changed ? "warning" : "muted"}>{changed ? t.simChanged : t.simUnchanged}</Badge>
                  </div>
                  <p className="text-[16px] text-ink-700">
                    {t.simCurrentStatus}: {before === "eligible" ? t.catalogEligibilityEligible : before === "not_eligible" ? t.catalogEligibilityNotEligible : t.catalogEligibilityIncomplete}
                  </p>
                  <p className="text-[16px] font-semibold text-ink-900">
                    {t.simNewStatus}: {after === "eligible" ? t.catalogEligibilityEligible : after === "not_eligible" ? t.catalogEligibilityNotEligible : t.catalogEligibilityIncomplete}
                  </p>
                  {evaluated ? (
                    <WhyThisScheme
                      title={t.whyThisResult}
                      data={{
                        ruleEligible: evaluated.rule_eligible,
                        ruleReasons: [],
                        fallbackReason: evaluated.reason,
                        mlPrediction: evaluated.ml_prediction,
                        agreement: evaluated.agreement,
                        eligibleProbability: evaluated.eligible_probability,
                        outcome: after === "unknown" ? "incomplete" : after,
                      }}
                    />
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
