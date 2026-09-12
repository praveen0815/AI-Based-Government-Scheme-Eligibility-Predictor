import type { Messages } from "../i18n/types";
import type {
  AdminDocumentItem,
  AdminOverviewResponse,
  AdminUserDetailResponse,
  AdminUserSummary,
  AdminVoiceAuditOutcome,
  DocumentReviewStatus,
} from "../types/api";
import type { AdminLookupKind } from "../utils/voiceIntent";
import {
  createAdminVoiceAudit,
  fetchAdminDocuments,
  fetchAdminOverview,
  fetchAdminUser,
  fetchAdminUsers,
  updateAdminDocumentStatus,
} from "./api";

export function isAffirmative(text: string): boolean {
  return /^(yes|yeah|yep|ok|okay|confirm|continue|do it|ஆம்|சரி)$/i.test(text.trim());
}

export function isNegative(text: string): boolean {
  return /^(no|nope|cancel|stop|don't|do not|இல்லை|ரத்து)$/i.test(text.trim());
}

export function matchAdminCandidate(text: string, candidates: AdminUserSummary[]): AdminUserSummary[] {
  const needle = text.trim().toLowerCase();
  if (!needle) return [];
  const numbered = needle.match(/^(?:the )?(first|second|third|1|2|3)$/);
  if (numbered) {
    const index = numbered[1] === "first" || numbered[1] === "1" ? 0 : numbered[1] === "second" || numbered[1] === "2" ? 1 : 2;
    return candidates[index] ? [candidates[index]] : [];
  }
  return candidates.filter((user) => {
    const name = user.full_name.toLowerCase();
    const email = user.email.toLowerCase();
    return name === needle || name.includes(needle) || email.startsWith(needle) || email === needle;
  });
}

export async function searchAdminUsers(query: string): Promise<AdminUserSummary[]> {
  const result = await fetchAdminUsers(query);
  return result.users;
}

export async function loadAdminUserDetail(userId: string): Promise<AdminUserDetailResponse> {
  return fetchAdminUser(userId);
}

export async function loadAdminDocumentsForUser(userId: string): Promise<AdminDocumentItem[]> {
  const result = await fetchAdminDocuments();
  return result.documents.filter((item) => item.owner_user_id === userId);
}

export async function loadAdminPendingReviews(): Promise<AdminOverviewResponse> {
  return fetchAdminOverview();
}

export function formatAdminConfirm(kind: AdminLookupKind, name: string, t: Messages): string {
  if (kind === "documents") return t.voiceAdminConfirmDocuments(name);
  if (kind === "summary") return t.voiceAdminConfirmSummary(name);
  return t.voiceAdminConfirmLookup(name);
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "";
  return `${local.slice(0, 1)}***@${domain}`;
}

export async function hashTranscript(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

export async function logVoiceAudit(payload: {
  intent: string;
  outcome: AdminVoiceAuditOutcome;
  targetUserId?: string | null;
  transcript: string;
}): Promise<void> {
  try {
    await createAdminVoiceAudit({
      intent: payload.intent,
      outcome: payload.outcome,
      target_user_id: payload.targetUserId ?? null,
      transcript_hash: await hashTranscript(payload.transcript),
    });
  } catch {
    /* Audit must not block the assistant. */
  }
}

export function formatAdminMatches(users: AdminUserSummary[], t: Messages): string {
  const names = users
    .slice(0, 3)
    .map((user) => `${user.full_name} (${maskEmail(user.email)})`)
    .join(", ");
  return `${t.voiceAdminManyMatches(names)} ${t.voiceAdminWhichUser}`;
}

export function formatAdminUserSummary(detail: AdminUserDetailResponse, t: Messages): string {
  const name = detail.user.full_name;
  const wallet = detail.user.has_wallet ? t.voiceAdminHasWallet : t.voiceAdminNoWallet;
  const status =
    detail.eligibility.prediction_label === "eligible"
      ? t.catalogEligibilityEligible
      : detail.eligibility.prediction_label === "not_eligible"
        ? t.catalogEligibilityNotEligible
        : t.catalogEligibilityIncomplete;
  return t.voiceAdminUserSummary(name, wallet, status, detail.eligibility.eligible_scheme_count);
}

export function formatAdminDocuments(name: string, documents: AdminDocumentItem[], t: Messages): string {
  if (documents.length === 0) return t.voiceAdminNoDocuments(name);
  const pending = documents.filter((item) => item.review_status === "pending").length;
  const verified = documents.filter((item) => item.review_status === "verified").length;
  const rejected = documents.filter((item) => item.review_status === "rejected").length;
  return t.voiceAdminDocumentsSummary(name, documents.length, pending, verified, rejected);
}

export function formatPendingReviews(overview: AdminOverviewResponse, t: Messages): string {
  return t.voiceAdminPendingReviews(overview.pending_document_reviews);
}

export function reviewStatusLabel(status: DocumentReviewStatus, t: Messages): string {
  if (status === "verified") return t.voiceAdminReviewVerified;
  if (status === "rejected") return t.voiceAdminReviewRejected;
  return t.voiceAdminReviewPending;
}

export function reviewCategoryLabel(category: string | undefined, t: Messages): string {
  const value = (category ?? "").toLowerCase();
  if (value.includes("education")) return t.voiceAdminReviewEducation;
  if (value.includes("income")) return t.voiceAdminReviewIncome;
  if (value.includes("community")) return t.voiceAdminReviewCommunity;
  if (value.includes("address")) return t.voiceAdminReviewAddress;
  if (value.includes("identity")) return t.voiceAdminReviewIdentity;
  return t.voiceAdminReviewAnyDocument;
}

export function filterReviewDocuments(
  documents: AdminDocumentItem[],
  category?: string,
  preferPending = true,
): AdminDocumentItem[] {
  const needle = (category ?? "").toLowerCase().split("_")[0];
  const filtered = needle
    ? documents.filter((item) => item.category.toLowerCase().includes(needle))
    : documents;
  const pending = filtered.filter((item) => item.review_status === "pending");
  if (preferPending && pending.length) return pending;
  return filtered;
}

export function matchReviewDocument(text: string, documents: AdminDocumentItem[]): AdminDocumentItem[] {
  const needle = text.trim().toLowerCase();
  if (!needle) return [];
  const numbered = needle.match(/^(?:the )?(first|second|third|1|2|3)$/);
  if (numbered) {
    const index = numbered[1] === "first" || numbered[1] === "1" ? 0 : numbered[1] === "second" || numbered[1] === "2" ? 1 : 2;
    return documents[index] ? [documents[index]] : [];
  }
  return documents.filter((item) => {
    const category = item.category.toLowerCase().replace(/_/g, " ");
    const status = item.review_status.toLowerCase();
    return category.includes(needle) || needle.includes(category.split(" ")[0]) || needle.includes(status);
  });
}

export function formatReviewMatches(documents: AdminDocumentItem[], t: Messages): string {
  const listed = documents
    .slice(0, 3)
    .map((item) => `${reviewCategoryLabel(item.category, t)} (${reviewStatusLabel(item.review_status, t)})`)
    .join(", ");
  return `${t.voiceAdminManyDocuments(listed)} ${t.voiceAdminWhichDocument}`;
}

export function formatReviewConfirm(
  name: string,
  status: DocumentReviewStatus,
  category: string | undefined,
  t: Messages,
  again = false,
): string {
  const spokenStatus = reviewStatusLabel(status, t);
  const spokenCategory = reviewCategoryLabel(category, t);
  return again
    ? t.voiceAdminConfirmReviewAgain(name, spokenStatus, spokenCategory)
    : t.voiceAdminConfirmReview(name, spokenStatus, spokenCategory);
}

export async function applyAdminReviewStatus(
  uploadId: string,
  reviewStatus: DocumentReviewStatus,
): Promise<AdminDocumentItem> {
  return updateAdminDocumentStatus(uploadId, reviewStatus);
}
