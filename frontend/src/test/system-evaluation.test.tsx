import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SystemEvaluationResponse } from "../types/api";
import { renderApp, renderAuthenticatedApp } from "./renderApp";

const SUMMARY: SystemEvaluationResponse = {
  prototype_notice:
    "Academic Research Prototype. This page measures the existing system. It is not government accuracy, production monitoring, or an official service.",
  ml_metrics_note:
    "These ML and hybrid figures come from the existing Phase 4/5 evaluation artifacts. They are not live API timings and were not recomputed for this request.",
  api_metrics_note:
    "Live in-process timings for this running API process only. Counters reset when the process restarts.",
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
      f1: 1,
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
    note: "Rule and ML agreed on held-out synthetic rows.",
    source: "run_metadata.json",
  },
  api_performance: {
    note: "Live in-process timings.",
    started_at: "2026-09-04T09:00:00+00:00",
    endpoints: [
      { endpoint: "/predict", request_count: 2, error_count: 0, average_ms: 12.5, min_ms: 10, max_ms: 15 },
      { endpoint: "/recommend", request_count: 1, error_count: 0, average_ms: 20, min_ms: 20, max_ms: 20 },
      { endpoint: "/schemes", request_count: 4, error_count: 0, average_ms: 3.2, min_ms: 2, max_ms: 5 },
      { endpoint: "/evaluation", request_count: 3, error_count: 0, average_ms: 8, min_ms: 6, max_ms: 11 },
      { endpoint: "/insights", request_count: 0, error_count: 0, average_ms: null, min_ms: null, max_ms: null },
    ],
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

describe("system evaluation page", () => {
  it("redirects unauthenticated visitors to login", () => {
    renderApp(["/system-evaluation"]);
    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
  });

  it("shows ML, hybrid, dataset, API, and health sections without secrets", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const path = String(url);
      if (path.includes("/api/v1/system-evaluation")) return Promise.resolve(jsonOk(SUMMARY));
      if (path.includes("/notifications")) {
        return Promise.resolve(jsonOk({ notifications: [], unread_count: 0, count: 0 }));
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/system-evaluation"]);

    expect(await screen.findByRole("heading", { name: "System Performance & Evaluation" })).toBeInTheDocument();
    expect(screen.getAllByText(/Academic Research Prototype/).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "ML Performance" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Hybrid Agreement" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Dataset Summary" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "API Performance" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "System Health" })).toBeInTheDocument();
    expect(screen.getAllByText("Decision Tree").length).toBeGreaterThan(0);
    expect(screen.getAllByText("/predict").length).toBeGreaterThan(0);
    expect(screen.getAllByText("/recommend").length).toBeGreaterThan(0);
    expect(screen.getAllByText("12.50 ms").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /^System Evaluation$/ })).toHaveAttribute("href", "/system-evaluation");
    expect(screen.getByRole("link", { name: "Open full research evaluation" })).toHaveAttribute("href", "/evaluation");
    expect(screen.queryByText("password_hash")).not.toBeInTheDocument();
    expect(screen.queryByText("google-access-token")).not.toBeInTheDocument();
    expect(screen.queryByText("wet_land_acres")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/api/v1/system-evaluation"))).toBe(true);
  });
});
