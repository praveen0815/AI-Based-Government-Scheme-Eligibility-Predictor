import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { en } from "../i18n/en";
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
  scheme_count: 0,
  total_catalog_count: 13,
  departments: [],
  categories: [],
  disclaimer: "",
  schemes: [],
};

const PROFILE_REPLY: AgentRunResponse = {
  reply: "Your saved wallet is 82% complete. Missing fields: occupation_category.",
  language: "en",
  intent: "PROFILE_COMPLETENESS",
  llm_used: false,
  provider: "template",
  agent_ran: true,
  tools_used: ["get_profile_completeness"],
  steps: [{ tool: "get_profile_completeness", status: "ok", summary: "Read profile completeness" }],
  scheme_id: null,
  scheme_name: null,
  sources: [],
  actions: [{ label: "Open my wallet", path: "/wallet" }],
  notice: "A live language model is not configured. This summary uses the tool results directly.",
  disclaimer: STATUS.disclaimer,
};

function jsonOk(body: unknown) {
  return { ok: true as const, json: async () => body };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("scheme agent guided tasks", () => {
  it("keeps the assistant page protected", () => {
    renderApp(["/scheme-assistant"]);
    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
  });

  it("runs a profile-completeness task and shows the next action", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        const path = String(url);
        const method = String(init?.method || "GET").toUpperCase();
        if (path.includes("/scheme-agent/status")) return Promise.resolve(jsonOk(STATUS));
        if (path.includes("/scheme-knowledge")) return Promise.resolve(jsonOk(KNOWLEDGE));
        if (path.includes("/scheme-agent/run") && method === "POST") {
          const payload = JSON.parse(String(init?.body || "{}"));
          expect(payload.message).toBe(en.assistantSuggestProfile);
          expect(payload.user_id).toBeUndefined();
          return Promise.resolve(jsonOk(PROFILE_REPLY));
        }
        return Promise.resolve({ ok: false, status: 404 });
      }),
    );
    renderAuthenticatedApp(["/scheme-assistant"]);
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: en.assistantGuidedTasks });
    await user.click(screen.getByRole("button", { name: en.assistantSuggestProfile }));
    expect(await screen.findByText(PROFILE_REPLY.reply)).toBeInTheDocument();
    expect(screen.getByText(en.assistantToolsUsed, { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open my wallet" })).toHaveAttribute("href", "/wallet");
    expect(screen.getByText(en.assistantAgentReady)).toBeInTheDocument();
  });

  it("shows eligibility as a prediction and next actions", async () => {
    const reply: AgentRunResponse = {
      ...PROFILE_REPLY,
      reply: "The existing checker evaluated 6 CORE schemes and predicted 1 as eligible.",
      intent: "CHECK_ELIGIBILITY",
      tools_used: ["get_profile_completeness", "check_eligibility"],
      steps: [{ tool: "check_eligibility", status: "ok", summary: "Requested eligibility from the existing checker" }],
      actions: [
        { label: "Check eligibility", path: "/check" },
        { label: "View results", path: "/results" },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        const path = String(url);
        const method = String(init?.method || "GET").toUpperCase();
        if (path.includes("/scheme-agent/status")) return Promise.resolve(jsonOk(STATUS));
        if (path.includes("/scheme-knowledge")) return Promise.resolve(jsonOk(KNOWLEDGE));
        if (path.includes("/scheme-agent/run") && method === "POST") {
          expect(JSON.parse(String(init?.body || "{}")).message).toBe(en.assistantSuggestEligibilityCheck);
          return Promise.resolve(jsonOk(reply));
        }
        return Promise.resolve({ ok: false, status: 404 });
      }),
    );
    renderAuthenticatedApp(["/scheme-assistant"]);
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: en.assistantGuidedTasks });
    await user.click(screen.getByRole("button", { name: en.assistantSuggestEligibilityCheck }));
    expect(await screen.findByText(reply.reply)).toBeInTheDocument();
    expect(screen.getByText(en.assistantPredictionNotice)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Check eligibility" })).toHaveAttribute("href", "/check");
  });

  it("offers document and application next steps from guided tasks", async () => {
    const docs: AgentRunResponse = {
      ...PROFILE_REPLY,
      reply: "No recommended CORE schemes are in your eligibility history yet.",
      intent: "DOCUMENT_READINESS",
      tools_used: ["get_document_readiness"],
      steps: [{ tool: "get_document_readiness", status: "ok", summary: "Read document checklist" }],
      actions: [{ label: "Open documents", path: "/documents" }],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        const path = String(url);
        const method = String(init?.method || "GET").toUpperCase();
        if (path.includes("/scheme-agent/status")) return Promise.resolve(jsonOk(STATUS));
        if (path.includes("/scheme-knowledge")) return Promise.resolve(jsonOk(KNOWLEDGE));
        if (path.includes("/scheme-agent/run") && method === "POST") return Promise.resolve(jsonOk(docs));
        return Promise.resolve({ ok: false, status: 404 });
      }),
    );
    renderAuthenticatedApp(["/scheme-assistant"]);
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: en.assistantGuidedTasks });
    expect(screen.getByRole("button", { name: en.assistantSuggestFind })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: en.assistantSuggestDocsMissing })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: en.assistantSuggestApps })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: en.assistantSuggestDocsMissing }));
    expect(await screen.findByText(docs.reply)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open documents" })).toHaveAttribute("href", "/documents");
  });
});
