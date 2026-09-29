import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { en } from "../i18n/en";
import { ta } from "../i18n/ta";
import type { AgentRunResponse, AgentStatusResponse, SchemeKnowledgeListResponse } from "../types/api";
import { renderApp, renderAuthenticatedApp } from "./renderApp";

const STATUS: AgentStatusResponse = {
  llm_configured: false,
  llm_model: null,
  fallback: "template",
  read_only: true,
  allowed_tools: ["get_profile_completeness", "search_schemes", "check_eligibility"],
  disclaimer: "This agent coordinates existing research-prototype services only.",
};

const KNOWLEDGE: SchemeKnowledgeListResponse = {
  scheme_count: 1,
  total_catalog_count: 13,
  departments: ["Social Welfare and Women Empowerment Department"],
  categories: ["Higher education assurance"],
  disclaimer: "Retrieval does not predict eligibility.",
  schemes: [
    {
      scheme_id: "TN-SW-001",
      scheme_name: "Moovalur Ramamirtham Ammaiyar Ninaivu Pudhumai Penn Thittam",
      department: "Social Welfare and Women Empowerment Department",
      scheme_category: "Higher education assurance",
      ml_scope: "CORE",
      catalog_rule_status: "PARTIALLY_VERIFIED",
      official_source_url: "https://www.tnsocialwelfare.tn.gov.in/en/specilisationswoman-welfare/pudhumai-penn",
      disclaimer: "Retrieval does not predict eligibility.",
      items: [],
    },
  ],
};

const SCHEME_REPLY: AgentRunResponse = {
  reply: "Pudhumai Penn is a higher education assurance scheme. Required documents are not confirmed.",
  language: "en",
  intent: "EXPLAIN_SCHEME",
  llm_used: false,
  provider: "template",
  agent_ran: true,
  tools_used: ["get_scheme_knowledge"],
  steps: [{ tool: "get_scheme_knowledge", status: "ok", summary: "Retrieved source-backed scheme knowledge" }],
  scheme_id: "TN-SW-001",
  scheme_name: "Moovalur Ramamirtham Ammaiyar Ninaivu Pudhumai Penn Thittam",
  sources: [
    {
      scheme_id: "TN-SW-001",
      scheme_name: "Moovalur Ramamirtham Ammaiyar Ninaivu Pudhumai Penn Thittam",
      field_key: "required_documents",
      label: "Required documents",
      source_url: "https://www.tnsocialwelfare.tn.gov.in/en/specilisationswoman-welfare/pudhumai-penn",
      verification_status: "unverified",
      last_verified_at: null,
      content_state: "unverified_placeholder",
    },
  ],
  actions: [],
  notice: "A live language model is not configured. This answer uses the source-backed knowledge template.",
  disclaimer: STATUS.disclaimer,
};

const ELIGIBILITY_REPLY: AgentRunResponse = {
  reply: "The existing checker evaluated 6 CORE schemes and predicted 1 as eligible.",
  language: "en",
  intent: "CHECK_ELIGIBILITY",
  llm_used: false,
  provider: "template",
  agent_ran: true,
  tools_used: ["get_profile_completeness", "check_eligibility"],
  steps: [{ tool: "check_eligibility", status: "ok", summary: "Requested eligibility from the existing Hybrid Rule + ML checker" }],
  scheme_id: "TN-SW-001",
  scheme_name: "Moovalur Ramamirtham Ammaiyar Ninaivu Pudhumai Penn Thittam",
  sources: SCHEME_REPLY.sources,
  actions: [
    { label: "Check eligibility", path: "/check" },
    { label: "View results", path: "/results" },
  ],
  notice: null,
  disclaimer: STATUS.disclaimer,
};

function jsonOk(body: unknown) {
  return { ok: true as const, json: async () => body };
}

function mockPortalFetch(handler: (url: string, method: string, body?: string) => Promise<unknown> | unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const path = String(url);
      const method = String(init?.method || "GET").toUpperCase();
      return Promise.resolve(handler(path, method, typeof init?.body === "string" ? init.body : undefined));
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("scheme assistant page", () => {
  it("sends an unauthenticated visitor to login", () => {
    renderApp(["/scheme-assistant"]);
    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
  });

  it("keeps the sidebar link and loads scheme names", async () => {
    mockPortalFetch((path) => {
      if (path.includes("/scheme-agent/status")) return jsonOk(STATUS);
      if (path.includes("/scheme-knowledge")) return jsonOk(KNOWLEDGE);
      return { ok: false, status: 404 };
    });
    renderAuthenticatedApp(["/scheme-assistant"]);
    expect(await screen.findByRole("heading", { name: en.assistantTitle })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: en.navSchemeAssistant, current: "page" })).toHaveAttribute(
      "href",
      "/scheme-assistant",
    );
    expect(screen.getAllByRole("link", { name: en.navSchemeAssistant }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("option", { name: /TN-SW-001/ })).toBeInTheDocument();
    expect(screen.getByText(en.assistantLlmFallback)).toBeInTheDocument();
  });

  it("sends a scheme question and shows source plus unverified status", async () => {
    mockPortalFetch((path, method, body) => {
      if (path.includes("/scheme-agent/status")) return jsonOk(STATUS);
      if (path.includes("/scheme-knowledge")) return jsonOk(KNOWLEDGE);
      if (path.includes("/scheme-agent/run") && method === "POST") {
        const payload = JSON.parse(body || "{}");
        expect(payload.message).toBe(en.assistantSuggestDocuments);
        expect(payload.language).toBe("en");
        expect(payload.scheme_id).toBe("TN-SW-001");
        return jsonOk(SCHEME_REPLY);
      }
      return { ok: false, status: 404 };
    });
    renderAuthenticatedApp(["/scheme-assistant"]);
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: en.assistantTitle });
    await user.selectOptions(screen.getByRole("combobox", { name: en.assistantSchemeLabel }), "TN-SW-001");
    await user.click(screen.getByRole("button", { name: en.assistantSuggestDocuments }));
    expect(await screen.findByText(SCHEME_REPLY.reply)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${en.assistantVerification}.*${en.assistantUnverified}`))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: en.assistantOfficialSource })).toHaveAttribute(
      "href",
      "https://www.tnsocialwelfare.tn.gov.in/en/specilisationswoman-welfare/pudhumai-penn",
    );
    expect(screen.queryByText("2026-08-14")).not.toBeInTheDocument();
    expect(screen.getByText(SCHEME_REPLY.notice || "")).toBeInTheDocument();
  });

  it("shows eligibility results from the existing checker", async () => {
    mockPortalFetch((path, method) => {
      if (path.includes("/scheme-agent/status")) return jsonOk(STATUS);
      if (path.includes("/scheme-knowledge")) return jsonOk(KNOWLEDGE);
      if (path.includes("/scheme-agent/run") && method === "POST") return jsonOk(ELIGIBILITY_REPLY);
      return { ok: false, status: 404 };
    });
    renderAuthenticatedApp(["/scheme-assistant"]);
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: en.assistantTitle });
    await user.click(screen.getByRole("button", { name: en.assistantSuggestEligibilityCheck }));
    expect(await screen.findByText(ELIGIBILITY_REPLY.reply)).toBeInTheDocument();
    expect(screen.getByText(en.assistantPredictionNotice)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Check eligibility" })).toHaveAttribute("href", "/check");
    expect(screen.getByText(/check_eligibility/)).toBeInTheDocument();
  });

  it("clears the current conversation", async () => {
    mockPortalFetch((path, method) => {
      if (path.includes("/scheme-agent/status")) return jsonOk(STATUS);
      if (path.includes("/scheme-knowledge")) return jsonOk(KNOWLEDGE);
      if (path.includes("/scheme-agent/run") && method === "POST") return jsonOk(SCHEME_REPLY);
      return { ok: false, status: 404 };
    });
    renderAuthenticatedApp(["/scheme-assistant"]);
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: en.assistantTitle });
    await user.click(screen.getByRole("button", { name: en.assistantSuggestAbout }));
    expect(await screen.findByText(SCHEME_REPLY.reply)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: en.assistantClear }));
    expect(screen.getByText(en.assistantHistoryEmpty)).toBeInTheDocument();
    expect(screen.queryByText(SCHEME_REPLY.reply)).not.toBeInTheDocument();
  });

  it("sends Tamil when Tamil is selected", async () => {
    mockPortalFetch((path, method, body) => {
      if (path.includes("/scheme-agent/status")) return jsonOk(STATUS);
      if (path.includes("/scheme-knowledge")) return jsonOk(KNOWLEDGE);
      if (path.includes("/scheme-agent/run") && method === "POST") {
        expect(JSON.parse(body || "{}").language).toBe("ta");
        return jsonOk({ ...SCHEME_REPLY, language: "ta", reply: "இது மூல ஆதரவு தகவல்." });
      }
      return { ok: false, status: 404 };
    });
    renderAuthenticatedApp(["/scheme-assistant"], { language: "ta" });
    const user = userEvent.setup();
    expect(await screen.findByRole("heading", { name: ta.assistantTitle })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: ta.assistantSuggestAbout }));
    expect(await screen.findByText("இது மூல ஆதரவு தகவல்.")).toBeInTheDocument();
  });

  it("shows an error when the assistant request fails", async () => {
    mockPortalFetch((path, method) => {
      if (path.includes("/scheme-agent/status")) return jsonOk(STATUS);
      if (path.includes("/scheme-knowledge")) return jsonOk(KNOWLEDGE);
      if (path.includes("/scheme-agent/run") && method === "POST") {
        return { ok: false, status: 503, json: async () => ({ detail: "down" }) };
      }
      return { ok: false, status: 404 };
    });
    renderAuthenticatedApp(["/scheme-assistant"]);
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: en.assistantTitle });
    await user.click(screen.getByRole("button", { name: en.assistantSuggestAbout }));
    expect((await screen.findAllByText(en.unavailableError)).length).toBeGreaterThan(0);
  });

  it("keeps scanner and voice navigation available", async () => {
    mockPortalFetch((path) => {
      if (path.includes("/scheme-agent/status")) return jsonOk(STATUS);
      if (path.includes("/scheme-knowledge")) return jsonOk(KNOWLEDGE);
      return { ok: false, status: 404 };
    });
    renderAuthenticatedApp(["/scheme-assistant"]);
    await screen.findByRole("heading", { name: en.assistantTitle });
    const main = within(screen.getByRole("navigation", { name: "Main" }));
    expect(main.getByRole("link", { name: en.navDocumentScanner })).toHaveAttribute("href", "/document-scanner");
    expect(main.queryByRole("link", { name: en.navVoiceAssistant })).not.toBeInTheDocument();
  });
});
