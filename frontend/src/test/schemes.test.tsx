import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CatalogSearchItem, CatalogSearchResponse, RecommendResponse } from "../types/api";
import {
  applyCatalogDiscovery,
  catalogFiltersFromSearch,
  discoveryEligibility,
  EMPTY_CATALOG_FILTERS,
} from "../utils/catalogSearch";
import { SAMPLE_SCHEME, SECOND_SCHEME, VALID_PROFILE, recommendResponse } from "./fixtures";
import { renderApp, renderAuthenticatedApp } from "./renderApp";

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
  description: "State health insurance coverage for families.",
  ml_scope: "ADVANCED",
  gender_requirement: null,
  student_status_requirement: null,
});

const CATALOG: CatalogSearchResponse = {
  scheme_count: 3,
  total_catalog_count: 3,
  schemes: [
    catalogItem(),
    catalogItem(SECOND_SCHEME, { gender_requirement: "Female", student_status_requirement: null }),
    ADVANCED_SCHEME,
  ],
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

function discoveryRecommend(): RecommendResponse {
  return {
    ...recommendResponse([SAMPLE_SCHEME]),
    evaluated_schemes: [
      {
        scheme_id: SAMPLE_SCHEME.scheme_id,
        scheme_name: SAMPLE_SCHEME.scheme_name,
        prediction: "eligible",
        eligible_probability: 1,
        not_eligible_probability: 0,
        reason: SAMPLE_SCHEME.reason,
      },
      {
        scheme_id: SECOND_SCHEME.scheme_id,
        scheme_name: SECOND_SCHEME.scheme_name,
        prediction: "not_eligible",
        eligible_probability: 0.1,
        not_eligible_probability: 0.9,
        reason: "Not predicted eligible for this research prototype.",
      },
    ],
  };
}

function jsonOk(body: unknown) {
  return { ok: true as const, json: async () => body };
}

function jsonError(status: number) {
  return { ok: false as const, status, json: async () => ({ detail: "error" }) };
}

function mockCatalogFetch(options?: { catalog?: CatalogSearchResponse | "error" | "pending" }) {
  if (options?.catalog === "pending") {
    return vi.fn().mockReturnValue(new Promise(() => undefined));
  }
  return vi.fn().mockImplementation(async (url: string) => {
    const path = String(url);
    if (path.includes("/catalog")) {
      if (options?.catalog === "error") return jsonError(500);
      return jsonOk(options?.catalog ?? CATALOG);
    }
    if (path.includes("/notifications")) {
      return jsonOk({ notifications: [], unread_count: 0, unread_reminder_count: 0, disclaimer: "" });
    }
    if (path.includes("/completeness")) {
      return jsonOk({
        percentage: 82,
        completed_fields: 9,
        total_fields: 11,
        incomplete_fields: ["occupation_category"],
      });
    }
    if (path.includes("/recommend")) return jsonOk(discoveryRecommend());
    if (path.includes("/compare")) {
      return jsonOk({
        scheme_count: 2,
        disclaimer: "This is a research prototype.",
        schemes: [
          { ...SAMPLE_SCHEME, recommended: true, status_label: "Predicted eligible", eligibility_notes: null, benefit: SAMPLE_SCHEME.benefit },
          { ...SECOND_SCHEME, recommended: true, status_label: "Predicted eligible", eligibility_notes: null, benefit: SECOND_SCHEME.benefit },
        ],
      });
    }
    if (path.includes("/wallets/me") || path.includes("/wallets/")) {
      return jsonOk({
        citizen_id: "11111111-2222-3333-4444-555555555555",
        ...VALID_PROFILE,
        created_at: "2026-08-14T12:00:00+00:00",
        updated_at: "2026-08-14T12:00:00+00:00",
      });
    }
    return jsonOk({});
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("catalog discovery helpers", () => {
  it("searches name, description, and category keywords without inventing eligibility", () => {
    const education = applyCatalogDiscovery(CATALOG.schemes, {
      ...EMPTY_CATALOG_FILTERS,
      query: "education",
    });
    expect(education.map((scheme) => scheme.scheme_id).sort()).toEqual(
      [SAMPLE_SCHEME.scheme_id, SECOND_SCHEME.scheme_id].sort(),
    );
    expect(discoveryEligibility(SAMPLE_SCHEME.scheme_id, discoveryRecommend())).toBe("eligible");
    expect(discoveryEligibility(SECOND_SCHEME.scheme_id, discoveryRecommend())).toBe("not_eligible");
    expect(discoveryEligibility(ADVANCED_SCHEME.scheme_id, discoveryRecommend())).toBe("incomplete");
    expect(discoveryEligibility(SAMPLE_SCHEME.scheme_id, null)).toBeNull();
  });

  it("applies combined filters and reads URL state", () => {
    const filtered = applyCatalogDiscovery(
      CATALOG.schemes,
      {
        ...EMPTY_CATALOG_FILTERS,
        query: "education",
        category: "Higher education assurance",
        department: "Social Welfare and Women Empowerment Department",
        eligibility: "eligible",
      },
      discoveryRecommend(),
    );
    expect(filtered.map((scheme) => scheme.scheme_id)).toEqual([SAMPLE_SCHEME.scheme_id]);
    expect(catalogFiltersFromSearch(new URLSearchParams("category=Education&eligibility=eligible"))).toMatchObject({
      category: "Education",
      eligibility: "eligible",
    });
  });
});

describe("scheme catalog search", () => {
  it("lists catalog schemes with CORE badges and official source links", async () => {
    vi.stubGlobal("fetch", mockCatalogFetch());
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
    vi.stubGlobal("fetch", mockCatalogFetch());
    renderApp(["/schemes"]);
    expect(await screen.findByText(SAMPLE_SCHEME.scheme_name)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.type(screen.getAllByPlaceholderText("Search by scheme name, description, or keyword")[0], "TN-HFW-001");
    expect(screen.getByText(ADVANCED_SCHEME.scheme_name)).toBeInTheDocument();
    expect(screen.queryByText(SAMPLE_SCHEME.scheme_name)).not.toBeInTheDocument();
    expect(screen.getAllByText("Showing 1 of 3 schemes").length).toBeGreaterThan(0);
  });

  it("searches by description keyword", async () => {
    vi.stubGlobal("fetch", mockCatalogFetch());
    renderApp(["/schemes"]);
    expect(await screen.findByText(SAMPLE_SCHEME.scheme_name)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.type(screen.getAllByPlaceholderText("Search by scheme name, description, or keyword")[0], "education");
    expect(screen.getByText(SAMPLE_SCHEME.scheme_name)).toBeInTheDocument();
    expect(screen.getByText(SECOND_SCHEME.scheme_name)).toBeInTheDocument();
    expect(screen.queryByText(ADVANCED_SCHEME.scheme_name)).not.toBeInTheDocument();
  });

  it("filters by category", async () => {
    vi.stubGlobal("fetch", mockCatalogFetch());
    renderApp(["/schemes"]);
    expect(await screen.findByText(ADVANCED_SCHEME.scheme_name)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.selectOptions(screen.getAllByLabelText("Category")[0], "Health insurance");
    expect(screen.getByText(ADVANCED_SCHEME.scheme_name)).toBeInTheDocument();
    expect(screen.queryByText(SAMPLE_SCHEME.scheme_name)).not.toBeInTheDocument();
  });

  it("filters by department", async () => {
    vi.stubGlobal("fetch", mockCatalogFetch());
    renderApp(["/schemes"]);
    expect(await screen.findByText(ADVANCED_SCHEME.scheme_name)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.selectOptions(screen.getAllByLabelText("Department")[0], "Health and Family Welfare Department");
    expect(screen.getByText(ADVANCED_SCHEME.scheme_name)).toBeInTheDocument();
    expect(screen.queryByText(SAMPLE_SCHEME.scheme_name)).not.toBeInTheDocument();
  });

  it("filters by CORE status and can clear filters", async () => {
    vi.stubGlobal("fetch", mockCatalogFetch());
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

  it("sorts schemes by name", async () => {
    vi.stubGlobal("fetch", mockCatalogFetch());
    renderApp(["/schemes"]);
    expect(await screen.findByText(SAMPLE_SCHEME.scheme_name)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.selectOptions(screen.getAllByLabelText("Sort")[0], "Scheme Name A–Z");
    const names = screen.getAllByRole("heading", { level: 2 }).map((node) => node.textContent);
    const schemeNames = names.filter((name) =>
      [SAMPLE_SCHEME.scheme_name, SECOND_SCHEME.scheme_name, ADVANCED_SCHEME.scheme_name].includes(name ?? ""),
    );
    expect(schemeNames).toEqual([
      SECOND_SCHEME.scheme_name,
      ADVANCED_SCHEME.scheme_name,
      SAMPLE_SCHEME.scheme_name,
    ]);
  });

  it("shows the empty state when no catalog rows match", async () => {
    vi.stubGlobal("fetch", mockCatalogFetch());
    renderApp(["/schemes"]);
    expect(await screen.findByText(SAMPLE_SCHEME.scheme_name)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.type(screen.getAllByPlaceholderText("Search by scheme name, description, or keyword")[0], "not-a-real-scheme");
    expect(screen.getByRole("heading", { name: "No schemes found" })).toBeInTheDocument();
    expect(screen.getAllByText("No schemes found").length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "Try a different name, scheme ID, or filter. This search does not change documented eligibility conditions.",
      ),
    ).toBeInTheDocument();
  });

  it("shows a loading state while the catalog is fetched", () => {
    vi.stubGlobal("fetch", mockCatalogFetch({ catalog: "pending" }));
    renderApp(["/schemes"]);
    expect(screen.getByText("Loading supported schemes...")).toBeInTheDocument();
  });

  it("shows an error state when the catalog cannot be loaded", async () => {
    vi.stubGlobal("fetch", mockCatalogFetch({ catalog: "error" }));
    renderApp(["/schemes"]);
    expect(
      await screen.findByText("Something went wrong while processing your request. Please try again."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("reads filter state from the URL", async () => {
    vi.stubGlobal("fetch", mockCatalogFetch());
    renderApp(["/schemes?q=education&category=Higher+education+assurance"]);
    expect(await screen.findByText(SAMPLE_SCHEME.scheme_name)).toBeInTheDocument();
    expect(screen.getByText(SECOND_SCHEME.scheme_name)).toBeInTheDocument();
    expect(screen.queryByText(ADVANCED_SCHEME.scheme_name)).not.toBeInTheDocument();
    expect(screen.getAllByPlaceholderText("Search by scheme name, description, or keyword")[0]).toHaveValue("education");
  });

  it("exposes accessible search, filter, and result-count labels", async () => {
    vi.stubGlobal("fetch", mockCatalogFetch());
    renderApp(["/schemes"]);
    expect(await screen.findByText(SAMPLE_SCHEME.scheme_name)).toBeInTheDocument();
    expect(screen.getAllByLabelText("Search")[0]).toBeInTheDocument();
    expect(screen.getAllByLabelText("Category")[0]).toBeInTheDocument();
    expect(screen.getAllByLabelText("Department")[0]).toBeInTheDocument();
    expect(screen.getAllByLabelText("Eligibility")[0]).toBeInTheDocument();
    expect(screen.getAllByLabelText("Sort")[0]).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();
    expect(screen.getAllByText("Showing 3 of 3 schemes")[0]).toBeInTheDocument();
  });

  it("shows Tamil catalog copy", async () => {
    vi.stubGlobal("fetch", mockCatalogFetch({ catalog: { ...CATALOG, schemes: [] } }));
    renderApp(["/schemes"], { language: "ta" });
    expect(await screen.findByRole("heading", { name: "அரசு திட்டங்களை ஆராயுங்கள்" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "திட்டங்கள் இல்லை" })).toBeInTheDocument();
  });
});

describe("scheme discovery eligibility overlay", () => {
  it("filters by existing recommendation eligibility and updates the count", async () => {
    vi.stubGlobal("fetch", mockCatalogFetch());
    renderAuthenticatedApp(["/schemes"], {
      profile: VALID_PROFILE,
      result: discoveryRecommend(),
    });
    expect(await screen.findByRole("list", { name: "Scheme results" })).toBeInTheDocument();
    expect(screen.getAllByText(SAMPLE_SCHEME.scheme_name).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Eligible").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Not eligible").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cannot be fully evaluated").length).toBeGreaterThan(0);
    const user = userEvent.setup();
    await user.selectOptions(screen.getAllByLabelText("Eligibility")[0], "Eligible");
    const results = screen.getByRole("list", { name: "Scheme results" });
    expect(within(results).getByText(SAMPLE_SCHEME.scheme_name)).toBeInTheDocument();
    expect(within(results).queryByText(SECOND_SCHEME.scheme_name)).not.toBeInTheDocument();
    expect(within(results).queryByText(ADVANCED_SCHEME.scheme_name)).not.toBeInTheDocument();
    expect(screen.getAllByText("Showing 1 eligible scheme").length).toBeGreaterThan(0);
  });

  it("applies search, category, department, and eligibility together", async () => {
    vi.stubGlobal("fetch", mockCatalogFetch());
    renderAuthenticatedApp(["/schemes"], {
      profile: VALID_PROFILE,
      result: discoveryRecommend(),
    });
    expect(await screen.findByRole("list", { name: "Scheme results" })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.type(screen.getAllByPlaceholderText("Search by scheme name, description, or keyword")[0], "education");
    await user.selectOptions(screen.getAllByLabelText("Category")[0], "Higher education assurance");
    await user.selectOptions(
      screen.getAllByLabelText("Department")[0],
      "Social Welfare and Women Empowerment Department",
    );
    await user.selectOptions(screen.getAllByLabelText("Eligibility")[0], "Eligible");
    const results = screen.getByRole("list", { name: "Scheme results" });
    expect(within(results).getByText(SAMPLE_SCHEME.scheme_name)).toBeInTheDocument();
    expect(within(results).queryByText(SECOND_SCHEME.scheme_name)).not.toBeInTheDocument();
    expect(within(results).queryByText(ADVANCED_SCHEME.scheme_name)).not.toBeInTheDocument();
  });

  it("sorts eligible schemes first using the existing recommendation", async () => {
    vi.stubGlobal("fetch", mockCatalogFetch());
    renderAuthenticatedApp(["/schemes"], {
      profile: VALID_PROFILE,
      result: discoveryRecommend(),
    });
    expect(await screen.findByText(SAMPLE_SCHEME.scheme_name)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.selectOptions(screen.getAllByLabelText("Sort")[0], "Eligible First");
    const names = screen
      .getAllByRole("heading", { level: 2 })
      .map((node) => node.textContent)
      .filter((name) =>
        [SAMPLE_SCHEME.scheme_name, SECOND_SCHEME.scheme_name, ADVANCED_SCHEME.scheme_name].includes(name ?? ""),
      );
    expect(names[0]).toBe(SAMPLE_SCHEME.scheme_name);
  });

  it("shows recommended schemes from the existing recommendation response", async () => {
    vi.stubGlobal("fetch", mockCatalogFetch());
    renderAuthenticatedApp(["/schemes"], {
      profile: VALID_PROFILE,
      result: discoveryRecommend(),
    });
    expect(await screen.findByRole("heading", { name: "Recommended for You" })).toBeInTheDocument();
    expect(screen.getByText("Based on your saved profile")).toBeInTheDocument();
    const recommended = screen.getByRole("heading", { name: "Recommended for You" }).closest("section");
    expect(recommended).not.toBeNull();
    expect(within(recommended as HTMLElement).getByText(SAMPLE_SCHEME.scheme_name)).toBeInTheDocument();
    expect(within(recommended as HTMLElement).getByText(ADVANCED_SCHEME.scheme_name)).toBeInTheDocument();
    expect(screen.getByText(/research-prototype results, not government approval/i)).toBeInTheDocument();
    expect(screen.queryByText(/add this information to become eligible/i)).not.toBeInTheDocument();
  });

  it("enables Compare Selected after two schemes are chosen", async () => {
    vi.stubGlobal("fetch", mockCatalogFetch());
    renderAuthenticatedApp(["/schemes"], {
      profile: VALID_PROFILE,
      result: discoveryRecommend(),
    });
    expect(await screen.findByText(SAMPLE_SCHEME.scheme_name)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compare Selected" })).toBeDisabled();
    expect(screen.getByText("Select at least one scheme to compare.")).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("checkbox", { name: `Compare ${SAMPLE_SCHEME.scheme_name}` }));
    await user.click(screen.getByRole("checkbox", { name: `Compare ${SECOND_SCHEME.scheme_name}` }));
    expect(screen.getByRole("button", { name: "Compare Selected" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Compare Selected" }));
    expect(await screen.findByRole("heading", { name: /Compare/i })).toBeInTheDocument();
  });

  it("does not invent eligibility when no recommendation result exists", async () => {
    vi.stubGlobal("fetch", mockCatalogFetch());
    renderApp(["/schemes"]);
    expect(await screen.findByText(SAMPLE_SCHEME.scheme_name)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Recommended for You" })).not.toBeInTheDocument();
    const user = userEvent.setup();
    await user.selectOptions(screen.getAllByLabelText("Eligibility")[0], "Eligible");
    expect(screen.getByRole("heading", { name: "No schemes found" })).toBeInTheDocument();
    expect(screen.queryByText(SAMPLE_SCHEME.scheme_name)).not.toBeInTheDocument();
  });
});
