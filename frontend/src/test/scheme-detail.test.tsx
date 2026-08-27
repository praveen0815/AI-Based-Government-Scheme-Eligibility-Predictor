import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RecommendResponse, SchemeCatalogItem } from "../types/api";
import { recommendResponse, SAMPLE_SCHEME, SECOND_SCHEME, VALID_PROFILE } from "./fixtures";
import { renderApp, renderAuthenticatedApp, TEST_USER } from "./renderApp";

function catalogItem(scheme = SAMPLE_SCHEME): SchemeCatalogItem {
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
    eligibility_notes: "Documented CORE research rule.",
    ml_scope: "CORE",
    eligibility_rule_status: "documented",
  };
}

function catalogOk(schemes: SchemeCatalogItem[] = [catalogItem(), catalogItem(SECOND_SCHEME)]) {
  return {
    ok: true as const,
    json: async () => ({ scheme_count: schemes.length, schemes }),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("scheme details page", () => {
  it("loads CORE catalog metadata without calling recommend", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("/recommend")) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.resolve(catalogOk());
    });
    vi.stubGlobal("fetch", fetchMock);
    renderApp([`/schemes/${SAMPLE_SCHEME.scheme_id}`]);
    expect(await screen.findByRole("heading", { name: SAMPLE_SCHEME.scheme_name })).toBeInTheDocument();
    expect(screen.getByText(`Scheme ID: ${SAMPLE_SCHEME.scheme_id}`)).toBeInTheDocument();
    expect(screen.getByText("CORE")).toBeInTheDocument();
    expect(screen.getByText("AI Research Prototype")).toBeInTheDocument();
    expect(screen.getAllByText(SAMPLE_SCHEME.department as string).length).toBeGreaterThan(0);
    expect(
      screen.getByText("Check your profile to see whether this scheme may apply to you."),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/recommend"))).toBe(false);
    expect(screen.getAllByRole("link", { name: "Visit Official Website" })[0]).toHaveAttribute(
      "href",
      SAMPLE_SCHEME.official_source_url,
    );
  });

  it("shows predicted-eligible status from existing recommendation data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(catalogOk()));
    renderApp([`/schemes/${SAMPLE_SCHEME.scheme_id}`], {
      profile: VALID_PROFILE,
      result: recommendResponse([SAMPLE_SCHEME, SECOND_SCHEME]),
    });
    expect(await screen.findByText("Predicted eligible")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("This is a research prototype prediction, not government approval.")).toBeInTheDocument();
    expect(screen.getByText("Why this scheme was recommended")).toBeInTheDocument();
    expect(screen.getByText("female")).toBeInTheDocument();
    expect(screen.getByText("government-school background")).toBeInTheDocument();
    expect(screen.queryByText(/government approved/i)).not.toBeInTheDocument();
  });

  it("shows a prototype not-recommended state without calling it a rejection", async () => {
    const result: RecommendResponse = {
      ...recommendResponse([SAMPLE_SCHEME]),
      evaluated_schemes: [
        {
          scheme_id: SECOND_SCHEME.scheme_id,
          scheme_name: SECOND_SCHEME.scheme_name,
          prediction: "not_eligible",
          eligible_probability: 0.12,
          not_eligible_probability: 0.88,
          reason: "Documented research rule was not satisfied.",
          rule_eligible: false,
          ml_prediction: "not_eligible",
          agreement: true,
        },
      ],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(catalogOk()));
    renderApp([`/schemes/${SECOND_SCHEME.scheme_id}`], {
      profile: VALID_PROFILE,
      result,
    });
    expect(await screen.findByText("Not recommended by this prototype")).toBeInTheDocument();
    expect(
      screen.getByText(
        "A scheme that is not recommended is a research prototype result, not an official government rejection.",
      ),
    ).toBeInTheDocument();
  });

  it("shows a friendly missing-scheme state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(catalogOk()));
    renderApp(["/schemes/TN-HOLD-999"]);
    expect(await screen.findByRole("heading", { name: "Scheme not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View All Schemes" })).toHaveAttribute("href", "/schemes");
  });

  it("shows a friendly API error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    renderApp([`/schemes/${SAMPLE_SCHEME.scheme_id}`]);
    expect(
      await screen.findByText("The eligibility service is temporarily unavailable. Please try again in a moment."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Traceback")).not.toBeInTheDocument();
  });

  it("enables compare for authenticated users with two recommended schemes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(catalogOk()));
    renderApp([`/schemes/${SAMPLE_SCHEME.scheme_id}`], {
      user: TEST_USER,
      token: "test-token",
      profile: VALID_PROFILE,
      result: recommendResponse([SAMPLE_SCHEME, SECOND_SCHEME]),
    });
    expect(await screen.findByText("Predicted eligible")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compare Schemes" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Download PDF Report" })).toBeEnabled();
  });

  it("keeps compare and PDF disabled without a recommendation result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(catalogOk()));
    renderAuthenticatedApp([`/schemes/${SAMPLE_SCHEME.scheme_id}`]);
    expect(await screen.findByText("Check your profile to see whether this scheme may apply to you.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compare Schemes" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Download PDF Report" })).toBeDisabled();
  });

  it("opens scheme details from the catalog View Details link", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(catalogOk()));
    renderApp(["/schemes"]);
    expect(await screen.findByText(SAMPLE_SCHEME.scheme_name)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("link", { name: "View Details" })[0]);
    expect(await screen.findByRole("heading", { name: SAMPLE_SCHEME.scheme_name })).toBeInTheDocument();
    expect(screen.getByText(`Scheme ID: ${SAMPLE_SCHEME.scheme_id}`)).toBeInTheDocument();
  });
});
