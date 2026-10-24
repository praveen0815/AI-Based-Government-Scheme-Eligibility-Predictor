import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { en } from "../i18n/en";
import type {
  ReadinessEvaluationListResponse,
  ReadinessProgressResponse,
  SchemeCatalogItem,
  SchemeKnowledgeRecord,
  SchemeReadinessEvaluation,
  SchemeRequirements,
} from "../types/api";
import { recommendResponse, SAMPLE_SCHEME, VALID_PROFILE } from "./fixtures";
import { renderAuthenticatedApp } from "./renderApp";

const SOURCE = SAMPLE_SCHEME.official_source_url as string;

const REQUIREMENTS: SchemeRequirements = {
  scheme_id: SAMPLE_SCHEME.scheme_id,
  scheme_name: SAMPLE_SCHEME.scheme_name,
  department: SAMPLE_SCHEME.department,
  ml_scope: "CORE",
  rule_evaluated: true,
  rule_status: "PARTIALLY_VERIFIED",
  conditions: [
    {
      key: "gender_female",
      label: "Applicant is female",
      profile_fields: ["gender"],
      verification_status: "verified",
      basis: "official_source",
      note: null,
    },
    {
      key: "age_18_or_above",
      label: "Applicant is 18 years or older",
      profile_fields: ["age"],
      verification_status: "unverified",
      basis: "department_convention",
      note: "No scheme-specific age is printed on the scheme page.",
    },
  ],
  required_profile_fields: ["gender", "age"],
  information_not_checked: [
    {
      key: "family_income",
      label: "Economically weaker family",
      verification_status: "missing",
      note: "The rule engine does not check income.",
    },
  ],
  documents_status: "listed",
  documents: [
    {
      key: "applicant-photo",
      label: "applicant photo",
      requirement: "unspecified",
      verification_status: "unverified",
      source_url: SOURCE,
      last_verified_at: null,
    },
  ],
  application_steps: [
    {
      key: "step:1",
      order: 1,
      text: "Online through the Penkalvi portal",
      verification_status: "unverified",
      source_url: SOURCE,
      last_verified_at: null,
    },
  ],
  official_source_url: SOURCE,
  official_links: [{ url: SOURCE, origin: "official_source_url" }],
  eligibility_notes: "Documented CORE research rule.",
  last_checked: "2026-08-14",
  unverified_items: ["condition: Applicant is 18 years or older", "step 1: Online through the Penkalvi portal"],
  disclaimer: "Requirements repeat the official catalog and the documented rule conditions only.",
};

const KNOWLEDGE: SchemeKnowledgeRecord = {
  scheme_id: SAMPLE_SCHEME.scheme_id,
  scheme_name: SAMPLE_SCHEME.scheme_name,
  department: SAMPLE_SCHEME.department,
  scheme_category: SAMPLE_SCHEME.scheme_category,
  ml_scope: "CORE",
  catalog_rule_status: "PARTIALLY_VERIFIED",
  official_source_url: SOURCE,
  items: [
    {
      field_key: "benefit_description",
      label: "Benefit details",
      value: "Rs. 1,000 per month",
      content_state: "present",
      verification_status: "verified",
      source_url: SOURCE,
      last_verified_at: "2026-09-28",
      catalog_access_date: "2026-08-14",
    },
  ],
  disclaimer: "This knowledge base repeats official catalog text only.",
};

const EVALUATION: SchemeReadinessEvaluation = {
  scheme_id: SAMPLE_SCHEME.scheme_id,
  scheme_name: SAMPLE_SCHEME.scheme_name,
  readiness_state: "unverified_requirements",
  blocking_reasons: ["Some official requirements are not yet confirmed. Check the official source before applying."],
  eligibility: {
    outcome: "eligible_under_rules",
    rule_status: "PARTIALLY_VERIFIED",
    conditions: [
      {
        key: "gender_female",
        label: "Applicant is female",
        outcome: "met",
        rule_reason: "female",
        profile_fields: ["gender"],
        verification_status: "verified",
        basis: "official_source",
        note: null,
      },
      {
        key: "age_18_or_above",
        label: "Applicant is 18 years or older",
        outcome: "met",
        rule_reason: "age 20 is 18 or above",
        profile_fields: ["age"],
        verification_status: "unverified",
        basis: "department_convention",
        note: null,
      },
    ],
    verification_notes: null,
  },
  profile: { has_wallet: true, required_fields: ["gender", "age"], missing_fields: [] },
  documents: {
    documents_status: "listed",
    items: [
      {
        key: "applicant-photo",
        label: "applicant photo",
        requirement: "unspecified",
        verification_status: "unverified",
        citizen_status: "ready",
      },
    ],
    mandatory_missing: [],
    requirement_level_unspecified: true,
  },
  unverified_requirements: ["condition: Applicant is 18 years or older"],
  application_steps: ["Online through the Penkalvi portal"],
  official_source_url: SOURCE,
  ml_comparison: null,
  manual_stage: { stage: null, consistent_with_evaluation: true, note: null },
  last_checked: "2026-08-14",
  disclaimer: "Readiness evaluation combines the documented rule result.",
};

const INSUFFICIENT: SchemeReadinessEvaluation = {
  ...EVALUATION,
  readiness_state: "insufficient_information",
  blocking_reasons: ["No saved profile. Create your data wallet so the documented rules can be checked."],
  eligibility: {
    ...EVALUATION.eligibility,
    outcome: "insufficient_information",
    conditions: EVALUATION.eligibility.conditions.map((condition) => ({
      ...condition,
      outcome: "unknown",
      rule_reason: null,
    })),
  },
  profile: { has_wallet: false, required_fields: ["gender", "age"], missing_fields: ["gender", "age"] },
  documents: { ...EVALUATION.documents, items: EVALUATION.documents.items.map((item) => ({ ...item, citizen_status: "not_started" })) },
};

function catalogItem(): SchemeCatalogItem {
  return {
    scheme_id: SAMPLE_SCHEME.scheme_id,
    scheme_name: SAMPLE_SCHEME.scheme_name,
    department: SAMPLE_SCHEME.department,
    scheme_category: SAMPLE_SCHEME.scheme_category,
    description: SAMPLE_SCHEME.description,
    benefit_description: SAMPLE_SCHEME.benefit,
    required_documents: SAMPLE_SCHEME.required_documents,
    application_method: SAMPLE_SCHEME.application_method,
    official_source_url: SOURCE,
    eligibility_notes: "Documented CORE research rule.",
    ml_scope: "CORE",
    eligibility_rule_status: "PARTIALLY_VERIFIED",
  };
}

function jsonOk(body: unknown) {
  return Promise.resolve({ ok: true as const, json: async () => body });
}

function routedFetch(overrides: {
  requirements?: unknown;
  evaluation?: unknown;
  evaluationList?: unknown;
  progress?: unknown;
  requirementsStatus?: number;
} = {}) {
  return vi.fn().mockImplementation((url: string) => {
    const path = String(url);
    if (path.includes("/requirements")) {
      if (overrides.requirementsStatus) return Promise.resolve({ ok: false, status: overrides.requirementsStatus });
      return jsonOk(overrides.requirements ?? REQUIREMENTS);
    }
    if (path.includes("/scheme-knowledge/")) return jsonOk(KNOWLEDGE);
    if (path.includes("/readiness/evaluation/")) return jsonOk(overrides.evaluation ?? EVALUATION);
    if (path.endsWith("/readiness/evaluation")) return jsonOk(overrides.evaluationList);
    if (path.endsWith("/api/v1/readiness")) return jsonOk(overrides.progress);
    return jsonOk({ scheme_count: 1, schemes: [catalogItem()] });
  });
}

function calledPaths(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return fetchMock.mock.calls.map((call) => String(call[0]));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("scheme requirements on the scheme detail page", () => {
  it("shows conditions, documents, steps, links, source verification and readiness from the API", async () => {
    const fetchMock = routedFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp([`/schemes/${SAMPLE_SCHEME.scheme_id}`]);

    const panel = await screen.findByRole("region", { name: `${en.reqTitle}: ${SAMPLE_SCHEME.scheme_name}` });
    expect(within(panel).getByText("Applicant is 18 years or older")).toBeInTheDocument();
    expect(within(panel).getByText("No scheme-specific age is printed on the scheme page.")).toBeInTheDocument();
    expect(within(panel).getByText(en.reqBasisConvention)).toBeInTheDocument();
    expect(within(panel).getByText(/Economically weaker family/)).toBeInTheDocument();
    expect(within(panel).getByText(en.reqLastChecked("2026-08-14"))).toBeInTheDocument();
    expect(within(panel).getByText("applicant photo")).toBeInTheDocument();
    expect(within(panel).getByText(en.reqLevelUnspecified)).toBeInTheDocument();
    expect(within(panel).queryByText(en.reqLevelMandatory)).not.toBeInTheDocument();
    expect(within(panel).getByText("Online through the Penkalvi portal")).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: SOURCE })).toHaveAttribute("href", SOURCE);
    expect(await within(panel).findByText(en.reqLastVerified("2026-09-28"))).toBeInTheDocument();

    expect(await within(panel).findByText("age 20 is 18 or above")).toBeInTheDocument();
    expect(within(panel).getAllByText(en.evalStateUnverified).length).toBeGreaterThan(0);
    expect(within(panel).getByText(en.reqDocReady)).toBeInTheDocument();

    const paths = calledPaths(fetchMock);
    expect(paths.some((path) => path.endsWith(`/api/v1/schemes/${SAMPLE_SCHEME.scheme_id}/requirements`))).toBe(true);
    expect(paths.some((path) => path.endsWith(`/api/v1/scheme-knowledge/${SAMPLE_SCHEME.scheme_id}`))).toBe(true);
    expect(paths.some((path) => path.endsWith(`/api/v1/readiness/evaluation/${SAMPLE_SCHEME.scheme_id}`))).toBe(true);
  });

  it("treats unknown conditions as not checked, never as failed", async () => {
    vi.stubGlobal("fetch", routedFetch({ evaluation: INSUFFICIENT }));
    renderAuthenticatedApp([`/schemes/${SAMPLE_SCHEME.scheme_id}`]);

    const panel = await screen.findByRole("region", { name: `${en.reqTitle}: ${SAMPLE_SCHEME.scheme_name}` });
    expect((await within(panel).findAllByText(en.reqOutcomeUnknown)).length).toBe(2);
    expect(within(panel).queryByText(en.reqOutcomeNotMet)).not.toBeInTheDocument();
    expect(within(panel).queryByText(en.evalFailedConditions)).not.toBeInTheDocument();
    expect(within(panel).getByText(en.evalUnknownConditions)).toBeInTheDocument();
    expect(within(panel).getByText(en.evalMissingFields)).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: en.evalCreateWallet })).toHaveAttribute("href", "/wallet");
  });

  it("shows an error state when requirements cannot be loaded", async () => {
    vi.stubGlobal("fetch", routedFetch({ requirementsStatus: 503 }));
    renderAuthenticatedApp([`/schemes/${SAMPLE_SCHEME.scheme_id}`]);
    expect(
      await screen.findByText("The eligibility service is temporarily unavailable. Please try again in a moment."),
    ).toBeInTheDocument();
  });

  it("does not request a readiness evaluation for schemes the rules do not evaluate", async () => {
    const fetchMock = routedFetch({ requirements: { ...REQUIREMENTS, rule_evaluated: false, conditions: [] } });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp([`/schemes/${SAMPLE_SCHEME.scheme_id}`]);
    expect(await screen.findByText(en.reqNotRuleEvaluated)).toBeInTheDocument();
    expect(calledPaths(fetchMock).some((path) => path.includes("/readiness/evaluation"))).toBe(false);
  });
});

describe("scheme requirements inside result cards", () => {
  it("loads requirements by the card's scheme ID and collapses accessibly", async () => {
    const fetchMock = routedFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/results"], { profile: VALID_PROFILE, result: recommendResponse([SAMPLE_SCHEME]) });

    const toggle = await screen.findByRole("button", { name: en.hideDetails });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute("aria-controls");
    expect(await screen.findByText("age 20 is 18 or above")).toBeInTheDocument();
    const paths = calledPaths(fetchMock);
    expect(paths.some((path) => path.endsWith(`/api/v1/schemes/${SAMPLE_SCHEME.scheme_id}/requirements`))).toBe(true);
    expect(paths.some((path) => path.endsWith(`/api/v1/readiness/evaluation/${SAMPLE_SCHEME.scheme_id}`))).toBe(true);

    await userEvent.setup().click(toggle);
    expect(screen.getByRole("button", { name: en.viewScheme })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("age 20 is 18 or above")).not.toBeInTheDocument();
  });
});

describe("readiness evaluation on the Application Readiness page", () => {
  const progress: ReadinessProgressResponse = {
    schemes: [],
    schemes_being_prepared: 0,
    overall_progress_percent: 0,
    disclaimer: "Application Readiness is a research-prototype tracker.",
  };

  it("shows states in backend order, open items and the saved-stage contradiction", async () => {
    const contradiction: SchemeReadinessEvaluation = {
      ...EVALUATION,
      readiness_state: "missing_mandatory_documents",
      blocking_reasons: ["Mandatory documents not marked ready: applicant photo."],
      documents: { ...EVALUATION.documents, mandatory_missing: ["applicant photo"] },
      manual_stage: {
        stage: "ready_to_apply",
        consistent_with_evaluation: false,
        note: "Your saved preparation stage says you are ready, but this evaluation still has open items.",
      },
    };
    const list: ReadinessEvaluationListResponse = { schemes: [contradiction], count: 1, disclaimer: "x" };
    vi.stubGlobal("fetch", routedFetch({ evaluationList: list, progress }));
    renderAuthenticatedApp(["/readiness"]);

    const states = await screen.findByRole("list", { name: en.evalStatesLabel });
    expect(within(states).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      en.evalStateInsufficient,
      en.evalStateIneligible,
      en.evalStateMissingDocs,
      en.evalStateUnverified,
      en.evalStateEligible,
    ]);
    expect(within(states).getByText(en.evalStateMissingDocs)).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("Mandatory documents not marked ready: applicant photo.")).toBeInTheDocument();
    expect(screen.getByText(en.evalMissingDocs)).toBeInTheDocument();
    expect(screen.getByText(en.evalStageWarning)).toBeInTheDocument();
    expect(
      screen.getByText("Your saved preparation stage says you are ready, but this evaluation still has open items."),
    ).toBeInTheDocument();
  });

  it("keeps the stage tracker usable when the evaluation fails", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (String(url).endsWith("/readiness/evaluation")) return Promise.resolve({ ok: false, status: 503 });
      return jsonOk(progress);
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/readiness"]);
    expect(
      await screen.findByText("The eligibility service is temporarily unavailable. Please try again in a moment."),
    ).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: en.readinessEmptyTitle })).toBeInTheDocument();
  });
});
