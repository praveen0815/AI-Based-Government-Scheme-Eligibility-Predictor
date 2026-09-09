import { useState } from "react";
import { useI18n } from "../context/LanguageContext";
import type { PredictionLabel } from "../types/api";
import { profileFieldLabel } from "../utils/displayLabels";

export interface WhyThisSchemeData {
  ruleEligible?: boolean;
  ruleReasons: string[];
  fallbackReason?: string;
  mlPrediction?: PredictionLabel;
  agreement?: boolean;
  eligibleProbability?: number;
  officialSourceUrl?: string | null;
  incompleteFields?: string[];
  outcome?: "eligible" | "not_eligible" | "incomplete";
}

export function WhyThisScheme({
  data,
  title,
  headingId,
  defaultOpen = false,
  collapsible = true,
}: {
  data: WhyThisSchemeData;
  title: string;
  headingId?: string;
  defaultOpen?: boolean;
  collapsible?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(defaultOpen || !collapsible);
  const mlLabel = data.mlPrediction === "not_eligible" ? t.mlNotEligible : t.mlEligible;
  const reviewFields = data.incompleteFields ?? [];
  const hasReviewItems = reviewFields.length > 0;

  const outcome = data.outcome ?? (data.ruleEligible === false ? "not_eligible" : hasReviewItems ? "incomplete" : "eligible");

  const body = (
    <div className="space-y-5">
      {data.ruleEligible !== undefined || data.mlPrediction ? (
        <section className="rounded-[12px] border border-line bg-surface px-4 py-4">
          <h3 className="text-[16px] font-semibold text-ink-900">{t.whyDecisionSummary}</h3>
          <ul className="mt-3 space-y-2 text-[16px] text-ink-700">
            {data.ruleEligible !== undefined ? (
              <li>
                {t.whyRuleEngineLabel}: {data.ruleEligible ? t.catalogEligibilityEligible : t.catalogEligibilityNotEligible}
              </li>
            ) : null}
            {data.mlPrediction ? (
              <li>
                {t.whyMlLabel}: {mlLabel}
              </li>
            ) : null}
            {data.agreement !== undefined ? (
              <li>
                {t.whyAgreementLabel}: {data.agreement ? t.whyAgreementYes : t.whyAgreementNo}
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {outcome === "incomplete" || hasReviewItems ? (
        <section className="rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-4" role="status">
          <h3 className="text-[16px] font-semibold text-ink-900">{t.whyCannotEvaluate}</h3>
          <p className="mt-1 text-[16px] leading-relaxed text-ink-700">{t.whyRequiredToEvaluate}</p>
          {hasReviewItems ? (
            <>
              <p className="mt-3 text-[16px] font-semibold text-ink-900">{t.whyMissingInformation}</p>
              <ul className="mt-2 space-y-2 text-[17px] text-ink-700">
                {reviewFields.map((field) => (
                  <li key={field} className="flex gap-2">
                    <span aria-hidden="true">⚠</span>
                    <span>{profileFieldLabel(field, t)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}

      <section>
        <h3 className="text-[16px] font-semibold text-ink-900">{t.whyRulesChecked}</h3>
        <p className="mt-1 text-[16px] leading-relaxed text-ink-500">{t.whyRulesCheckedLead}</p>
        {data.ruleReasons.length > 0 ? (
          <ul className="mt-3 space-y-2 text-[17px] text-ink-500">
            {data.ruleReasons.map((reason) => (
              <li key={reason} className="flex gap-2">
                <span className="mt-1 text-accent" aria-hidden="true">
                  {data.ruleEligible === false ? "✕" : "✓"}
                </span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        ) : data.fallbackReason ? (
          <p className="mt-3 text-[17px] leading-relaxed text-ink-500">{data.fallbackReason}</p>
        ) : null}
      </section>

      {data.ruleEligible !== undefined ? (
        <section>
          <h3 className="text-[16px] font-semibold text-ink-900">{t.ruleResultLabel}</h3>
          <p className="mt-1 text-[17px] leading-relaxed text-ink-500">
            {data.ruleEligible ? t.whyRuleEligible : t.whyRuleNotEligible}
          </p>
        </section>
      ) : null}

      {data.mlPrediction ? (
        <section>
          <h3 className="text-[16px] font-semibold text-ink-900">{t.whyMlPredicted}</h3>
          <p className="mt-1 text-[17px] leading-relaxed text-ink-500">{t.whyMlPredictedLead(mlLabel)}</p>
        </section>
      ) : null}

      {data.agreement === false ? (
        <aside className="rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-ink-700" role="status">
          <p className="font-semibold text-warning">{t.ruleMlDiffer}</p>
          <p className="mt-1 text-[15px]">{t.whyRuleReference}</p>
        </aside>
      ) : null}
      {data.agreement === true ? (
        <p className="text-[16px] font-semibold text-accent">{t.ruleMlAgree}</p>
      ) : null}

      {typeof data.eligibleProbability === "number" ? (
        <section>
          <h3 className="text-[16px] font-semibold text-ink-900">{t.probabilityLabel}</h3>
          <p className="mt-1 text-[17px] leading-relaxed text-ink-500">
            {t.whyProbabilityMeans((data.eligibleProbability * 100).toFixed(0))}
          </p>
          <p className="mt-2 text-[16px] leading-relaxed text-ink-500">{t.probabilityExplanation}</p>
        </section>
      ) : null}

      <section>
        <h3 className="text-[16px] font-semibold text-ink-900">{t.whyThingsToReview}</h3>
        <p className="mt-1 text-[16px] leading-relaxed text-ink-500">{t.whyThingsToReviewLead}</p>
        <p className="mt-2 text-[16px] leading-relaxed text-ink-500">{t.whyRequiredToEvaluate}</p>
        {hasReviewItems ? (
          <ul className="mt-3 space-y-2 text-[17px] text-ink-500">
            {reviewFields.map((field) => (
              <li key={field}>{profileFieldLabel(field, t)}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[16px] text-ink-500">{t.whyNoReviewItems}</p>
        )}
      </section>

      {data.officialSourceUrl ? (
        <a
          href={data.officialSourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-[12px] bg-navy-900 px-4 py-2.5 text-[16px] font-semibold text-white hover:bg-navy-800"
        >
          {t.visitOfficialWebsite}
        </a>
      ) : null}
    </div>
  );

  if (!collapsible) {
    return (
      <section className="space-y-5" aria-labelledby={headingId}>
        <h2 id={headingId} className="section-title">
          {title}
        </h2>
        {body}
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-[14px] border border-line bg-sage">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="text-[17px] font-semibold text-ink-900">{title}</span>
        <span className="text-[15px] font-semibold text-action">{open ? t.whyHide : t.whyShow}</span>
      </button>
      {open ? <div className="border-t border-line px-5 py-5">{body}</div> : null}
    </section>
  );
}
