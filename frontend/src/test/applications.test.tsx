import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApplicationItem, CatalogSearchResponse } from "../types/api";
import { SAMPLE_SCHEME } from "./fixtures";
import { renderApp, renderAuthenticatedApp } from "./renderApp";

const APPLICATION: ApplicationItem = {
  application_id: "app-1",
  scheme_id: SAMPLE_SCHEME.scheme_id,
  scheme_name: SAMPLE_SCHEME.scheme_name,
  department: SAMPLE_SCHEME.department,
  required_documents: SAMPLE_SCHEME.required_documents,
  official_source_url: SAMPLE_SCHEME.official_source_url,
  status: "planning",
  application_date: null,
  created_at: "2026-09-08T10:00:00+00:00",
  updated_at: "2026-09-08T10:00:00+00:00",
  disclaimer: "Personal tracking only.",
};

const CATALOG: CatalogSearchResponse = {
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
      ml_scope: "CORE",
      eligibility_rule_status: "documented",
      gender_requirement: null,
      student_status_requirement: null,
    },
  ],
  filters: { ml_scopes: [], departments: [], genders: [], student_statuses: [], categories: [] },
  disclaimer: "Catalog rows are official scheme metadata.",
};

function jsonOk(body: unknown) {
  return { ok: true as const, json: async () => body };
}

function mockApplicationsFetch(options?: { list?: ApplicationItem[]; create?: ApplicationItem }) {
  let items = [...(options?.list ?? [])];
  return vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    const path = String(url);
    const method = String(init?.method ?? "GET").toUpperCase();
    if (path.includes("/notifications")) {
      return Promise.resolve(jsonOk({ notifications: [], unread_count: 0, disclaimer: "" }));
    }
    if (path.includes("/api/v1/catalog")) {
      return Promise.resolve(jsonOk(CATALOG));
    }
    if (path.includes("/api/v1/applications") && method === "POST") {
      const created = options?.create ?? { ...APPLICATION, status: "planning" };
      items = [created];
      return Promise.resolve({ ok: true, status: 201, json: async () => created });
    }
    if (path.includes("/api/v1/applications/") && method === "PATCH") {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      items = items.map((item) =>
        path.includes(item.application_id) ? { ...item, ...body, status: body.status ?? item.status } : item,
      );
      return Promise.resolve(jsonOk(items[0]));
    }
    if (path.includes("/api/v1/applications")) {
      return Promise.resolve(jsonOk({ applications: items, count: items.length, disclaimer: "" }));
    }
    return Promise.resolve({ ok: false, status: 404 });
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("application tracking", () => {
  it("redirects unauthenticated visitors to login", () => {
    renderApp(["/applications"]);
    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
  });

  it("shows the empty state for a signed-in user", async () => {
    vi.stubGlobal("fetch", mockApplicationsFetch());
    renderAuthenticatedApp(["/applications"]);
    expect(await screen.findByRole("heading", { name: "Application Guidance and Tracking" })).toBeInTheDocument();
    expect(screen.getByText("No schemes saved for application")).toBeInTheDocument();
    expect(screen.getByText(/Eligibility result and application status are separate/)).toBeInTheDocument();
  });

  it("saves a scheme and updates personal tracking status", async () => {
    const fetchMock = mockApplicationsFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/applications"]);
    expect(await screen.findByRole("button", { name: "Save for application" })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Save for application" }));
    expect(await screen.findByText("Scheme saved for personal application tracking.")).toBeInTheDocument();
    expect(screen.getAllByText(SAMPLE_SCHEME.scheme_name).length).toBeGreaterThan(0);
    expect(
      fetchMock.mock.calls.some(
        (call) => String(call[0]).includes("/api/v1/applications") && String(call[1]?.method ?? "GET").toUpperCase() === "POST",
      ),
    ).toBe(true);

    await user.selectOptions(screen.getAllByLabelText("Application status")[1], "applied");
    expect(await screen.findByText("Application tracking status was updated.")).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        (call) => String(call[0]).includes("/api/v1/applications/") && String(call[1]?.method ?? "GET").toUpperCase() === "PATCH",
      ),
    ).toBe(true);
  });
});
