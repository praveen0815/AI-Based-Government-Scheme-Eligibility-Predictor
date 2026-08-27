import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CompareResponse } from "../types/api";
import { recommendResponse, SAMPLE_SCHEME, SECOND_SCHEME, THIRD_SCHEME, VALID_PROFILE } from "./fixtures";
import { renderApp, renderAuthenticatedApp } from "./renderApp";

const COMPARE_RESPONSE: CompareResponse = {
  scheme_count: 2,
  disclaimer: "This is a research prototype.",
  schemes: [
    {
      scheme_id: SAMPLE_SCHEME.scheme_id,
      scheme_name: SAMPLE_SCHEME.scheme_name,
      department: SAMPLE_SCHEME.department,
      scheme_category: SAMPLE_SCHEME.scheme_category,
      description: SAMPLE_SCHEME.description,
      eligibility_notes: "Documented CORE conditions",
      benefit: SAMPLE_SCHEME.benefit,
      required_documents: SAMPLE_SCHEME.required_documents,
      application_method: SAMPLE_SCHEME.application_method,
      official_source_url: SAMPLE_SCHEME.official_source_url,
      recommended: true,
      status_label: "Predicted eligible",
      prediction: "eligible",
      eligible_probability: 1,
      not_eligible_probability: 0,
      reason: SAMPLE_SCHEME.reason,
      rule_reasons: SAMPLE_SCHEME.rule_reasons,
      ml_prediction: "eligible",
      agreement: true,
    },
    {
      scheme_id: SECOND_SCHEME.scheme_id,
      scheme_name: SECOND_SCHEME.scheme_name,
      department: SECOND_SCHEME.department,
      scheme_category: SECOND_SCHEME.scheme_category,
      description: SECOND_SCHEME.description,
      eligibility_notes: null,
      benefit: SECOND_SCHEME.benefit,
      required_documents: SECOND_SCHEME.required_documents,
      application_method: SECOND_SCHEME.application_method,
      official_source_url: SECOND_SCHEME.official_source_url,
      recommended: true,
      status_label: "Predicted eligible",
      prediction: "eligible",
      eligible_probability: 0.8,
      not_eligible_probability: 0.2,
      reason: SECOND_SCHEME.reason,
      rule_reasons: SECOND_SCHEME.rule_reasons,
      ml_prediction: "eligible",
      agreement: true,
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("scheme comparison and PDF report", () => {
  it("asks unauthenticated visitors to sign in before comparing or downloading", () => {
    renderApp(["/results"], {
      profile: VALID_PROFILE,
      result: recommendResponse([SAMPLE_SCHEME, SECOND_SCHEME]),
    });
    expect(screen.getByText(/Sign in with a saved wallet to compare schemes/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Compare Schemes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Download PDF Report" })).not.toBeInTheDocument();
  });

  it("disables comparison until two schemes are selected and caps selection at three", async () => {
    const fourth = { ...THIRD_SCHEME, scheme_id: "TN-REV-001", scheme_name: "Land scheme for comparison cap" };
    renderAuthenticatedApp(["/results"], {
      profile: VALID_PROFILE,
      result: recommendResponse([SAMPLE_SCHEME, SECOND_SCHEME, THIRD_SCHEME, fourth]),
    });
    expect(screen.getByRole("button", { name: "Compare Schemes" })).toBeDisabled();
    const boxes = screen.getAllByRole("checkbox", { name: "Select for comparison" });
    expect(boxes).toHaveLength(4);
    const user = userEvent.setup();
    await user.click(boxes[0]);
    expect(screen.getByRole("button", { name: "Compare Schemes" })).toBeDisabled();
    await user.click(boxes[1]);
    expect(screen.getByRole("button", { name: "Compare Schemes" })).toBeEnabled();
    await user.click(boxes[2]);
    expect(boxes[3]).toBeDisabled();
    expect(boxes[0]).toBeChecked();
    expect(boxes[1]).toBeChecked();
    expect(boxes[2]).toBeChecked();
  });

  it("loads comparison from the backend and does not treat status as government approval", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => COMPARE_RESPONSE,
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(
      [
        {
          pathname: "/compare",
          state: { schemeIds: [SAMPLE_SCHEME.scheme_id, SECOND_SCHEME.scheme_id] },
        },
      ],
      {
        profile: VALID_PROFILE,
        result: recommendResponse([SAMPLE_SCHEME, SECOND_SCHEME]),
      },
    );
    expect(await screen.findByRole("heading", { name: "Compare Recommended Schemes" })).toBeInTheDocument();
    expect(screen.getAllByText(SAMPLE_SCHEME.scheme_name).length).toBeGreaterThan(0);
    expect(screen.getAllByText(SECOND_SCHEME.scheme_name).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Predicted eligible").length).toBeGreaterThan(0);
    expect(screen.getByText(/not an official government rejection/)).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/v1/compare");
    expect(JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))).toEqual({
      scheme_ids: [SAMPLE_SCHEME.scheme_id, SECOND_SCHEME.scheme_id],
    });
  });

  it("downloads a PDF report from the backend", async () => {
    const createObjectURL = vi.fn(() => "blob:report");
    vi.stubGlobal(
      "URL",
      {
        ...URL,
        createObjectURL,
        revokeObjectURL: vi.fn(),
      } as unknown as typeof URL,
    );
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["%PDF"], { type: "application/pdf" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/results"], {
      profile: VALID_PROFILE,
      result: recommendResponse([SAMPLE_SCHEME, SECOND_SCHEME]),
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Download PDF Report" }));
    expect(fetchMock).toHaveBeenCalled();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/v1/reports/recommendations");
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).method).toBe("POST");
    expect(JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))).toEqual({
      compare_scheme_ids: [],
      language: "en",
    });
  });
});
