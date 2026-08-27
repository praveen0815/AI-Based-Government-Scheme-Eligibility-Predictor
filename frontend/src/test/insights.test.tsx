import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InsightsResponse } from "../types/api";
import { SAMPLE_SCHEME } from "./fixtures";
import { renderApp, renderAuthenticatedApp } from "./renderApp";

const INSIGHTS: InsightsResponse = {
  total_schemes_evaluated: 6,
  predicted_eligible_count: 1,
  not_recommended_count: 5,
  recommended_schemes: [
    {
      scheme_id: SAMPLE_SCHEME.scheme_id,
      scheme_name: SAMPLE_SCHEME.scheme_name,
      official_source_url: SAMPLE_SCHEME.official_source_url,
      status_label: "Predicted eligible",
      predicted_eligible: true,
      reason: "Documented scheme conditions satisfied: female; student.",
      rule_reasons: ["female", "student"],
      rule_eligible: true,
      ml_prediction: "eligible",
      eligible_probability: 1,
      not_eligible_probability: 0,
      agreement: true,
    },
  ],
  other_schemes: [
    {
      scheme_id: "TN-REV-001",
      scheme_name: "Land-related CORE scheme",
      official_source_url: "https://example.test/official",
      status_label: "Not recommended by this prototype",
      predicted_eligible: false,
      reason: "Documented scheme conditions not satisfied: landholding.",
      rule_reasons: ["landholding"],
      rule_eligible: false,
      ml_prediction: "not_eligible",
      eligible_probability: 0.1,
      not_eligible_probability: 0.9,
      agreement: true,
    },
  ],
  completeness: {
    percentage: 100,
    completed_fields: 11,
    total_fields: 11,
    incomplete_fields: [],
  },
  review_items: [
    { code: "verify_profile", text: "Verify profile" },
    { code: "review_official_source", text: "Review official source" },
  ],
  disclaimer: "Eligibility Insights explain this prototype's hybrid evaluation.",
};

function jsonOk(body: unknown) {
  return { ok: true as const, json: async () => body };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("eligibility insights page", () => {
  it("redirects unauthenticated visitors to login", () => {
    renderApp(["/insights"]);
    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
  });

  it("shows the empty wallet state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    renderAuthenticatedApp(["/insights"]);
    expect(await screen.findByRole("heading", { name: "Eligibility Insights" })).toBeInTheDocument();
    expect(screen.getByText("No saved profile yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create My Profile" })).toBeInTheDocument();
  });

  it("loads overview, recommended, other, transparency, and review sections", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk(INSIGHTS)));
    renderAuthenticatedApp(["/insights"]);
    expect(await screen.findByRole("heading", { name: "Eligibility Overview" })).toBeInTheDocument();
    expect(screen.getByText("6 CORE schemes evaluated")).toBeInTheDocument();
    expect(screen.getByText("1 predicted eligible scheme")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recommended Schemes" })).toBeInTheDocument();
    expect(screen.getAllByText(SAMPLE_SCHEME.scheme_name).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Other Evaluated Schemes" })).toBeInTheDocument();
    expect(screen.getAllByText("Not recommended by this prototype").length).toBeGreaterThan(0);
    expect(screen.queryByText(/officially rejected/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Rule + ML Transparency" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Things to Review" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Verify that the saved socio-economic profile is current before relying on this research check.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Your profile is 100% complete")).toBeInTheDocument();
  });
});
