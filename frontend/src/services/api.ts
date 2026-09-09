import { messages, type Language } from "../i18n";
import type {
  AuthUser,
  CitizenProfile,
  CitizenWallet,
  ConfusionMatrixResponse,
  EvaluationBundle,
  EvaluationOverview,
  FeatureAnalysisResponse,
  HybridEvaluationResponse,
  LimitationsResponse,
  LoginResponse,
  ModelComparisonResponse,
  CompareResponse,
  DocumentPrepStatus,
  DocumentProgressResponse,
  InsightsResponse,
  ReadinessProgressResponse,
  DashboardOverviewResponse,
  ReadinessStage,
  SchemeReadiness,
  ProfileCompleteness,
  SchemeDocumentChecklist,
  SupportingUpload,
  SupportingUploadCategory,
  SupportingUploadListResponse,
  NotificationItem,
  NotificationListResponse,
  ApplicationItem,
  ApplicationListResponse,
  ApplicationStatus,
  RecommendResponse,
  RecommendationHistoryItem,
  RecommendationHistoryListResponse,
  SchemeCatalogResponse,
  CatalogSearchResponse,
  SchemeEvaluationResponse,
  SystemEvaluationResponse,
} from "../types/api";

const REQUEST_TIMEOUT_MS = 20000;

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;
let uiLanguage: Language = "en";

export function setUiLanguage(language: Language): void {
  uiLanguage = language;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL;
  const fallback = import.meta.env.DEV ? "http://127.0.0.1:8000" : "";
  return (configured || fallback).replace(/\/$/, "");
}

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function isGoogleAuthPath(path: string): boolean {
  return path === "/api/v1/auth/google" || path.startsWith("/api/v1/auth/google?");
}

function isAuthPath(path: string): boolean {
  return path === "/api/v1/auth" || path.startsWith("/api/v1/auth/");
}

function friendlyStatusMessage(status: number, path = ""): string {
  const t = messages[uiLanguage];
  if (isGoogleAuthPath(path)) {
    if (status === 409) return t.emailRegistered;
    return t.googleSignInFailed;
  }
  if (isAuthPath(path) && (status === 503 || status >= 500)) {
    if (path.includes("/register")) return t.registerFailed;
    if (status === 503) return t.accountDatabaseUnavailable;
    return t.loginFailed;
  }
  if (status === 401) return t.sessionExpired;
  if (status === 403) return t.forbiddenError;
  if (status === 404) return t.notFoundError;
  if (status === 409) return t.conflictError;
  if (status === 422) return t.validationError;
  if (status === 429) return t.genericError;
  if (status === 503) return t.unavailableError;
  if (status >= 500) return t.serverError;
  return t.genericError;
}

function shouldClearSessionOnUnauthorized(path: string, status: number): boolean {
  return status === 401 && Boolean(accessToken) && !isGoogleAuthPath(path) && path !== "/api/v1/auth/login";
}

function authHeaders(): HeadersInit {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...authHeaders(),
        ...init?.headers,
      },
    });

    if (!response.ok) {
      if (shouldClearSessionOnUnauthorized(path, response.status)) {
        onUnauthorized?.();
      }
      throw new ApiError(friendlyStatusMessage(response.status, path), response.status);
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new ApiError("The eligibility service returned an unexpected response.");
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(messages[uiLanguage].requestTimeout);
    }
    throw new ApiError(
      messages[uiLanguage].networkError,
    );
  } finally {
    window.clearTimeout(timer);
  }
}

function isRecommendResponse(value: unknown): value is RecommendResponse {
  if (!value || typeof value !== "object") return false;
  const body = value as RecommendResponse;
  return (
    typeof body.eligible_scheme_count === "number" &&
    Array.isArray(body.recommendations) &&
    Array.isArray(body.evaluated_schemes)
  );
}

export async function recommendSchemes(citizenProfile: CitizenProfile): Promise<RecommendResponse> {
  const body = await requestJson<RecommendResponse>("/api/v1/recommend", {
    method: "POST",
    body: JSON.stringify(citizenProfile),
  });
  if (!isRecommendResponse(body)) {
    throw new ApiError("The eligibility service returned an unexpected response.");
  }
  return body;
}

export async function fetchCoreSchemes(): Promise<SchemeCatalogResponse> {
  return requestJson<SchemeCatalogResponse>("/api/v1/schemes");
}

export async function fetchSchemeCatalog(): Promise<CatalogSearchResponse> {
  return requestJson<CatalogSearchResponse>("/api/v1/catalog");
}

export async function registerAccount(payload: {
  full_name: string;
  email: string;
  password: string;
}): Promise<AuthUser> {
  return requestJson<AuthUser>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginAccount(email: string, password: string): Promise<LoginResponse> {
  return requestJson<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function loginWithGoogle(credential: string): Promise<LoginResponse> {
  return requestJson<LoginResponse>("/api/v1/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  return requestJson<AuthUser>("/api/v1/auth/me");
}

export async function updateAccountProfile(fullName: string): Promise<AuthUser> {
  return requestJson<AuthUser>("/api/v1/auth/me", {
    method: "PATCH",
    body: JSON.stringify({ full_name: fullName }),
  });
}

export async function changeAccountPassword(currentPassword: string, newPassword: string): Promise<void> {
  await requestNoContent("/api/v1/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}

export async function deleteAccount(): Promise<void> {
  await requestNoContent("/api/v1/auth/me", { method: "DELETE" });
}

export async function createWallet(citizenProfile: CitizenProfile): Promise<CitizenWallet> {
  return requestJson<CitizenWallet>("/api/v1/wallets", {
    method: "POST",
    body: JSON.stringify(citizenProfile),
  });
}

export async function getMyWallet(): Promise<CitizenWallet> {
  return requestJson<CitizenWallet>("/api/v1/wallets/me");
}

export async function getWallet(citizenId: string): Promise<CitizenWallet> {
  return requestJson<CitizenWallet>(`/api/v1/wallets/${citizenId}`);
}

export async function updateWallet(
  citizenId: string,
  citizenProfile: CitizenProfile,
): Promise<CitizenWallet> {
  return requestJson<CitizenWallet>(`/api/v1/wallets/${citizenId}`, {
    method: "PUT",
    body: JSON.stringify(citizenProfile),
  });
}

async function requestNoContent(path: string, init?: RequestInit): Promise<void> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...authHeaders(),
        ...init?.headers,
      },
    });
    if (!response.ok) {
      if (shouldClearSessionOnUnauthorized(path, response.status)) {
        onUnauthorized?.();
      }
      throw new ApiError(friendlyStatusMessage(response.status, path), response.status);
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(messages[uiLanguage].requestTimeout);
    }
    throw new ApiError(
      messages[uiLanguage].networkError,
    );
  } finally {
    window.clearTimeout(timer);
  }
}

export async function deleteWallet(citizenId: string): Promise<void> {
  await requestNoContent(`/api/v1/wallets/${citizenId}`, { method: "DELETE" });
}

export async function fetchRecommendationHistory(): Promise<RecommendationHistoryListResponse> {
  return requestJson<RecommendationHistoryListResponse>("/api/v1/history");
}

export async function fetchRecommendationHistoryDetail(
  historyId: string,
): Promise<RecommendationHistoryItem> {
  return requestJson<RecommendationHistoryItem>(`/api/v1/history/${historyId}`);
}

export async function deleteRecommendationHistory(historyId: string): Promise<void> {
  await requestNoContent(`/api/v1/history/${historyId}`, { method: "DELETE" });
}

export async function fetchProfileCompleteness(): Promise<ProfileCompleteness> {
  return requestJson<ProfileCompleteness>("/api/v1/wallets/me/completeness");
}

export async function fetchDocumentProgress(): Promise<DocumentProgressResponse> {
  return requestJson<DocumentProgressResponse>("/api/v1/documents");
}

export async function fetchEligibilityInsights(): Promise<InsightsResponse> {
  return requestJson<InsightsResponse>("/api/v1/insights");
}

export async function fetchReadinessProgress(): Promise<ReadinessProgressResponse> {
  return requestJson<ReadinessProgressResponse>("/api/v1/readiness");
}

export async function fetchDashboardOverview(): Promise<DashboardOverviewResponse> {
  return requestJson<DashboardOverviewResponse>("/api/v1/dashboard");
}

export async function fetchApplications(): Promise<ApplicationListResponse> {
  return requestJson<ApplicationListResponse>("/api/v1/applications");
}

export async function createApplication(
  schemeId: string,
  status: ApplicationStatus = "planning",
  applicationDate?: string | null,
): Promise<ApplicationItem> {
  return requestJson<ApplicationItem>("/api/v1/applications", {
    method: "POST",
    body: JSON.stringify({
      scheme_id: schemeId,
      status,
      application_date: applicationDate || null,
    }),
  });
}

export async function updateApplication(
  applicationId: string,
  payload: { status?: ApplicationStatus; application_date?: string | null },
): Promise<ApplicationItem> {
  return requestJson<ApplicationItem>(`/api/v1/applications/${applicationId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteApplication(applicationId: string): Promise<void> {
  await requestNoContent(`/api/v1/applications/${applicationId}`, { method: "DELETE" });
}

export async function fetchNotifications(): Promise<NotificationListResponse> {
  return requestJson<NotificationListResponse>("/api/v1/notifications");
}

export async function markNotificationRead(notificationId: string): Promise<NotificationItem> {
  return requestJson<NotificationItem>(`/api/v1/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

export async function deleteNotification(notificationId: string): Promise<void> {
  await requestNoContent(`/api/v1/notifications/${notificationId}`, { method: "DELETE" });
}

export async function fetchSupportingUploads(schemeId?: string): Promise<SupportingUploadListResponse> {
  const query = schemeId ? `?scheme_id=${encodeURIComponent(schemeId)}` : "";
  return requestJson<SupportingUploadListResponse>(`/api/v1/uploads${query}`);
}

export async function uploadSupportingDocument(
  file: File,
  category: SupportingUploadCategory,
  schemeId?: string,
): Promise<SupportingUpload> {
  const form = new FormData();
  form.append("category", category);
  if (schemeId) form.append("scheme_id", schemeId);
  form.append("file", file);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/v1/uploads`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...authHeaders(),
      },
      body: form,
    });
    if (!response.ok) {
      if (shouldClearSessionOnUnauthorized("/api/v1/uploads", response.status)) {
        onUnauthorized?.();
      }
      throw new ApiError(friendlyStatusMessage(response.status, "/api/v1/uploads"), response.status);
    }
    return (await response.json()) as SupportingUpload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(messages[uiLanguage].requestTimeout);
    }
    throw new ApiError(messages[uiLanguage].networkError);
  } finally {
    window.clearTimeout(timer);
  }
}

export async function updateSupportingUploadLink(
  uploadId: string,
  schemeId: string | null,
): Promise<SupportingUpload> {
  return requestJson<SupportingUpload>(`/api/v1/uploads/${uploadId}`, {
    method: "PATCH",
    body: JSON.stringify({ scheme_id: schemeId }),
  });
}

export async function deleteSupportingUpload(uploadId: string): Promise<void> {
  const path = `/api/v1/uploads/${uploadId}`;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: "DELETE",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...authHeaders(),
      },
    });
    if (!response.ok) {
      if (shouldClearSessionOnUnauthorized(path, response.status)) {
        onUnauthorized?.();
      }
      throw new ApiError(friendlyStatusMessage(response.status, path), response.status);
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(messages[uiLanguage].requestTimeout);
    }
    throw new ApiError(messages[uiLanguage].networkError);
  } finally {
    window.clearTimeout(timer);
  }
}

export async function downloadSupportingUpload(uploadId: string, displayName: string): Promise<void> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/v1/uploads/${uploadId}/file`, {
      signal: controller.signal,
      headers: authHeaders(),
    });
    if (!response.ok) {
      if (shouldClearSessionOnUnauthorized(`/api/v1/uploads/${uploadId}/file`, response.status)) {
        onUnauthorized?.();
      }
      throw new ApiError(friendlyStatusMessage(response.status, "/api/v1/uploads"), response.status);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = displayName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(messages[uiLanguage].requestTimeout);
    }
    throw new ApiError(messages[uiLanguage].networkError);
  } finally {
    window.clearTimeout(timer);
  }
}

export async function updateSchemeReadiness(
  schemeId: string,
  stage: ReadinessStage,
): Promise<SchemeReadiness> {
  return requestJson<SchemeReadiness>(`/api/v1/readiness/schemes/${schemeId}`, {
    method: "PATCH",
    body: JSON.stringify({ stage }),
  });
}

export async function fetchSchemeDocumentChecklist(schemeId: string): Promise<SchemeDocumentChecklist> {
  return requestJson<SchemeDocumentChecklist>(`/api/v1/documents/schemes/${schemeId}`);
}

export async function updateDocumentChecklistItem(
  schemeId: string,
  itemKey: string,
  status: DocumentPrepStatus,
): Promise<SchemeDocumentChecklist> {
  return requestJson<SchemeDocumentChecklist>(`/api/v1/documents/schemes/${schemeId}/items/${itemKey}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function compareSchemes(schemeIds: string[]): Promise<CompareResponse> {
  return requestJson<CompareResponse>("/api/v1/compare", {
    method: "POST",
    body: JSON.stringify({ scheme_ids: schemeIds }),
  });
}

export async function downloadRecommendationReport(compareSchemeIds: string[] = []): Promise<void> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/v1/reports/recommendations`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Accept: "application/pdf",
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ compare_scheme_ids: compareSchemeIds, language: uiLanguage }),
    });
    if (!response.ok) {
      if (shouldClearSessionOnUnauthorized("/api/v1/reports/recommendations", response.status)) {
        onUnauthorized?.();
      }
      throw new ApiError(friendlyStatusMessage(response.status, "/api/v1/reports/recommendations"), response.status);
    }
    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = "schemewise-recommendation-report.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(objectUrl);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(messages[uiLanguage].requestTimeout);
    }
    throw new ApiError(
      messages[uiLanguage].networkError,
    );
  } finally {
    window.clearTimeout(timer);
  }
}

export async function recommendFromWallet(citizenId: string): Promise<RecommendResponse> {
  const body = await requestJson<RecommendResponse>(`/api/v1/wallets/${citizenId}/recommend`, {
    method: "POST",
  });
  if (!isRecommendResponse(body)) {
    throw new ApiError("The eligibility service returned an unexpected response.");
  }
  return body;
}

export async function fetchSystemEvaluation(): Promise<SystemEvaluationResponse> {
  return requestJson<SystemEvaluationResponse>("/api/v1/system-evaluation");
}

export async function fetchEvaluationBundle(): Promise<EvaluationBundle> {
  const [overview, models, schemes, features, confusion, limitations, hybrid] = await Promise.all([
    requestJson<EvaluationOverview>("/api/v1/evaluation/overview"),
    requestJson<ModelComparisonResponse>("/api/v1/evaluation/models"),
    requestJson<SchemeEvaluationResponse>("/api/v1/evaluation/schemes"),
    requestJson<FeatureAnalysisResponse>("/api/v1/evaluation/features"),
    requestJson<ConfusionMatrixResponse>("/api/v1/evaluation/confusion-matrix"),
    requestJson<LimitationsResponse>("/api/v1/evaluation/limitations"),
    requestJson<HybridEvaluationResponse>("/api/v1/evaluation/hybrid"),
  ]);
  return { overview, models, schemes, features, confusion, limitations, hybrid };
}

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
    wet_land_acres: Number(wallet.wet_land_acres),
    dry_land_acres: Number(wallet.dry_land_acres),
  };
}
