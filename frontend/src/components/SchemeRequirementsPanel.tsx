import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/LanguageContext";
import type { Messages } from "../i18n/types";
import {
  ApiError,
  fetchSchemeKnowledgeRecord,
  fetchSchemeReadinessEvaluation,
  fetchSchemeRequirements,
} from "../services/api";
import type {
  ConditionBasis,
  ConditionOutcome,
  DocumentCitizenStatus,
  DocumentRequirementLevel,
  SchemeKnowledgeRecord,
  SchemeReadinessEvaluation,
  SchemeRequirements,
} from "../types/api";
import { profileFieldLabel } from "../utils/displayLabels";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";
import { ReadinessEvaluationDetails } from "./ReadinessEvaluationDetails";
import { Badge } from "./ui/Badge";

type Load<T> = { status: "idle" | "loading" } | { status: "ready"; data: T } | { status: "error"; message: string };

type Level = 2 | 4;

function errorMessage(caught: unknown, t: Messages): string {
  return caught instanceof ApiError ? caught.message : t.networkError;
}

function isRequirements(value: unknown): value is SchemeRequirements {
  const body = value as SchemeRequirements | null;
  return Boolean(
    body &&
      typeof body.scheme_id === "string" &&
      Array.isArray(body.conditions) &&
      Array.isArray(body.required_profile_fields) &&
      Array.isArray(body.information_not_checked) &&
      Array.isArray(body.documents) &&
      Array.isArray(body.application_steps) &&
      Array.isArray(body.official_links) &&
      Array.isArray(body.unverified_items),
  );
}

function isKnowledge(value: unknown): value is SchemeKnowledgeRecord {
  const body = value as SchemeKnowledgeRecord | null;
  return Boolean(body && typeof body.scheme_id === "string" && Array.isArray(body.items));
}

function isEvaluation(value: unknown): value is SchemeReadinessEvaluation {
  const body = value as SchemeReadinessEvaluation | null;
  return Boolean(
    body &&
      typeof body.readiness_state === "string" &&
      Array.isArray(body.blocking_reasons) &&
      Array.isArray(body.eligibility?.conditions) &&
      Array.isArray(body.profile?.missing_fields) &&
      Array.isArray(body.documents?.items) &&
      Array.isArray(body.documents?.mandatory_missing) &&
      Array.isArray(body.unverified_requirements) &&
      Boolean(body.manual_stage),
  );
}

function verificationLabel(status: string, t: Messages): string {
  if (status === "verified") return t.reqStatusVerified;
  if (status === "missing") return t.reqStatusMissing;
  return t.reqStatusUnverified;
}

function verificationTone(status: string): "success" | "warning" | "danger" {
  if (status === "verified") return "success";
  if (status === "missing") return "danger";
  return "warning";
}

function basisLabel(basis: ConditionBasis, t: Messages): string {
  if (basis === "official_source") return t.reqBasisOfficial;
  if (basis === "department_convention") return t.reqBasisConvention;
  return t.reqBasisInterpretation;
}

function levelLabel(level: DocumentRequirementLevel, t: Messages): string {
  if (level === "mandatory") return t.reqLevelMandatory;
  if (level === "optional") return t.reqLevelOptional;
  return t.reqLevelUnspecified;
}

function outcomeLabel(outcome: ConditionOutcome, t: Messages): string {
  if (outcome === "met") return t.reqOutcomeMet;
  if (outcome === "not_met") return t.reqOutcomeNotMet;
  return t.reqOutcomeUnknown;
}

function outcomeTone(outcome: ConditionOutcome): "success" | "muted" | "warning" {
  if (outcome === "met") return "success";
  if (outcome === "not_met") return "muted";
  return "warning";
}

function citizenDocLabel(status: DocumentCitizenStatus, t: Messages): string {
  if (status === "ready") return t.reqDocReady;
  if (status === "needs_verification") return t.reqDocNeedsVerification;
  return t.reqDocNotStarted;
}

function SmallBadge({ tone, children }: { tone: "success" | "warning" | "danger" | "muted"; children: string }) {
  return <Badge tone={tone}>{children}</Badge>;
}

export function SchemeRequirementsPanel({ schemeId, level = 4 }: { schemeId: string; level?: Level }) {
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const [requirements, setRequirements] = useState<Load<SchemeRequirements>>({ status: "loading" });
  const [knowledge, setKnowledge] = useState<Load<SchemeKnowledgeRecord>>({ status: "loading" });
  const [evaluation, setEvaluation] = useState<Load<SchemeReadinessEvaluation>>({ status: "idle" });

  const Title = level === 2 ? "h2" : "h4";
  const Sub = level === 2 ? "h3" : "h5";

  useEffect(() => {
    let cancelled = false;
    setRequirements({ status: "loading" });
    setKnowledge({ status: "loading" });
    setEvaluation({ status: "idle" });

    fetchSchemeRequirements(schemeId)
      .then((data) => {
        if (cancelled) return;
        if (!isRequirements(data)) {
          setRequirements({ status: "error", message: t.genericError });
          return;
        }
        setRequirements({ status: "ready", data });
        if (isAuthenticated && data.rule_evaluated) {
          setEvaluation({ status: "loading" });
          fetchSchemeReadinessEvaluation(schemeId)
            .then((result) => {
              if (cancelled) return;
              setEvaluation(
                isEvaluation(result)
                  ? { status: "ready", data: result }
                  : { status: "error", message: t.genericError },
              );
            })
            .catch((caught: unknown) => {
              if (!cancelled) setEvaluation({ status: "error", message: errorMessage(caught, t) });
            });
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) setRequirements({ status: "error", message: errorMessage(caught, t) });
      });

    fetchSchemeKnowledgeRecord(schemeId)
      .then((data) => {
        if (cancelled) return;
        setKnowledge(isKnowledge(data) ? { status: "ready", data } : { status: "error", message: t.genericError });
      })
      .catch((caught: unknown) => {
        if (!cancelled) setKnowledge({ status: "error", message: errorMessage(caught, t) });
      });

    return () => {
      cancelled = true;
    };
  }, [schemeId, isAuthenticated, t]);

  if (requirements.status === "error") {
    return <ErrorState message={requirements.message} />;
  }
  if (requirements.status !== "ready") {
    return <LoadingState message={t.reqLoading} />;
  }

  const req = requirements.data;
  const evaluated = evaluation.status === "ready" ? evaluation.data : null;
  const conditionResult = new Map(evaluated?.eligibility.conditions.map((item) => [item.key, item]) ?? []);
  const documentResult = new Map(evaluated?.documents.items.map((item) => [item.key, item]) ?? []);

  return (
    <section className="space-y-6" aria-label={`${t.reqTitle}: ${req.scheme_name}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Title className="text-[18px] font-semibold text-ink-900">{t.reqTitle}</Title>
        {req.rule_status ? <Badge tone="muted">{t.reqRuleStatus(req.rule_status)}</Badge> : null}
        {req.last_checked ? <span className="text-[15px] text-ink-500">{t.reqLastChecked(req.last_checked)}</span> : null}
      </div>

      <div>
        <Sub className="text-[16px] font-semibold text-ink-900">{t.reqConditionsTitle}</Sub>
        {!req.rule_evaluated || req.conditions.length === 0 ? (
          <p className="mt-2 text-[16px] leading-relaxed text-ink-500">{t.reqNotRuleEvaluated}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {req.conditions.map((condition) => {
              const result = conditionResult.get(condition.key);
              return (
                <li key={condition.key} className="rounded-[12px] border border-line bg-white px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[16px] font-semibold text-ink-900">{condition.label}</p>
                    <SmallBadge tone={verificationTone(condition.verification_status)}>
                      {verificationLabel(condition.verification_status, t)}
                    </SmallBadge>
                    <SmallBadge tone="muted">{basisLabel(condition.basis, t)}</SmallBadge>
                    {result ? (
                      <SmallBadge tone={outcomeTone(result.outcome)}>{outcomeLabel(result.outcome, t)}</SmallBadge>
                    ) : null}
                  </div>
                  {result?.rule_reason ? (
                    <p className="mt-1 text-[15px] text-ink-700">{result.rule_reason}</p>
                  ) : null}
                  {condition.note ? <p className="mt-1 text-[15px] leading-relaxed text-ink-500">{condition.note}</p> : null}
                </li>
              );
            })}
          </ul>
        )}
        {req.information_not_checked.length > 0 ? (
          <div className="mt-3">
            <p className="text-[15px] font-semibold text-ink-700">{t.reqInfoNotChecked}</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-ink-500">
              {req.information_not_checked.map((item) => (
                <li key={item.key}>
                  {item.label}
                  {item.note ? ` – ${item.note}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {req.required_profile_fields.length > 0 ? (
        <div>
          <Sub className="text-[16px] font-semibold text-ink-900">{t.reqProfileFieldsTitle}</Sub>
          <ul className="mt-2 flex flex-wrap gap-2">
            {req.required_profile_fields.map((field) => (
              <li key={field} className="rounded-full bg-sage px-3 py-1 text-[15px] text-ink-700">
                {profileFieldLabel(field, t)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <Sub className="text-[16px] font-semibold text-ink-900">{t.reqDocumentsTitle}</Sub>
        {req.documents.length === 0 ? (
          <p className="mt-2 text-[16px] leading-relaxed text-warning">{t.reqDocumentsMissing}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {req.documents.map((document) => {
              const mine = documentResult.get(document.key);
              return (
                <li key={document.key} className="rounded-[12px] border border-line bg-white px-4 py-3">
                  <p className="text-[16px] text-ink-900">{document.label}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <SmallBadge tone={document.requirement === "unspecified" ? "muted" : "warning"}>
                      {levelLabel(document.requirement, t)}
                    </SmallBadge>
                    <SmallBadge tone={verificationTone(document.verification_status)}>
                      {verificationLabel(document.verification_status, t)}
                    </SmallBadge>
                    {mine ? <SmallBadge tone="muted">{citizenDocLabel(mine.citizen_status, t)}</SmallBadge> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <Sub className="text-[16px] font-semibold text-ink-900">{t.reqStepsTitle}</Sub>
        {req.application_steps.length === 0 ? (
          <p className="mt-2 text-[16px] leading-relaxed text-ink-500">{t.reqStepsMissing}</p>
        ) : (
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            {req.application_steps.map((step) => (
              <li key={step.key} className="text-[16px] leading-relaxed text-ink-700">
                <span>{step.text}</span>{" "}
                <SmallBadge tone={verificationTone(step.verification_status)}>
                  {verificationLabel(step.verification_status, t)}
                </SmallBadge>
              </li>
            ))}
          </ol>
        )}
      </div>

      {req.official_links.length > 0 ? (
        <div>
          <Sub className="text-[16px] font-semibold text-ink-900">{t.reqLinksTitle}</Sub>
          <ul className="mt-2 space-y-1">
            {req.official_links.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-[16px] font-semibold text-action hover:underline"
                >
                  {link.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {req.unverified_items.length > 0 ? (
        <div className="rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3" role="note">
          <p className="text-[15px] font-semibold text-warning">{t.reqUnverifiedTitle}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-ink-700">
            {req.unverified_items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <Sub className="text-[16px] font-semibold text-ink-900">{t.reqSourceTitle}</Sub>
        {knowledge.status === "ready" ? (
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {knowledge.data.items.map((item) => (
              <div key={item.field_key} className="rounded-[12px] border border-line bg-white px-4 py-3">
                <dt className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-ink-900">
                  {item.label}
                  <SmallBadge tone={verificationTone(item.verification_status)}>
                    {verificationLabel(item.verification_status, t)}
                  </SmallBadge>
                </dt>
                <dd className="mt-1 space-y-0.5 text-[14px] text-ink-500">
                  {item.last_verified_at ? <p>{t.reqLastVerified(item.last_verified_at)}</p> : null}
                  {item.catalog_access_date ? <p>{t.reqCatalogAccessed(item.catalog_access_date)}</p> : null}
                </dd>
              </div>
            ))}
          </dl>
        ) : knowledge.status === "error" ? (
          <div className="mt-2">
            <ErrorState message={knowledge.message} />
          </div>
        ) : (
          <p className="mt-2 text-[15px] text-ink-500" role="status">
            {t.reqSourceLoading}
          </p>
        )}
      </div>

      {req.rule_evaluated ? (
        <div className="rounded-[14px] bg-sage px-5 py-5">
          <Sub className="text-[16px] font-semibold text-ink-900">{t.evalTitle}</Sub>
          <p className="mt-1 text-[15px] leading-relaxed text-ink-500">{t.evalLead}</p>
          <div className="mt-4">
            {!isAuthenticated ? (
              <p className="text-[16px] text-ink-700">
                <Link to="/login" className="font-semibold text-action hover:underline">
                  {t.signIn}
                </Link>{" "}
                {t.reqSignInForReadiness}
              </p>
            ) : evaluation.status === "ready" ? (
              <ReadinessEvaluationDetails evaluation={evaluation.data} headingTag={level === 2 ? "h4" : "h6"} />
            ) : evaluation.status === "error" ? (
              <ErrorState message={evaluation.message} />
            ) : (
              <LoadingState message={t.evalLoading} />
            )}
          </div>
        </div>
      ) : null}

      <p className="text-[14px] leading-relaxed text-ink-500">{req.disclaimer}</p>
    </section>
  );
}
