import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  DocumentProgressResponse,
  InsightsResponse,
  NotificationListResponse,
  ProfileCompleteness,
  ReadinessProgressResponse,
  RecommendationHistoryItem,
  SupportingUploadListResponse,
  RecommendationHistoryListResponse,
} from "../types/api";
import { recommendResponse, SAMPLE_SCHEME, SECOND_SCHEME, VALID_PROFILE } from "./fixtures";
import { renderApp, renderAuthenticatedApp, TEST_USER } from "./renderApp";

const WALLET = {
  citizen_id: "11111111-2222-3333-4444-555555555555",
  ...VALID_PROFILE,
  created_at: "2026-08-14T12:00:00+00:00",
  updated_at: "2026-08-14T12:00:00+00:00",
};

const COMPLETE_PROFILE: ProfileCompleteness = {
  percentage: 100,
  completed_fields: 11,
  total_fields: 11,
  incomplete_fields: [],
};

const INCOMPLETE_PROFILE: ProfileCompleteness = {
  percentage: 82,
  completed_fields: 9,
  total_fields: 11,
  incomplete_fields: ["occupation_category", "wet_land_acres"],
};

const HISTORY_ITEM: RecommendationHistoryItem = {
  id: "hist-1",
  checked_at: "2026-08-17T10:15:00+00:00",
  profile_snapshot: VALID_PROFILE,
  recommended_scheme_ids: [SAMPLE_SCHEME.scheme_id, SECOND_SCHEME.scheme_id],
  recommendation_count: 2,
  recommended_schemes: [
    { scheme_id: SAMPLE_SCHEME.scheme_id, scheme_name: SAMPLE_SCHEME.scheme_name },
    { scheme_id: SECOND_SCHEME.scheme_id, scheme_name: SECOND_SCHEME.scheme_name },
  ],
};

function jsonOk(body: unknown) {
  return { ok: true as const, json: async () => body };
}

const EMPTY_DOCUMENTS: DocumentProgressResponse = {
  schemes: [],
  schemes_with_progress: 0,
  overall_ready_count: 0,
  overall_item_count: 0,
  overall_progress_percent: 0,
  disclaimer: "Document preparation progress is a research-prototype checklist.",
};

function mockDashboardFetch(options?: {
  wallet?: object | null;
  completeness?: ProfileCompleteness;
  history?: RecommendationHistoryListResponse;
  documents?: DocumentProgressResponse;
  insights?: InsightsResponse | null;
  readiness?: ReadinessProgressResponse;
  uploads?: SupportingUploadListResponse;
  notifications?: NotificationListResponse;
}) {
  return vi.fn().mockImplementation((url: string) => {
    const path = String(url);
    if (path.includes("/recommend")) {
      return Promise.resolve({ ok: false, status: 500 });
    }
    if (path.includes("/api/v1/auth/me")) {
      return Promise.resolve(jsonOk(TEST_USER));
    }
    if (path.includes("/completeness")) {
      return Promise.resolve(jsonOk(options?.completeness ?? COMPLETE_PROFILE));
    }
    if (path.includes("/api/v1/wallets/me") || path.includes("/api/v1/wallets/")) {
      if (options?.wallet === null) {
        return Promise.resolve({ ok: false, status: 404 });
      }
      return Promise.resolve(jsonOk(options?.wallet ?? WALLET));
    }
    if (path.includes("/api/v1/history")) {
      return Promise.resolve(jsonOk(options?.history ?? { count: 0, history: [] }));
    }
    if (path.includes("/api/v1/documents")) {
      return Promise.resolve(jsonOk(options?.documents ?? EMPTY_DOCUMENTS));
    }
    if (path.includes("/api/v1/insights")) {
      if (options?.insights === null || options?.insights === undefined) {
        return Promise.resolve({ ok: false, status: 404 });
      }
      return Promise.resolve(jsonOk(options.insights));
    }
    if (path.includes("/api/v1/uploads")) {
      return Promise.resolve(
        jsonOk(options?.uploads ?? { uploads: [], count: 0, disclaimer: "" }),
      );
    }
    if (path.includes("/api/v1/notifications")) {
      return Promise.resolve(
        jsonOk(
          options?.notifications ?? {
            notifications: [],
            unread_count: 0,
            disclaimer: "These reminders are generated from your research-prototype activity only.",
          },
        ),
      );
    }
    if (path.includes("/api/v1/readiness")) {
      return Promise.resolve(
        jsonOk(
          options?.readiness ?? {
            schemes: [],
            schemes_being_prepared: 0,
            overall_progress_percent: 0,
            disclaimer: "Application Readiness is a research-prototype tracker.",
          },
        ),
      );
    }
    return Promise.resolve({ ok: false, status: 404 });
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("user dashboard", () => {
  it("redirects unauthenticated visitors to login", () => {
    renderApp(["/dashboard"]);
    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
  });

  it("shows the no-wallet state without calling recommendation", async () => {
    const fetchMock = mockDashboardFetch({ wallet: null });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/dashboard"]);
    expect(await screen.findByRole("heading", { name: "Welcome back, Test User" })).toBeInTheDocument();
    expect(screen.getAllByText("Your profile is not created yet.").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Create My Profile" })).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/recommend"))).toBe(false);
  });

  it("shows completeness for an incomplete wallet", async () => {
    vi.stubGlobal("fetch", mockDashboardFetch({ completeness: INCOMPLETE_PROFILE }));
    renderAuthenticatedApp(["/dashboard"]);
    expect(await screen.findByText("Your profile is 82% complete")).toBeInTheDocument();
    expect(screen.getByText("9 of 11 fields completed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Complete Profile" })).toBeInTheDocument();
  });

  it("shows history-based recommendations and recent activity", async () => {
    const fetchMock = mockDashboardFetch({
      history: { count: 1, history: [HISTORY_ITEM] },
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/dashboard"]);
    expect(await screen.findByText("2 predicted-eligible schemes")).toBeInTheDocument();
    expect(screen.getAllByText(SAMPLE_SCHEME.scheme_name).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Progress overview" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Citizen journey" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Preparation summary" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recent activity" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Details" })).toHaveAttribute("href", "/history/hist-1");
    expect(screen.getByRole("heading", { name: "Application Preparation" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Check eligibility from your saved wallet first. This page does not create checklists for schemes that were never recommended to you.",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Manage Documents" })[0]).toHaveAttribute("href", "/documents");
    expect(screen.getByRole("heading", { name: "Eligibility Insights" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "View Insights" })[0]).toHaveAttribute("href", "/insights");
    expect(screen.getAllByRole("link", { name: "Check Eligibility" })[0]).toHaveAttribute("href", "/check");
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/recommend"))).toBe(false);
  });

  it("shows document preparation progress without failing when documents are present", async () => {
    const fetchMock = mockDashboardFetch({
      history: { count: 1, history: [HISTORY_ITEM] },
      documents: {
        schemes: [
          {
            scheme_id: SAMPLE_SCHEME.scheme_id,
            scheme_name: SAMPLE_SCHEME.scheme_name,
            official_source_url: SAMPLE_SCHEME.official_source_url,
            documents_need_verification: true,
            ready_count: 1,
            item_count: 1,
            progress_percent: 100,
            has_saved_progress: true,
          },
        ],
        schemes_with_progress: 1,
        overall_ready_count: 1,
        overall_item_count: 1,
        overall_progress_percent: 80,
        disclaimer: "Document preparation progress is a research-prototype checklist.",
      },
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/dashboard"]);
    expect(await screen.findByRole("heading", { name: "Application Preparation" })).toBeInTheDocument();
    expect(screen.getAllByText("1 scheme with checklist progress").length).toBeGreaterThan(0);
    expect(screen.getByText("80% overall document preparation progress")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Manage Documents" })[0]).toHaveAttribute("href", "/documents");
  });

  it("shows eligibility insights count from the insights API", async () => {
    const fetchMock = mockDashboardFetch({
      insights: {
        total_schemes_evaluated: 6,
        predicted_eligible_count: 2,
        not_recommended_count: 4,
        recommended_schemes: [],
        other_schemes: [],
        completeness: COMPLETE_PROFILE,
        review_items: [],
        disclaimer: "Eligibility Insights explain this prototype's hybrid evaluation.",
      },
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/dashboard"]);
    expect(await screen.findByRole("heading", { name: "Eligibility Insights" })).toBeInTheDocument();
    expect(screen.getByText("2 predicted eligible schemes")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "View Insights" })[0]).toHaveAttribute("href", "/insights");
  });

  it("shows application readiness summary from the readiness API", async () => {
    const fetchMock = mockDashboardFetch({
      readiness: {
        schemes: [],
        schemes_being_prepared: 2,
        overall_progress_percent: 50,
        disclaimer: "Application Readiness is a research-prototype tracker.",
      },
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/dashboard"]);
    expect(await screen.findByRole("heading", { name: "Application Readiness" })).toBeInTheDocument();
    expect(screen.getAllByText("2 schemes being prepared").length).toBeGreaterThan(0);
    expect(screen.getAllByText("50% overall preparation progress").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Manage Readiness" })[0]).toHaveAttribute("href", "/readiness");
  });

  it("shows supporting documents count from the uploads API", async () => {
    const fetchMock = mockDashboardFetch({
      uploads: {
        uploads: [],
        count: 2,
        disclaimer: "Do not upload Aadhaar, PAN, passport, or other sensitive identity documents.",
      },
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/dashboard"]);
    expect(await screen.findByRole("heading", { name: "Supporting Documents" })).toBeInTheDocument();
    expect(screen.getByText("2 supporting documents uploaded")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage Uploads" })).toHaveAttribute("href", "/uploads");
  });

  it("reuses in-memory recommendation results without calling the API", async () => {
    const fetchMock = mockDashboardFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderApp(["/dashboard"], {
      user: TEST_USER,
      token: "test-token",
      profile: VALID_PROFILE,
      result: recommendResponse([SAMPLE_SCHEME, SECOND_SCHEME]),
    });
    expect(await screen.findByText("2 predicted-eligible schemes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View All Recommendations" })).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/recommend"))).toBe(false);
  });

  it("shows a friendly error when dashboard APIs are unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      }),
    );
    renderAuthenticatedApp(["/dashboard"]);
    expect(
      await screen.findByText("The eligibility service is temporarily unavailable. Please try again in a moment."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Traceback")).not.toBeInTheDocument();
  });

  it("shows journey stages from profile through application readiness", async () => {
    const fetchMock = mockDashboardFetch({
      history: { count: 1, history: [HISTORY_ITEM] },
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/dashboard"]);
    expect(await screen.findByRole("heading", { name: "Citizen journey" })).toBeInTheDocument();
    expect(screen.getByText("Profile Created")).toBeInTheDocument();
    expect(screen.getByText("Profile Completed")).toBeInTheDocument();
    expect(screen.getByText("Eligibility Checked")).toBeInTheDocument();
    expect(screen.getByText("Schemes Recommended")).toBeInTheDocument();
    expect(screen.getByText("Documents Prepared")).toBeInTheDocument();
    expect(screen.getAllByText("Application Readiness").length).toBeGreaterThan(0);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("shows unread reminders from the notifications API", async () => {
    const fetchMock = mockDashboardFetch({
      notifications: {
        notifications: [
          {
            notification_id: "n-profile",
            type: "profile_incomplete",
            title: "Complete your profile",
            message: "A socio-economic wallet is needed before this research prototype can prepare personalized reminders.",
            related_feature: "wallet",
            related_id: null,
            href: "/wallet",
            is_read: false,
            created_at: "2026-08-31T10:00:00+00:00",
            count: null,
          },
        ],
        unread_count: 1,
        disclaimer: "These reminders are generated from your research-prototype activity only.",
      },
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/dashboard"]);
    expect(await screen.findByRole("heading", { name: "Notifications & Reminders" })).toBeInTheDocument();
    expect(screen.getByText("Complete your profile")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View All Notifications" })).toHaveAttribute("href", "/notifications");
    expect(screen.getByRole("link", { name: "Open related page" })).toHaveAttribute("href", "/wallet");
  });

  it("opens the wallet from the create-profile action", async () => {
    vi.stubGlobal("fetch", mockDashboardFetch({ wallet: null }));
    renderAuthenticatedApp(["/dashboard"]);
    expect(await screen.findByRole("button", { name: "Create My Profile" })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Create My Profile" }));
    expect(await screen.findByRole("heading", { name: "My Socio-Economic Wallet" })).toBeInTheDocument();
  });
});
