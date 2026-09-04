import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CatalogSearchItem, CatalogSearchResponse } from "../types/api";
import { SAMPLE_SCHEME, SECOND_SCHEME } from "./fixtures";
import { renderApp } from "./renderApp";

function catalogItem(
  scheme = SAMPLE_SCHEME,
  extras?: Partial<CatalogSearchItem>,
): CatalogSearchItem {
  return {
    scheme_id: scheme.scheme_id,
    scheme_name: scheme.scheme_name,
    department: scheme.department,
    scheme_category: scheme.scheme_category,
    description: scheme.description,
    benefit_description: scheme.benefit,
    required_documents: scheme.required_documents,
    application_method: scheme.application_method,
    official_source_url: scheme.official_source_url,
    eligibility_notes: "Documented research catalog text.",
    ml_scope: "CORE",
    eligibility_rule_status: "PARTIALLY_VERIFIED",
    gender_requirement: "Female",
    student_status_requirement: "Must be a student in the first higher-education course",
    ...extras,
  };
}

const ADVANCED_SCHEME = catalogItem(SECOND_SCHEME, {
  scheme_id: "TN-HFW-001",
  scheme_name: "Chief Minister's Comprehensive Health Insurance Scheme (CMCHIS)",
  department: "Health and Family Welfare Department",
  scheme_category: "Health insurance",
  ml_scope: "ADVANCED",
  gender_requirement: null,
  student_status_requirement: null,
});

const CATALOG: CatalogSearchResponse = {
  scheme_count: 3,
  total_catalog_count: 3,
  schemes: [catalogItem(), catalogItem(SECOND_SCHEME, { gender_requirement: "Female", student_status_requirement: null }), ADVANCED_SCHEME],
  filters: {
    ml_scopes: ["CORE", "ADVANCED"],
    departments: [
      "Social Welfare and Women Empowerment Department",
      "Health and Family Welfare Department",
    ],
    genders: ["Female"],
    student_statuses: ["Must be a student in the first higher-education course"],
    categories: ["Higher education assurance", "Health insurance"],
  },
  disclaimer: "This catalog search lists research-prototype scheme records only.",
};

function jsonOk(body: unknown) {
  return { ok: true as const, json: async () => body };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("scheme catalog search", () => {
  it("lists catalog schemes with CORE badges and official source links", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk(CATALOG)));
    renderApp(["/schemes"]);
    expect(await screen.findByRole("heading", { name: "Explore Government Schemes" })).toBeInTheDocument();
    expect(await screen.findByText(SAMPLE_SCHEME.scheme_name)).toBeInTheDocument();
    expect(screen.getAllByText("CORE").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ADVANCED").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Showing 3 of 3 schemes").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "View Details" })[0]).toHaveAttribute("href", `/schemes/${SAMPLE_SCHEME.scheme_id}`);
    expect(screen.getAllByRole("link", { name: "Official Source" })[0]).toHaveAttribute(
      "href",
      SAMPLE_SCHEME.official_source_url,
    );
  });

  it("searches by scheme ID", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk(CATALOG)));
    renderApp(["/schemes"]);
    expect(await screen.findByText(SAMPLE_SCHEME.scheme_name)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.type(screen.getAllByPlaceholderText("Search by scheme name or scheme ID")[0], "TN-HFW-001");
    expect(screen.getByText(ADVANCED_SCHEME.scheme_name)).toBeInTheDocument();
    expect(screen.queryByText(SAMPLE_SCHEME.scheme_name)).not.toBeInTheDocument();
    expect(screen.getAllByText("Showing 1 of 3 schemes").length).toBeGreaterThan(0);
  });

  it("filters by CORE status and can clear filters", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk(CATALOG)));
    renderApp(["/schemes"]);
    expect(await screen.findByText(ADVANCED_SCHEME.scheme_name)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.selectOptions(screen.getAllByLabelText("CORE status")[0], "ADVANCED");
    expect(screen.getByText(ADVANCED_SCHEME.scheme_name)).toBeInTheDocument();
    expect(screen.queryByText(SAMPLE_SCHEME.scheme_name)).not.toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Clear Filters" })[0]);
    expect(screen.getByText(SAMPLE_SCHEME.scheme_name)).toBeInTheDocument();
    expect(screen.getByText(ADVANCED_SCHEME.scheme_name)).toBeInTheDocument();
  });

  it("shows the empty state when no catalog rows match", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk(CATALOG)));
    renderApp(["/schemes"]);
    expect(await screen.findByText(SAMPLE_SCHEME.scheme_name)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.type(screen.getAllByPlaceholderText("Search by scheme name or scheme ID")[0], "not-a-real-scheme");
    expect(screen.getByRole("heading", { name: "No schemes found" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Try a different name, scheme ID, or filter. This search does not change documented eligibility conditions.",
      ),
    ).toBeInTheDocument();
  });

  it("shows Tamil catalog copy", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk({ ...CATALOG, schemes: [] })));
    renderApp(["/schemes"], { language: "ta" });
    expect(await screen.findByRole("heading", { name: "அரசு திட்டங்களை ஆராயுங்கள்" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "திட்டங்கள் இல்லை" })).toBeInTheDocument();
  });
});
