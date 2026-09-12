import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SystemEvaluationResponse } from "../types/api";
import { renderApp, renderAuthenticatedApp } from "./renderApp";

const SUMMARY: SystemEvaluationResponse = {
  prototype_notice: "Academic Research Prototype.",
  ml_metrics_note: "Existing Phase 4/5 metrics.",
  api_metrics_note: "Live in-process timings.",
  dataset: {
    official_scheme_count: 13,
    core_scheme_count: 6,
    dataset_citizen_count: 5000,
    eligibility_record_count: 30000,
    eligible_count: 3653,
    not_eligible_count: 26347,
    eligible_percentage: 12.18,
    not_eligible_percentage: 87.82,
    train_citizen_count: 4000,
    test_citizen_count: 1000,
    selected_model: "Decision Tree",
    model_type: "Decision Tree",
    synthetic_data: true,
    rule_derived_labels: true,
  },
  models: [
    {
      model_key: "decision_tree",
      model: "Decision Tree",
      selected: true,
      accuracy: 1,
      precision: 1,
      recall: 1,
      f1: 0.99,
      balanced_accuracy: 1,
      roc_auc: 1,
      pr_auc: 1,
    },
  ],
  hybrid: {
    model: "Decision Tree",
    test_citizen_count: 1000,
    test_row_count: 6000,
    agreement_count: 6000,
    disagreement_count: 0,
    agreement_percentage: 100,
    note: "Rule and ML agreed.",
    source: "run_metadata.json",
  },
  api_performance: {
    note: "Live in-process timings.",
    started_at: "2026-09-04T09:00:00+00:00",
    endpoints: [{ endpoint: "/recommend", request_count: 1, error_count: 0, average_ms: 20, min_ms: 20, max_ms: 20 }],
  },
  health: {
    status: "ok",
    database: "connected",
    environment: "development",
    model_loaded: true,
    evaluation_ready: true,
  },
};

function jsonOk(body: unknown) {
  return { ok: true as const, json: async () => body };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("research dashboard", () => {
  it("redirects unauthenticated visitors to login", () => {
    renderApp(["/research-dashboard"]);
    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
  });

  it("renders Phase 29 system metrics for a signed-in researcher", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const path = String(url);
      if (path.includes("/api/v1/system-evaluation")) return Promise.resolve(jsonOk(SUMMARY));
      if (path.includes("/notifications")) {
        return Promise.resolve(jsonOk({ notifications: [], unread_count: 0, disclaimer: "" }));
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/research-dashboard"]);
    expect(await screen.findByRole("heading", { name: "Research Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("5,000")).toBeInTheDocument();
    expect(screen.getByText("13")).toBeInTheDocument();
    expect(screen.getByText("12.18%")).toBeInTheDocument();
    expect(screen.getByText("87.82%")).toBeInTheDocument();
    expect(screen.getByText(/Decision Tree: F1 0.990/)).toBeInTheDocument();
    expect(screen.getByText("/recommend")).toBeInTheDocument();
    expect(screen.getByText("ok")).toBeInTheDocument();
    expect(screen.getByText(/research-prototype dashboard/i)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/api/v1/system-evaluation"))).toBe(true);
  });
});
