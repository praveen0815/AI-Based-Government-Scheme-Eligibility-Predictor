import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { ResearchNotice } from "../components/ResearchNotice";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/LanguageContext";
import { useRecommendation } from "../context/RecommendationContext";
import { WhyThisScheme } from "../components/WhyThisScheme";
import { ApiError, downloadRecommendationReport, fetchSchemeCatalog } from "../services/api";
import { incompleteProfileFields } from "../utils/profileCompleteness";
import type { EvaluatedScheme, RecommendedScheme, SchemeCatalogItem } from "../types/api";
import { displayCatalogText, isUnverified } from "../utils/catalogText";

function CatalogField({
  title,
  value,
  missing,
  unverifiedLabel,
}: {
  title: string;
  value: string | null | undefined;
  missing: string;
  unverifiedLabel: string;
}) {
  return (
    <section className="card-surface p-6 md:p-7">
      <h2 className="text-[20px] font-semibold text-ink-900">{title}</h2>
      <p className="mt-3 text-[17px] leading-relaxed text-ink-500">{displayCatalogText(value, missing)}</p>
      {isUnverified(value) ? <p className="mt-2 text-[15px] font-semibold text-warning">{unverifiedLabel}</p> : null}
    </section>
  );
}

function findEvaluatedScheme(result: { evaluated_schemes: EvaluatedScheme[] } | null, schemeId: string) {
  return result?.evaluated_schemes.find((scheme) => scheme.scheme_id === schemeId) ?? null;
}

function findRecommendedScheme(result: { recommendations: RecommendedScheme[] } | null, schemeId: string) {
  return result?.recommendations.find((scheme) => scheme.scheme_id === schemeId) ?? null;
}

export function SchemeDetailPage() {
  const { schemeId = "" } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t } = useI18n();
  const { profile, result } = useRecommendation();
  const [scheme, setScheme] = useState<SchemeCatalogItem | null>(null);
  const [found, setFound] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadScheme() {
      setLoading(true);
      setError(null);
      setFound(true);
      try {
        const catalog = await fetchSchemeCatalog();
        if (cancelled) return;
        const match = catalog.schemes.find((item) => item.scheme_id === schemeId);
        setScheme(match ?? null);
        setFound(Boolean(match));
      } catch (caught) {
        if (!cancelled) {
          setScheme(null);
          setError(caught instanceof ApiError ? caught.message : t.networkError);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadScheme();
    return () => {
      cancelled = true;
    };
  }, [schemeId, t]);

  const recommended = findRecommendedScheme(result, schemeId);
  const evaluated = findEvaluatedScheme(result, schemeId);
  const hasSessionResult = Boolean(result);
  const isPredictedEligible = Boolean(recommended);
  const isNotRecommended = hasSessionResult && !recommended && Boolean(evaluated);
  const reasons = recommended?.rule_reasons ?? recommended?.rule_result?.reasons ?? [];
  const explanation = recommended ?? evaluated;
  const probability = recommended?.eligible_probability ?? evaluated?.eligible_probability;
  const recommendedIds = result?.recommendations.map((item) => item.scheme_id) ?? [];
  const canCompare = isAuthenticated && isPredictedEligible && recommendedIds.length >= 2;
  const canDownload = isAuthenticated && hasSessionResult;
  const checkPath = isAuthenticated ? "/wallet" : "/check";

  function handleCompare() {
    if (!canCompare) return;
    const schemeIds = [schemeId, ...recommendedIds.filter((id) => id !== schemeId)].slice(0, 3);
    navigate("/compare", { state: { schemeIds } });
  }

  async function handleDownload() {
    if (!canDownload) return;
    setDownloading(true);
    setActionError(null);
    try {
      await downloadRecommendationReport(canCompare ? [schemeId, ...recommendedIds.filter((id) => id !== schemeId)].slice(0, 3) : []);
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : t.networkError);
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingState message={t.schemeDetailLoading} />
        <div className="grid gap-4">
          <div className="card-surface h-40 animate-pulse bg-canvas" />
          <div className="card-surface h-32 animate-pulse bg-canvas" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <ErrorState message={error} />
        <Link to="/schemes" className="font-semibold text-action">
          {t.viewAllSchemes}
        </Link>
      </div>
    );
  }

  if (!found || !scheme) {
    return (
      <EmptyState title={t.schemeNotFoundTitle} description={t.schemeNotFoundLead}>
        <Link
          to="/schemes"
          className="btn-text inline-flex items-center justify-center rounded-[12px] bg-action px-6 py-3 text-white hover:bg-action-hover"
        >
          {t.viewAllSchemes}
        </Link>
      </EmptyState>
    );
  }

  const ruleEligible = recommended?.rule_result?.eligible ?? evaluated?.rule_eligible;
  const mlPrediction = recommended?.ml_prediction ?? evaluated?.ml_prediction;
  const agreement = recommended?.agreement ?? evaluated?.agreement;

  return (
    <div className="space-y-8">
      <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-accent">{t.aiResearchPrototype}</p>
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{t.coreBadge}</Badge>
          {scheme.scheme_category ? <Badge tone="muted">{scheme.scheme_category}</Badge> : null}
        </div>
        <h1 className="page-title">{scheme.scheme_name}</h1>
        <p className="font-mono text-[16px] text-ink-500">
          {t.schemeIdLabel}: {scheme.scheme_id}
        </p>
        {scheme.department ? <p className="text-[17px] text-ink-500">{scheme.department}</p> : null}
        <p className="max-w-3xl text-[18px] leading-relaxed text-ink-500">
          {displayCatalogText(scheme.description, t.catalogMissing)}
        </p>
        {scheme.official_source_url ? (
          <a
            href={scheme.official_source_url}
            target="_blank"
            rel="noreferrer"
            className="btn-text inline-flex items-center justify-center rounded-[12px] bg-brand-900 px-5 py-3 text-white hover:bg-brand-800"
          >
            {t.visitOfficialWebsite}
          </a>
        ) : null}
      </header>

      <ResearchNotice compact />

      <section className="card-surface space-y-4 p-6 md:p-8" aria-labelledby="scheme-eligibility-status">
        <h2 id="scheme-eligibility-status" className="section-title">
          {t.probabilityLabel}
        </h2>
        {isPredictedEligible ? (
          <>
            <Badge tone="success">{t.predictedEligible}</Badge>
            {typeof probability === "number" ? (
              <p className="text-[40px] font-extrabold tracking-tight text-brand-900">{`${(probability * 100).toFixed(0)}%`}</p>
            ) : null}
            <p className="text-[17px] leading-relaxed text-ink-500">{t.schemeDetailPredictionDisclaimer}</p>
          </>
        ) : isNotRecommended ? (
          <>
            <Badge tone="muted">{t.notRecommended}</Badge>
            {typeof probability === "number" ? (
              <p className="text-[28px] font-extrabold tracking-tight text-ink-900">{`${(probability * 100).toFixed(0)}%`}</p>
            ) : null}
            <p className="text-[17px] leading-relaxed text-ink-500">{t.notOfficialRejection}</p>
            <p className="text-[16px] leading-relaxed text-ink-500">{t.schemeDetailPredictionDisclaimer}</p>
          </>
        ) : (
          <EmptyState title={t.schemeDetailCheckPrompt} description={t.schemeDetailPredictionDisclaimer}>
            <Button type="button" onClick={() => navigate(checkPath)}>
              {t.navCheck}
            </Button>
          </EmptyState>
        )}
      </section>

      {explanation && (isPredictedEligible || isNotRecommended) ? (
        <div className="card-surface p-6 md:p-8">
          <WhyThisScheme
            headingId="scheme-why-recommended"
            title={isPredictedEligible ? t.whyRecommended : t.documentedConditions}
            collapsible={false}
            data={{
              ruleEligible,
              ruleReasons: reasons,
              fallbackReason: recommended?.reason ?? evaluated?.reason,
              mlPrediction,
              agreement,
              eligibleProbability: probability,
              officialSourceUrl: scheme.official_source_url ?? recommended?.official_source_url,
              incompleteFields: incompleteProfileFields(profile),
            }}
          />
        </div>
      ) : null}

      <div className="grid gap-5">
        <CatalogField
          title={t.aboutScheme}
          value={scheme.description}
          missing={t.catalogMissing}
          unverifiedLabel={t.needsVerification}
        />
        <CatalogField
          title={t.potentialBenefit}
          value={scheme.benefit_description}
          missing={t.catalogMissing}
          unverifiedLabel={t.needsVerification}
        />
        <CatalogField
          title={t.eligibilityNotes}
          value={scheme.eligibility_notes}
          missing={t.catalogMissing}
          unverifiedLabel={t.needsVerification}
        />
        <CatalogField
          title={t.requiredDocuments}
          value={scheme.required_documents}
          missing={t.catalogMissing}
          unverifiedLabel={t.needsVerification}
        />
        <CatalogField
          title={t.howToApply}
          value={scheme.application_method}
          missing={t.catalogMissing}
          unverifiedLabel={t.needsVerification}
        />
        <CatalogField
          title={t.compareDepartment}
          value={scheme.department}
          missing={t.catalogMissing}
          unverifiedLabel={t.needsVerification}
        />
      </div>

      {actionError ? <ErrorState message={actionError} /> : null}

      <section className="card-surface p-6 md:p-7" aria-labelledby="scheme-detail-actions">
        <h2 id="scheme-detail-actions" className="section-title">
          {t.dashboardMoreActions}
        </h2>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="button" onClick={() => navigate(checkPath)}>
            {t.navCheck}
          </Button>
          <Button type="button" variant="secondary" disabled={!canCompare} onClick={handleCompare}>
            {t.compareSchemes}
          </Button>
          <Button type="button" variant="secondary" disabled={!canDownload || downloading} onClick={() => void handleDownload()}>
            {t.downloadPdf}
          </Button>
          {scheme.official_source_url ? (
            <a
              href={scheme.official_source_url}
              target="_blank"
              rel="noreferrer"
              className="btn-text inline-flex items-center justify-center rounded-[12px] border border-line px-5 py-3 text-ink-900 hover:bg-canvas"
            >
              {t.visitOfficialWebsite}
            </a>
          ) : null}
        </div>
        {!canCompare ? <p className="mt-4 text-[16px] text-ink-500">{t.dashboardCompareNeedsRecommendations}</p> : null}
      </section>
    </div>
  );
}
