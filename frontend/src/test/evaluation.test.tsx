import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "./renderApp";

const OVERVIEW = {
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
};

const MODELS = {
  models: [
    {
      model_key: "logistic_regression",
      model: "Logistic Regression",
      selected: false,
      accuracy: 0.7368,
      precision: 0.2856,
      recall: 0.7729,
      f1: 0.4171,
      balanced_accuracy: 0.7524,
      roc_auc: 0.8338,
      pr_auc: 0.3255,
    },
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
    {
      model_key: "random_forest",
      model: "Random Forest",
      selected: false,
      accuracy: 0.9992,
      precision: 0.9932,
      recall: 1,
      f1: 0.9966,
      balanced_accuracy: 0.9995,
      roc_auc: 1,
      pr_auc: 1,
    },
  ],
  note: "These scores measure agreement with the rule engine on held-out synthetic citizens.",
};

const SCHEMES = {
  schemes: [
    {
      scheme_id: "TN-SW-001",
      scheme_name: "Moovalur Ramamirtham Ammaiyar Ninaivu Pudhumai Penn Thittam",
      eligible_count: 445,
      not_eligible_count: 4555,
      eligible_percentage: 8.9,
      official_source_url: "https://www.tnsocialwelfare.tn.gov.in/en/example",
    },
  ],
  note: "Eligible counts are synthetic rule-derived labels.",
};

const FEATURES = {
  decision_tree_importance: [{ feature: "occupation_category_other", value: 0.1762 }],
  logistic_regression_coefficients: [{ feature: "first_higher_education_course_True", value: 2.5162 }],
  random_forest_importance: [{ feature: "scheme_id_TN-REV-001", value: 0.177 }],
  note: "These are model associations and importance measures, not causal relationships.",
};

const CONFUSION = {
  matrices: [
    {
      model: "Logistic Regression",
      true_negative: 3856,
      false_positive: 1413,
      false_negative: 166,
      true_positive: 565,
    },
    {
      model: "Decision Tree",
      true_negative: 5269,
      false_positive: 0,
      false_negative: 0,
      true_positive: 731,
    },
    {
      model: "Random Forest",
      true_negative: 5264,
      false_positive: 5,
      false_negative: 0,
      true_positive: 731,
    },
  ],
  note: "Confusion matrices are from the Phase 4 test set.",
};

const HYBRID = {
  model: "Decision Tree",
  test_citizen_count: 1000,
  test_row_count: 6000,
  agreement_count: 6000,
  disagreement_count: 0,
  agreement_percentage: 100.0,
  note: "Agreement with documented rule-derived labels on synthetic research data.",
  source: "docs/rule_vs_ml_comparison.md",
};

const LIMITATIONS = {
  prototype_notice: "This system is an academic AI research prototype.",
  limitations: [
    { id: "synthetic", title: "Synthetic citizens", detail: "The citizen dataset is synthetic." },
  ],
  official_sources: [
    {
      scheme_id: "TN-SW-001",
      scheme_name: "Moovalur Ramamirtham Ammaiyar Ninaivu Pudhumai Penn Thittam",
      official_source_url: "https://www.tnsocialwelfare.tn.gov.in/en/example",
    },
  ],
};

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

function mockEvaluationFetch() {
  return vi.fn().mockImplementation(async (url: string) => {
    if (url.includes("/evaluation/overview")) return jsonResponse(OVERVIEW);
    if (url.includes("/evaluation/models")) return jsonResponse(MODELS);
    if (url.includes("/evaluation/schemes")) return jsonResponse(SCHEMES);
    if (url.includes("/evaluation/features")) return jsonResponse(FEATURES);
    if (url.includes("/evaluation/confusion-matrix")) return jsonResponse(CONFUSION);
    if (url.includes("/evaluation/limitations")) return jsonResponse(LIMITATIONS);
    if (url.includes("/evaluation/hybrid")) return jsonResponse(HYBRID);
    return { ok: false, status: 404 };
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("evaluation dashboard", () => {
  it("shows the evaluation link in the header", () => {
    renderApp(["/"]);
    const evaluationLinks = screen.getAllByRole("link", { name: "Evaluation" });
    expect(evaluationLinks.length).toBeGreaterThan(0);
    expect(evaluationLinks[0]).toHaveAttribute("href", "/evaluation");
  });

  it("loads overview cards and academic notice", async () => {
    vi.stubGlobal("fetch", mockEvaluationFetch());
    renderApp(["/evaluation"]);
    expect(await screen.findByRole("heading", { name: "Research Evaluation" })).toBeInTheDocument();
    expect(screen.getAllByText("Academic Research Prototype").length).toBeGreaterThan(0);
    expect(screen.getByText("Synthetic Dataset • Rule-Derived Labels • CORE Schemes")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Hybrid Evaluation" })).toBeInTheDocument();
    expect(screen.getByText("5,000")).toBeInTheDocument();
    expect(screen.getByText("30,000")).toBeInTheDocument();
    expect(screen.getAllByText("Selected prototype model").length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/password_hash|access_token|Bearer /i);
  });

  it("renders model comparison and scheme distribution from the API", async () => {
    const fetchMock = mockEvaluationFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderApp(["/evaluation"]);
    expect(await screen.findByRole("heading", { name: "Model Comparison" })).toBeInTheDocument();
    expect(screen.getAllByText("Logistic Regression").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Pudhumai Penn Thittam/).length).toBeGreaterThan(0);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/api/v1/evaluation/overview"))).toBe(true);
  });

  it("switches confusion matrices", async () => {
    vi.stubGlobal("fetch", mockEvaluationFetch());
    renderApp(["/evaluation"]);
    expect(await screen.findByText("5269")).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "Logistic Regression" }));
    expect(screen.getByText("3856")).toBeInTheDocument();
  });

  it("shows limitations and official source links", async () => {
    vi.stubGlobal("fetch", mockEvaluationFetch());
    renderApp(["/evaluation"]);
    expect(await screen.findByText("This system is an academic AI research prototype.")).toBeInTheDocument();
    expect(screen.getByText("These are model associations and importance measures, not causal relationships.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Pudhumai Penn/ })).toHaveAttribute(
      "href",
      "https://www.tnsocialwelfare.tn.gov.in/en/example",
    );
  });

  it("handles an evaluation API error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    renderApp(["/evaluation"]);
    expect(await screen.findByText(/Unable to connect to SchemeWise AI/)).toBeInTheDocument();
  });
});
