import type { Messages } from "../i18n/types";
import type {
  CitizenProfile,
  CitizenWallet,
  RecommendResponse,
  RecommendedScheme,
} from "../types/api";
import { profileFieldLabel } from "../utils/displayLabels";
import {
  genderOptions,
  maritalOptions,
  occupationOptions,
} from "../utils/fieldOptions";
import type { DetectedIntent, VoiceNavigateTarget } from "../utils/voiceIntent";
import { ApiError, fetchCoreSchemes, fetchProfileCompleteness, getMyWallet, recommendFromWallet, updateWallet } from "./api";

export function walletToProfile(wallet: CitizenWallet): CitizenProfile {
  return {
    age: wallet.age,
    gender: wallet.gender,
    is_student: wallet.is_student,
    first_higher_education_course: wallet.first_higher_education_course,
    school_background: wallet.school_background,
    marital_status: wallet.marital_status,
    is_orphan: wallet.is_orphan,
    is_destitute: wallet.is_destitute,
    occupation_category: wallet.occupation_category,
    wet_land_acres: wallet.wet_land_acres,
    dry_land_acres: wallet.dry_land_acres,
  };
}

export function mergeWalletProfile(
  wallet: CitizenWallet,
  extracted: Partial<CitizenProfile>,
): CitizenProfile {
  return { ...walletToProfile(wallet), ...extracted };
}

function optionLabel(
  options: { value: string; label: string }[],
  value: string | number | boolean | undefined,
): string {
  if (value === undefined) return "";
  const asString = String(value);
  return options.find((option) => option.value === asString)?.label ?? asString;
}

export function formatExtractedFields(
  extracted: Partial<CitizenProfile>,
  t: Messages,
): { label: string; value: string }[] {
  return (Object.keys(extracted) as (keyof CitizenProfile)[]).map((field) => {
    const raw = extracted[field];
    let value = String(raw);
    if (field === "gender") value = optionLabel(genderOptions(t), raw);
    if (field === "occupation_category") value = optionLabel(occupationOptions(t), raw);
    if (field === "marital_status") value = optionLabel(maritalOptions(t), raw);
    if (typeof raw === "boolean") value = raw ? t.yes : t.no;
    return { label: profileFieldLabel(field, t), value };
  });
}

export function formatUnsupportedMentions(mentions: string[] | undefined, t: Messages): string {
  if (!mentions?.length) return "";
  return mentions
    .map((item) => (item === "income" ? t.voiceFieldIncome : item === "state" ? t.voiceFieldState : item))
    .join(", ");
}

export function buildConfirmationText(
  extracted: Partial<CitizenProfile>,
  unsupported: string[] | undefined,
  t: Messages,
): string {
  const rows = formatExtractedFields(extracted, t);
  const extra = formatUnsupportedMentions(unsupported, t);
  const understood =
    rows.length === 1
      ? t.voiceUnderstoodField(rows[0].label, rows[0].value)
      : `${t.voiceUnderstood}: ${rows.map((row) => `${row.label}: ${row.value}`).join(". ")}.`;
  const parts = [understood, t.voiceConfirmWallet];
  if (extra) {
    parts.splice(1, 0, `${t.voiceUnsupportedFields} (${extra}).`);
  }
  return parts.join(" ");
}

function pickExplanationScheme(result: RecommendResponse): RecommendedScheme | undefined {
  return result.recommendations[0] ?? undefined;
}

export function explainRecommendation(
  result: RecommendResponse | null,
  incompleteFields: string[],
  t: Messages,
): string {
  if (!result) return t.voiceExplainNeedCheck;
  const scheme = pickExplanationScheme(result);
  const parts: string[] = [];
  if (result.eligible_scheme_count > 0 && scheme) {
    parts.push(t.voiceExplainEligible);
    if (scheme.agreement === true) parts.push(t.voiceExplainAgree);
    if (scheme.agreement === false) parts.push(t.voiceExplainDisagree);
    if (scheme.rule_reasons?.length) {
      parts.push(scheme.rule_reasons.join(", "));
    }
    if (typeof scheme.eligible_probability === "number") {
      parts.push(t.whyProbabilityMeans(String(Math.round(scheme.eligible_probability * 100))));
    }
  } else {
    parts.push(t.voiceExplainNotEligible);
    parts.push(t.voiceNoEligible);
  }
  if (incompleteFields.length > 0) {
    const fields = incompleteFields.map((field) => profileFieldLabel(field, t)).join(", ");
    parts.push(t.voiceCompletenessCannotEvaluate(fields));
    parts.push(t.voiceCompletenessHelp);
  }
  return parts.join(" ");
}

export async function loadWalletOrNull(): Promise<CitizenWallet | null> {
  try {
    return await getMyWallet();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function runEligibilityCheck(): Promise<{
  wallet: CitizenWallet;
  result: RecommendResponse;
  incompleteFields: string[];
}> {
  const wallet = await loadWalletOrNull();
  if (!wallet) {
    throw new ApiError("NO_WALLET", 404);
  }
  const [result, completeness] = await Promise.all([
    recommendFromWallet(wallet.citizen_id),
    fetchProfileCompleteness().catch(() => ({ incomplete_fields: [] as string[] })),
  ]);
  return { wallet, result, incompleteFields: completeness.incomplete_fields ?? [] };
}

export function formatEligibilitySpeech(
  result: RecommendResponse,
  t: Messages,
  incompleteFields: string[] = [],
): string {
  const missing =
    incompleteFields.length > 0
      ? t.voiceCompletenessCannotEvaluate(
          incompleteFields.map((field) => profileFieldLabel(field, t)).join(", "),
        )
      : "";
  if (result.eligible_scheme_count <= 0) {
    return [t.voiceNoEligible, missing, t.voiceEligibilityBasedOnProfile].filter(Boolean).join(" ");
  }
  const names = result.recommendations.map((scheme) => scheme.scheme_name).join(", ");
  const top = result.recommendations[0];
  const parts = [t.voiceEligibleCount(result.eligible_scheme_count), t.voiceEligibleSchemeList(names)];
  if (top) parts.push(t.voiceTopRecommendation(top.scheme_name));
  if (top?.agreement === true) parts.push(t.voiceExplainAgree);
  if (top?.agreement === false) parts.push(t.voiceExplainDisagree);
  if (missing) parts.push(missing);
  parts.push(t.voiceEligibilityBasedOnProfile);
  return parts.join(" ");
}

export async function loadIncompleteFields(): Promise<string[]> {
  try {
    const wallet = await loadWalletOrNull();
    if (!wallet) return [];
    return (await fetchProfileCompleteness()).incomplete_fields ?? [];
  } catch {
    return [];
  }
}

export async function runCompletenessSpeech(t: Messages): Promise<string> {
  const wallet = await loadWalletOrNull();
  if (!wallet) return t.voiceNoWallet;
  const completeness = await fetchProfileCompleteness();
  if (completeness.incomplete_fields.length === 0) {
    return t.voiceCompletenessNone;
  }
  const fields = completeness.incomplete_fields.map((field) => profileFieldLabel(field, t)).join(", ");
  return `${t.voiceCompletenessCannotEvaluate(fields)} ${t.voiceCompletenessHelp}`;
}

export async function runSchemeQuestion(studentFocus: boolean | undefined, t: Messages): Promise<string> {
  const catalog = await fetchCoreSchemes();
  const schemes = studentFocus
    ? catalog.schemes.filter((scheme) =>
        `${scheme.scheme_name} ${scheme.description ?? ""} ${scheme.eligibility_notes ?? ""}`.toLowerCase().includes("student"),
      )
    : catalog.schemes;
  const names = (schemes.length > 0 ? schemes : catalog.schemes).map((scheme) => scheme.scheme_name).join(", ");
  return studentFocus && schemes.length > 0 ? t.voiceSchemesStudents(names) : t.voiceSchemesAvailable(names);
}

export async function confirmProfileUpdate(
  extracted: Partial<CitizenProfile>,
): Promise<CitizenWallet> {
  const wallet = await loadWalletOrNull();
  if (!wallet) {
    throw new ApiError("NO_WALLET", 404);
  }
  return updateWallet(wallet.citizen_id, mergeWalletProfile(wallet, extracted));
}

export function navigationSpeech(target: VoiceNavigateTarget, t: Messages): string {
  if (target === "wallet") return t.voiceNavigateWallet;
  if (target === "results") return t.voiceNavigateResults;
  if (target === "history") return t.voiceNavigateHistory;
  if (target === "schemes") return t.voiceNavigateSchemes;
  if (target === "documents") return t.voiceNavigateDocuments;
  if (target === "insights") return t.voiceNavigateInsights;
  if (target === "simulator") return t.voiceNavigateSimulator;
  if (target === "applications") return t.voiceNavigateApplications;
  if (target === "compare") return t.voiceNavigateCompare;
  return t.voiceNavigateDashboard;
}

export function navigationPath(target: VoiceNavigateTarget): string {
  if (target === "wallet") return "/wallet";
  if (target === "results") return "/results";
  if (target === "history") return "/history";
  if (target === "schemes") return "/schemes";
  if (target === "documents") return "/documents";
  if (target === "insights") return "/insights";
  if (target === "simulator") return "/eligibility-simulator";
  if (target === "applications") return "/applications";
  if (target === "compare") return "/compare";
  return "/dashboard";
}

export interface IncomeWhatIfMessage {
  type: "assistant";
  intent: "income_what_if";
  text: string;
  action: "open_simulator";
}

export function buildIncomeWhatIfMessage(t: Messages): IncomeWhatIfMessage {
  return {
    type: "assistant",
    intent: "income_what_if",
    text: t.voiceIncomeWhatIfExplanation,
    action: "open_simulator",
  };
}

export function whatIfSpeech(t: Messages): string {
  return t.voiceIncomeWhatIfExplanation;
}

export function documentsNeedSpeech(result: RecommendResponse | null, t: Messages): string {
  if (!result || result.recommendations.length === 0) {
    return `${t.voiceDocumentsNeed} ${t.voiceNoEligible}`;
  }
  const details = result.recommendations
    .slice(0, 3)
    .map((scheme) => `${scheme.scheme_name}: ${scheme.required_documents || t.catalogMissing}`)
    .join(". ");
  return `${t.voiceDocumentsNeed} ${details}`;
}

export function highestBenefitSpeech(result: RecommendResponse | null, t: Messages): string {
  if (!result || result.recommendations.length === 0) {
    return t.voiceNoEligible;
  }
  const details = result.recommendations
    .map((scheme) => `${scheme.scheme_name}: ${scheme.benefit || t.catalogMissing}`)
    .join(". ");
  return `${t.voiceHighestBenefit} ${details}`;
}

export function friendlyVoiceError(error: unknown, t: Messages): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return t.sessionExpired;
    if (error.message === "NO_WALLET" || error.status === 404) return t.voiceNoWallet;
    if (error.status === 503 || error.status === 500) return t.voiceEligibilityError;
    return error.message || t.voiceEligibilityError;
  }
  return t.networkError;
}

export function unsupportedSpeech(intent: DetectedIntent, t: Messages): string {
  const extra = formatUnsupportedMentions(intent.unsupportedMentions, t);
  if (extra) {
    return `${t.voiceUnsupportedFields} (${extra}). ${t.voiceUnsupported}`;
  }
  return t.voiceUnsupported;
}
