import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  compareSchemes,
  deleteRecommendationHistory,
  downloadRecommendationReport,
  fetchProfileCompleteness,
  fetchRecommendationHistory,
  fetchRecommendationHistoryDetail,
  loginWithGoogle,
  recommendSchemes,
  setAccessToken,
} from "../services/api";
import { readStoredUser, storeAuthSession } from "../utils/authStorage";
import { VALID_PROFILE, recommendResponse, SAMPLE_SCHEME } from "./fixtures";

afterEach(() => {
  setAccessToken(null);
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("loginWithGoogle", () => {
  it("maps Google HTTP 503 to an authentication message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      }),
    );
    await expect(loginWithGoogle("google-id-token")).rejects.toMatchObject({
      name: "ApiError",
      status: 503,
      message: "Google sign-in failed. Please try again.",
    } satisfies Partial<ApiError>);
  });
});

describe("recommendSchemes", () => {
  it("posts exact backend field names", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => recommendResponse([SAMPLE_SCHEME]),
    });
    vi.stubGlobal("fetch", fetchMock);

    await recommendSchemes(VALID_PROFILE);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/v1/recommend");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual(VALID_PROFILE);
  });

  it("maps HTTP 422 to a friendly message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
      }),
    );
    await expect(recommendSchemes(VALID_PROFILE)).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
      message: expect.stringContaining("Please check the information entered"),
    } satisfies Partial<ApiError>);
  });

  it("maps a network failure to a connection message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(recommendSchemes(VALID_PROFILE)).rejects.toThrow(
      "Unable to connect to SchemeWise AI",
    );
  });
});

describe("history and completeness client", () => {
  it("fetches recommendation history for the authenticated user", async () => {
    setAccessToken("history-token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ count: 0, history: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchRecommendationHistory()).resolves.toEqual({ count: 0, history: [] });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/v1/history");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({ Authorization: "Bearer history-token" }),
    });
  });

  it("fetches one history record and deletes it", async () => {
    setAccessToken("history-token");
    const detail = {
      id: "hist-1",
      checked_at: "2026-08-17T10:15:00+00:00",
      profile_snapshot: VALID_PROFILE,
      recommended_scheme_ids: [SAMPLE_SCHEME.scheme_id],
      recommendation_count: 1,
      recommended_schemes: [{ scheme_id: SAMPLE_SCHEME.scheme_id, scheme_name: SAMPLE_SCHEME.scheme_name }],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => detail })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchRecommendationHistoryDetail("hist-1")).resolves.toEqual(detail);
    await deleteRecommendationHistory("hist-1");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/v1/history/hist-1");
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: "DELETE" });
  });

  it("fetches profile completeness without sending a user id", async () => {
    setAccessToken("complete-token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        percentage: 100,
        completed_fields: 11,
        total_fields: 11,
        incomplete_fields: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchProfileCompleteness()).resolves.toEqual({
      percentage: 100,
      completed_fields: 11,
      total_fields: 11,
      incomplete_fields: [],
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/v1/wallets/me/completeness");
    expect(String(fetchMock.mock.calls[0]?.[1]?.body ?? "")).toBe("");
  });

  it("posts selected CORE scheme IDs for comparison", async () => {
    setAccessToken("compare-token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ count: 2, scheme_count: 2, schemes: [], disclaimer: "research" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await compareSchemes(["TN-SW-001", "TN-SW-006"]);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/v1/compare");
    expect(JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))).toEqual({
      scheme_ids: ["TN-SW-001", "TN-SW-006"],
    });
  });

  it("downloads a recommendation PDF without sending eligibility labels", async () => {
    setAccessToken("report-token");
    const createObjectURL = vi.fn(() => "blob:report");
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: vi.fn() } as unknown as typeof URL);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["%PDF"], { type: "application/pdf" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await downloadRecommendationReport(["TN-SW-001", "TN-SW-006"]);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/v1/reports/recommendations");
    expect(JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))).toEqual({
      compare_scheme_ids: ["TN-SW-001", "TN-SW-006"],
      language: "en",
    });
    expect(createObjectURL).toHaveBeenCalled();
  });
});

describe("session storage hardening", () => {
  it("does not persist password hashes or Google subject identifiers", () => {
    storeAuthSession("access-token", {
      user_id: "user-1",
      full_name: "Test User",
      email: "test@example.com",
      has_password: true,
      has_google: false,
      created_at: "2026-08-01T10:00:00+00:00",
      password_hash: "should-not-store",
      google_sub: "should-not-store",
    } as never);
    const stored = JSON.parse(String(window.sessionStorage.getItem("prototypeAuthUser")));
    expect(stored.password_hash).toBeUndefined();
    expect(stored.google_sub).toBeUndefined();
    expect(readStoredUser()?.email).toBe("test@example.com");
    expect(window.sessionStorage.getItem("prototypeAuthToken")).toBe("access-token");
  });
});
