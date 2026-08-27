import { useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../context/LanguageContext";
import type { RecommendedScheme } from "../types/api";
import { displayCatalogText, isUnverified } from "../utils/catalogText";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";

function CatalogValue({ value, missing, unverifiedLabel }: { value: string | null; missing: string; unverifiedLabel: string }) {
  const text = displayCatalogText(value, missing);
  const unverified = isUnverified(value);
  return (
    <p className="text-[17px] leading-relaxed text-ink-500">
      {text}
      {unverified ? (
        <span className="mt-1 block text-[15px] font-semibold text-warning">{unverifiedLabel}</span>
      ) : null}
    </p>
  );
}

export function SchemeCard({
  scheme,
  compareEnabled = false,
  compareChecked = false,
  compareLocked = false,
  onCompareToggle,
}: {
  scheme: RecommendedScheme;
  compareEnabled?: boolean;
  compareChecked?: boolean;
  compareLocked?: boolean;
  onCompareToggle?: () => void;
}) {
  const { language, t } = useI18n();
  const [open, setOpen] = useState(true);
  const reasons = scheme.rule_reasons ?? scheme.rule_result?.reasons ?? [];
  const mlLabel = scheme.ml_prediction === "not_eligible" ? t.mlNotEligible : t.mlEligible;
  const status = language === "ta" ? t.predictedEligible : scheme.status_label || t.predictedEligible;

  return (
    <article className="card-surface p-6 md:p-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="success">{status}</Badge>
          {scheme.scheme_category ? <Badge tone="muted">{scheme.scheme_category}</Badge> : null}
        </div>
        <h3 className="card-title">
          <Link to={`/schemes/${scheme.scheme_id}`} className="hover:text-action hover:underline">
            {scheme.scheme_name}
          </Link>
        </h3>
        {scheme.department ? <p className="text-[16px] text-ink-500">{scheme.department}</p> : null}
      </header>

      <section className="mt-6 rounded-[12px] bg-canvas px-4 py-4">
        <h4 className="text-[15px] font-semibold text-ink-900">{t.probabilityLabel}</h4>
        <p className="mt-1 text-[32px] font-extrabold tracking-tight text-brand-900">
          {`${(scheme.eligible_probability * 100).toFixed(0)}%`}
        </p>
        <p className="mt-1 text-[15px] text-ink-500">{t.probabilityExplanation}</p>
      </section>

      {reasons.length > 0 ? (
        <section className="mt-6 space-y-2">
          <h4 className="text-[16px] font-semibold text-ink-900">{t.documentedConditions}</h4>
          <ul className="space-y-2 text-[17px] text-ink-500">
            {reasons.map((reason) => (
              <li key={reason} className="flex gap-2">
                <span className="mt-1 text-accent" aria-hidden="true">
                  ✓
                </span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="mt-6 space-y-1">
          <h4 className="text-[16px] font-semibold text-ink-900">{t.whyMatch}</h4>
          <p className="text-[17px] text-ink-500">{scheme.reason}</p>
        </section>
      )}

      <section className="mt-5 space-y-1">
        <h4 className="text-[16px] font-semibold text-ink-900">{t.mlPrediction}</h4>
        <p className="text-[17px] text-ink-500">{mlLabel}</p>
      </section>

      {scheme.agreement === false ? (
        <aside className="mt-5 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-ink-700" role="status">
          <p className="font-semibold text-warning">{t.ruleMlDiffer}</p>
          <p className="mt-1 text-[15px]">{t.ruleMlDifferDetail}</p>
        </aside>
      ) : null}
      {scheme.agreement === true ? (
        <p className="mt-5 text-[16px] font-semibold text-accent">{t.ruleMlAgree}</p>
      ) : null}

      <section className="mt-5 space-y-1">
        <h4 className="text-[16px] font-semibold text-ink-900">{t.potentialBenefit}</h4>
        <CatalogValue value={scheme.benefit} missing={t.catalogMissing} unverifiedLabel={t.needsVerification} />
      </section>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Link
          to={`/schemes/${scheme.scheme_id}`}
          className="btn-text inline-flex items-center justify-center rounded-[12px] border border-line bg-surface px-5 py-3 text-ink-900 hover:border-slate-300 hover:bg-canvas"
        >
          {t.viewDetails}
        </Link>
        <Button type="button" variant="secondary" onClick={() => setOpen((value) => !value)}>
          {open ? t.hideDetails : t.viewScheme}
        </Button>
        {scheme.official_source_url ? (
          <a
            href={scheme.official_source_url}
            target="_blank"
            rel="noreferrer"
            className="btn-text inline-flex items-center rounded-[12px] bg-brand-900 px-5 py-3 text-white transition duration-150 hover:bg-brand-800"
          >
            {t.viewOfficialSource}
          </a>
        ) : null}
        {compareEnabled ? (
          <label className="inline-flex items-center gap-2 rounded-[12px] border border-line px-4 py-3 text-[16px] font-semibold text-ink-900">
            <input
              type="checkbox"
              className="h-4 w-4 accent-action"
              checked={compareChecked}
              disabled={compareLocked}
              onChange={onCompareToggle}
            />
            <span>{t.selectForComparison}</span>
          </label>
        ) : null}
      </div>

      {open ? (
        <div className="mt-6 space-y-5 border-t border-line pt-6">
          <section>
            <h4 className="text-[16px] font-semibold text-ink-900">{t.aboutScheme}</h4>
            <CatalogValue value={scheme.description} missing={t.catalogMissing} unverifiedLabel={t.needsVerification} />
          </section>
          <section>
            <h4 className="text-[16px] font-semibold text-ink-900">{t.requiredDocuments}</h4>
            <CatalogValue
              value={scheme.required_documents}
              missing={t.catalogMissing}
              unverifiedLabel={t.needsVerification}
            />
          </section>
          <section>
            <h4 className="text-[16px] font-semibold text-ink-900">{t.howToApply}</h4>
            <CatalogValue
              value={scheme.application_method}
              missing={t.catalogMissing}
              unverifiedLabel={t.needsVerification}
            />
          </section>
          <p className="text-[15px] text-ink-500">{t.probabilityExplanation}</p>
        </div>
      ) : null}
    </article>
  );
}
