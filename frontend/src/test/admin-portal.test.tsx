import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { en } from "../i18n/en";
import type { AdminOverviewResponse, AdminUserDetailResponse } from "../types/api";
import { SAMPLE_SCHEME, VALID_PROFILE } from "./fixtures";
import { renderApp, renderAuthenticatedApp, TEST_USER } from "./renderApp";

const ADMIN_USER = {
  ...TEST_USER,
  email: "admin@example.com",
  is_admin: true,
};

const OVERVIEW: AdminOverviewResponse = {
  total_users: 4,
  active_users: 2,
  total_document_uploads: 3,
  pending_document_reviews: 1,
  verified_documents: 1,
  rejected_documents: 1,
  eligible_scheme_results: 5,
  not_eligible_scheme_results: 7,
  cannot_fully_evaluate_users: 1,
  recent_activity: [
    {
      activity_type: "upload",
      occurred_at: "2026-09-12T04:00:00+00:00",
      user_id: TEST_USER.user_id,
      user_name: TEST_USER.full_name,
      user_email: TEST_USER.email,
      summary: "Uploaded school-certificate.pdf",
    },
  ],
  disclaimer: "Administrator monitoring for this academic research prototype.",
};

const DETAIL: AdminUserDetailResponse = {
  user: {
    user_id: TEST_USER.user_id,
    full_name: TEST_USER.full_name,
    email: TEST_USER.email,
    has_wallet: true,
    is_admin: false,
    created_at: "2026-09-01T10:00:00+00:00",
    last_activity_at: "2026-09-12T04:00:00+00:00",
  },
  wallet: {
    citizen_id: "11111111-2222-3333-4444-555555555555",
    ...VALID_PROFILE,
  },
  completeness: {
    percentage: 100,
    completed_fields: 11,
    total_fields: 11,
    incomplete_fields: [],
  },
  eligibility: {
    has_wallet: true,
    prediction_label: "eligible",
    eligible_scheme_count: 1,
    evaluated_schemes: [
      {
        scheme_id: SAMPLE_SCHEME.scheme_id,
        scheme_name: SAMPLE_SCHEME.scheme_name,
        prediction: "eligible",
        eligible_probability: 1,
        not_eligible_probability: 0,
        reason: SAMPLE_SCHEME.reason,
      },
    ],
    incomplete_fields: [],
    last_checked_at: "2026-09-12T04:00:00+00:00",
    disclaimer: OVERVIEW.disclaimer,
  },
  applications: [
    {
      application_id: "app-1",
      scheme_id: SAMPLE_SCHEME.scheme_id,
      scheme_name: SAMPLE_SCHEME.scheme_name,
      department: SAMPLE_SCHEME.department,
      required_documents: SAMPLE_SCHEME.required_documents,
      official_source_url: SAMPLE_SCHEME.official_source_url,
      status: "planning",
      application_date: null,
      created_at: "2026-09-12T04:00:00+00:00",
      updated_at: "2026-09-12T04:00:00+00:00",
      disclaimer: OVERVIEW.disclaimer,
    },
  ],
  history: [],
  disclaimer: OVERVIEW.disclaimer,
};

function jsonOk(body: unknown) {
  return { ok: true as const, json: async () => body };
}

function requestPath(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function adminFetch() {
  return vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const path = requestPath(input);
    const method = String(init?.method ?? "GET").toUpperCase();
    if (path.includes("/api/v1/admin/overview")) return Promise.resolve(jsonOk(OVERVIEW));
    if (/\/api\/v1\/admin\/users\/[^/?]+/.test(path)) {
      return Promise.resolve(jsonOk(DETAIL));
    }
    if (path.includes("/api/v1/admin/users")) {
      return Promise.resolve(jsonOk({ users: [DETAIL.user], count: 1, disclaimer: OVERVIEW.disclaimer }));
    }
    if (path.includes("/api/v1/admin/documents") && method === "PATCH") {
      return Promise.resolve(
        jsonOk({
          id: "upload-1",
          owner_user_id: TEST_USER.user_id,
          owner_name: TEST_USER.full_name,
          owner_email: TEST_USER.email,
          category: "education_certificate",
          display_name: "school-certificate.pdf",
          content_type: "application/pdf",
          size_bytes: 128,
          scheme_id: null,
          scheme_name: null,
          review_status: "verified",
          created_at: "2026-09-12T04:00:00+00:00",
        }),
      );
    }
    if (path.includes("/api/v1/admin/documents")) {
      return Promise.resolve(
        jsonOk({
          documents: [
            {
              id: "upload-1",
              owner_user_id: TEST_USER.user_id,
              owner_name: TEST_USER.full_name,
              owner_email: TEST_USER.email,
              category: "education_certificate",
              display_name: "school-certificate.pdf",
              content_type: "application/pdf",
              size_bytes: 128,
              scheme_id: null,
              scheme_name: null,
              review_status: "pending",
              created_at: "2026-09-12T04:00:00+00:00",
            },
          ],
          count: 1,
          disclaimer: OVERVIEW.disclaimer,
        }),
      );
    }
    if (path.includes("/api/v1/admin/eligibility")) {
      return Promise.resolve(
        jsonOk({
          users: [
            {
              user_id: TEST_USER.user_id,
              full_name: TEST_USER.full_name,
              email: TEST_USER.email,
              has_wallet: true,
              prediction_label: "eligible",
              eligible_scheme_count: 1,
              evaluated_schemes: DETAIL.eligibility.evaluated_schemes,
              incomplete_fields: [],
              last_checked_at: "2026-09-12T04:00:00+00:00",
            },
          ],
          count: 1,
          disclaimer: OVERVIEW.disclaimer,
        }),
      );
    }
    if (path.includes("/api/v1/catalog")) {
      return Promise.resolve(
        jsonOk({
          scheme_count: 1,
          total_catalog_count: 1,
          schemes: [
            {
              scheme_id: SAMPLE_SCHEME.scheme_id,
              scheme_name: SAMPLE_SCHEME.scheme_name,
              department: SAMPLE_SCHEME.department,
              scheme_category: SAMPLE_SCHEME.scheme_category,
              description: SAMPLE_SCHEME.description,
              benefit_description: SAMPLE_SCHEME.benefit,
              required_documents: SAMPLE_SCHEME.required_documents,
              application_method: SAMPLE_SCHEME.application_method,
              official_source_url: SAMPLE_SCHEME.official_source_url,
              eligibility_notes: null,
              ml_scope: "in_scope",
              eligibility_rule_status: "documented",
              gender_requirement: "female",
              student_status_requirement: "student",
            },
          ],
          filters: {
            ml_scopes: ["in_scope"],
            departments: [SAMPLE_SCHEME.department],
            genders: ["female"],
            student_statuses: ["student"],
            categories: [SAMPLE_SCHEME.scheme_category],
          },
          disclaimer: OVERVIEW.disclaimer,
        }),
      );
    }
    if (path.includes("/notifications")) {
      return Promise.resolve(jsonOk({ notifications: [], unread_count: 0, disclaimer: "" }));
    }
    return Promise.resolve({ ok: false, status: 404 });
  });
}

const CITIZEN_ONLY_NAV = [en.navWallet, en.navCheck, en.navHistory, en.navCompare, en.navSimulator, en.navInsights];

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("admin portal access", () => {
  it("sends an unauthenticated visitor from /admin to login", () => {
    renderApp(["/admin"]);
    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
  });

  it("blocks a signed-in citizen from the admin portal and hides admin navigation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    renderAuthenticatedApp(["/admin"]);
    expect(await screen.findByRole("heading", { name: en.adminForbiddenTitle })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: en.navAdminPortal })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: en.adminOverviewNav })).not.toBeInTheDocument();
    expect(screen.queryByText("test-token")).not.toBeInTheDocument();
  });

  it("shows the admin console sidebar only for administrators", async () => {
    vi.stubGlobal("fetch", adminFetch());
    renderApp(["/admin"], { user: ADMIN_USER, token: "admin-token" });
    expect(await screen.findByRole("heading", { name: en.adminTitle })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: en.adminConsole })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: en.adminOverviewNav })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: en.adminUsers })).toHaveAttribute("href", "/admin/users");
    expect(screen.getByRole("link", { name: en.adminDocumentVerification })).toHaveAttribute("href", "/admin/documents");
    expect(screen.getByRole("link", { name: en.navApplications })).toHaveAttribute("href", "/admin/applications");
    expect(screen.getByRole("link", { name: en.adminSchemeManagement })).toHaveAttribute("href", "/admin/schemes");
    expect(screen.getByRole("link", { name: en.adminEligibilityMonitoring })).toHaveAttribute("href", "/admin/eligibility");
    expect(screen.getByRole("link", { name: en.adminSchemeEvaluation })).toHaveAttribute("href", "/admin/evaluation");
    expect(screen.getByRole("link", { name: en.navSystemEvaluation })).toHaveAttribute("href", "/admin/system-evaluation");
    expect(screen.getByRole("link", { name: en.navResearchDashboard })).toHaveAttribute("href", "/admin/research-dashboard");
    expect(screen.getByRole("link", { name: /^Notifications$/ })).toHaveAttribute("href", "/admin/notifications");
    expect(screen.getByRole("link", { name: en.navVoiceAssistant })).toHaveAttribute("href", "/admin/voice-assistant");
    expect(screen.getByRole("link", { name: en.navUploads })).toHaveAttribute("href", "/admin/uploads");
    expect(screen.getByRole("link", { name: en.navSettings })).toHaveAttribute("href", "/admin/settings");
    for (const label of CITIZEN_ONLY_NAV) {
      expect(screen.queryByRole("link", { name: label })).not.toBeInTheDocument();
    }
    expect(screen.queryByRole("link", { name: /^Dashboard$/ })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain("admin-token");
  });
});

describe("admin portal modules", () => {
  it("renders dashboard counts and recent activity", async () => {
    vi.stubGlobal("fetch", adminFetch());
    renderApp(["/admin"], { user: ADMIN_USER, token: "admin-token" });
    expect(await screen.findByText(en.adminTotalUsers)).toBeInTheDocument();
    expect(screen.getByText(en.adminPendingReviews)).toBeInTheDocument();
    expect(screen.getByText("Uploaded school-certificate.pdf")).toBeInTheDocument();
  });

  it("lists users and opens eligibility monitoring for one account", async () => {
    vi.stubGlobal("fetch", adminFetch());
    renderApp(["/admin/users"], { user: ADMIN_USER, token: "admin-token" });
    expect(await screen.findByText(TEST_USER.email)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("link", { name: en.adminView }));
    expect(await screen.findByRole("heading", { name: TEST_USER.full_name })).toBeInTheDocument();
    expect(screen.getAllByText(/Pudhumai Penn/i).length).toBeGreaterThan(0);
    expect(screen.getByText(en.adminPredictionNotice)).toBeInTheDocument();
  });

  it("updates document review status without showing tokens", async () => {
    const fetchMock = adminFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderApp(["/admin/documents"], { user: ADMIN_USER, token: "admin-token" });
    expect(await screen.findByText("school-certificate.pdf")).toBeInTheDocument();
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText(en.adminStatus), "verified");
    expect(await screen.findByText(en.adminReviewSaved)).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        (call) =>
          String(call[0]).includes("/api/v1/admin/documents/upload-1") &&
          String(call[1]?.method).toUpperCase() === "PATCH",
      ),
    ).toBe(true);
    expect(document.body.textContent).not.toContain("admin-token");
  });

  it("shows existing backend eligibility statuses as system predictions", async () => {
    vi.stubGlobal("fetch", adminFetch());
    renderApp(["/admin/eligibility"], { user: ADMIN_USER, token: "admin-token" });
    expect(await screen.findByText(TEST_USER.email)).toBeInTheDocument();
    expect(screen.getByText(en.adminPredictionNotice)).toBeInTheDocument();
    expect(screen.getByText(/Pudhumai Penn/i)).toBeInTheDocument();
    expect(screen.getAllByText(en.catalogEligibilityEligible).length).toBeGreaterThan(0);
  });

  it("lists applications from existing admin user APIs", async () => {
    vi.stubGlobal("fetch", adminFetch());
    renderApp(["/admin/applications"], { user: ADMIN_USER, token: "admin-token" });
    expect(await screen.findByRole("heading", { name: en.navApplications })).toBeInTheDocument();
    expect(screen.getByText(SAMPLE_SCHEME.scheme_name)).toBeInTheDocument();
    expect(screen.getAllByText(en.appStatusPlanning).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toContain("admin-token");
  });

  it("shows a read-only scheme catalog without eligibility editors", async () => {
    vi.stubGlobal("fetch", adminFetch());
    renderApp(["/admin/schemes"], { user: ADMIN_USER, token: "admin-token" });
    expect(await screen.findByRole("heading", { name: en.adminSchemeManagement })).toBeInTheDocument();
    expect(screen.getByText(SAMPLE_SCHEME.scheme_name)).toBeInTheDocument();
    expect(screen.getByText(en.adminReadOnlyCatalog)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit eligibility|save rules/i })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain("admin-token");
  });
});
