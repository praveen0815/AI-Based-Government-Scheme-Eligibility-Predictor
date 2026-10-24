import { Link } from "react-router-dom";
import { useI18n } from "../context/LanguageContext";
import type { Messages } from "../i18n/types";
import { READINESS_EVALUATION_STATES, type ReadinessEvaluationState, type SchemeReadinessEvaluation } from "../types/api";
import { profileFieldLabel } from "../utils/displayLabels";
import { Badge } from "./ui/Badge";

type HeadingTag = "h3" | "h4" | "h5" | "h6";

function readinessStateLabel(state: ReadinessEvaluationState, t: Messages): string {
  if (state === "insufficient_information") return t.evalStateInsufficient;
  if (state === "ineligible_under_rules") return t.evalStateIneligible;
  if (state === "missing_mandatory_documents") return t.evalStateMissingDocs;
  if (state === "unverified_requirements") return t.evalStateUnverified;
  return t.evalStateEligible;
}

function readinessStateTone(state: ReadinessEvaluationState): "success" | "warning" | "muted" | "danger" {
  if (state === "eligible_under_rules") return "success";
  if (state === "ineligible_under_rules") return "muted";
  return "warning";
}

function ListBlock({ title, items, tag: Tag }: { title: string; items: string[]; tag: HeadingTag }) {
  if (items.length === 0) return null;
  return (
    <div>
      <Tag className="text-[15px] font-semibold text-ink-900">{title}</Tag>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-[16px] leading-relaxed text-ink-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function ReadinessEvaluationDetails({
  evaluation,
  headingTag = "h4",
}: {
  evaluation: SchemeReadinessEvaluation;
  headingTag?: HeadingTag;
}) {
  const { t } = useI18n();
  const state = evaluation.readiness_state;
  const conditions = evaluation.eligibility.conditions;
  const failed = conditions
    .filter((condition) => condition.outcome === "not_met")
    .map((condition) => (condition.rule_reason ? `${condition.label} – ${condition.rule_reason}` : condition.label));
  const unknown = conditions.filter((condition) => condition.outcome === "unknown").map((condition) => condition.label);
  const missingFields = evaluation.profile.missing_fields.map((field) => profileFieldLabel(field, t));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={readinessStateTone(state)}>{readinessStateLabel(state, t)}</Badge>
      </div>
      <ol className="flex flex-wrap gap-2" aria-label={t.evalStatesLabel}>
        {READINESS_EVALUATION_STATES.map((item) => {
          const current = item === state;
          return (
            <li
              key={item}
              aria-current={current ? "step" : undefined}
              className={`rounded-full border px-3 py-1 text-[14px] font-semibold ${
                current ? "border-action bg-[#E8F1EC] text-action" : "border-line bg-white text-ink-500"
              }`}
            >
              {readinessStateLabel(item, t)}
            </li>
          );
        })}
      </ol>

      <ListBlock title={t.evalBlockingTitle} items={evaluation.blocking_reasons} tag={headingTag} />
      <ListBlock title={t.evalFailedConditions} items={failed} tag={headingTag} />
      <ListBlock title={t.evalUnknownConditions} items={unknown} tag={headingTag} />
      <ListBlock title={t.evalMissingFields} items={missingFields} tag={headingTag} />
      {!evaluation.profile.has_wallet ? (
        <Link to="/wallet" className="inline-flex font-semibold text-action hover:underline">
          {t.evalCreateWallet}
        </Link>
      ) : null}
      <ListBlock title={t.evalMissingDocs} items={evaluation.documents.mandatory_missing} tag={headingTag} />
      <ListBlock title={t.evalUnverified} items={evaluation.unverified_requirements} tag={headingTag} />

      {!evaluation.manual_stage.consistent_with_evaluation && evaluation.manual_stage.note ? (
        <div className="rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3" role="note">
          <p className="text-[15px] font-semibold text-warning">{t.evalStageWarning}</p>
          <p className="mt-1 text-[16px] text-ink-700">{evaluation.manual_stage.note}</p>
        </div>
      ) : null}
    </div>
  );
}
