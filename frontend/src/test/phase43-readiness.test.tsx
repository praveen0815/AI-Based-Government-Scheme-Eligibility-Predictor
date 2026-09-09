import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { en } from "../i18n/en";
import { ta } from "../i18n/ta";
import type { RecommendResponse } from "../types/api";
import { recommendResponse, SAMPLE_SCHEME, VALID_PROFILE } from "./fixtures";
import { renderApp, renderAuthenticatedApp, TEST_USER } from "./renderApp";

const PROTECTED_ROUTES = [
  "/dashboard",
  "/wallet",
  "/compare",
  "/history",
  "/documents",
  "/readiness",
  "/insights",
  "/notifications",
  "/voice-assistant",
  "/eligibility-simulator",
  "/applications",
  "/research-dashboard",
  "/system-evaluation",
  "/settings",
  "/uploads",
];

function jsonOk(body: unknown) {
  return { ok: true as const, json: async () => body };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("phase 43 authentication redirects", () => {
  it.each(PROTECTED_ROUTES)("sends an unauthenticated visitor from %s to login", (path) => {
    renderApp([path]);
    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  it("keeps JWT and Google tokens out of the rendered dashboard", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        const path = String(url);
        if (path.includes("/notifications")) {
          return Promise.resolve(jsonOk({ notifications: [], unread_count: 0, disclaimer: "" }));
        }
        if (path.includes("/history")) {
          return Promise.resolve(jsonOk({ count: 0, history: [] }));
        }
        return Promise.resolve({ ok: false, status: 404 });
      }),
    );
    renderApp(["/dashboard"], { user: TEST_USER, token: "test-token" });
    expect(await screen.findByRole("heading", { name: "Welcome back, Test User" })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("test-token");
    expect(document.body.textContent).not.toMatch(/eyJ[a-zA-Z0-9_-]+\./);
    expect(document.body.textContent).not.toContain("google-access-token");
  });
});

describe("phase 43 eligibility presentation", () => {
  it("renders backend eligibility statuses without inventing a second engine", () => {
    const result: RecommendResponse = {
      ...recommendResponse([SAMPLE_SCHEME]),
      evaluated_schemes: [
        {
          scheme_id: "TN-SW-099",
          scheme_name: "Example Not Eligible Scheme",
          prediction: "not_eligible",
          eligible_probability: 0.1,
          not_eligible_probability: 0.9,
          reason: "Age requirement not satisfied",
          rule_eligible: false,
          ml_prediction: "not_eligible",
          agreement: true,
        },
      ],
    };
    renderApp(["/results"], {
      profile: { ...VALID_PROFILE, occupation_category: "" as never },
      result,
    });
    expect(screen.getByText("Predicted eligible")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Not predicted eligible" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cannot be fully evaluated" })).toBeInTheDocument();
    expect(screen.getAllByText(en.whyRequiredToEvaluate).length).toBeGreaterThan(0);
    expect(screen.queryByText(/add this information to become eligible/i)).not.toBeInTheDocument();
  });
});

describe("phase 43 module navigation", () => {
  it("keeps authenticated sidebar links for the full demo flow", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    renderAuthenticatedApp(["/dashboard"]);
    expect(await screen.findByRole("heading", { name: "Welcome back, Test User" })).toBeInTheDocument();
    const main = within(screen.getByRole("navigation", { name: "Main" }));
    const research = within(screen.getByRole("navigation", { name: "Research" }));
    const mainHrefs = [
      ["/dashboard", "Dashboard"],
      ["/check", "Check Eligibility"],
      ["/compare", "Compare"],
      ["/history", "History"],
      ["/documents", "Documents"],
      ["/readiness", "Application Readiness"],
      ["/insights", "Insights"],
      ["/notifications", "Notifications"],
      ["/voice-assistant", "Voice Assistant"],
      ["/eligibility-simulator", "Eligibility Simulator"],
      ["/applications", "Applications"],
    ] as const;
    for (const [href, name] of mainHrefs) {
      expect(main.getByRole("link", { name })).toHaveAttribute("href", href);
    }
    expect(research.getByRole("link", { name: "Schemes" })).toHaveAttribute("href", "/schemes");
    expect(research.getByRole("link", { name: "Research Dashboard" })).toHaveAttribute("href", "/research-dashboard");
  });

  it("clears an expired JWT and returns the user to login", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    renderAuthenticatedApp(["/applications"]);
    expect(await screen.findByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
    expect(window.sessionStorage.getItem("prototypeAuthToken")).toBeNull();
  });
});

describe("phase 43 income what-if CTA", () => {
  it("explains income questions and opens the simulator only from the action button", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        const path = String(url);
        if (path.includes("/notifications")) {
          return Promise.resolve(jsonOk({ notifications: [], unread_count: 0, disclaimer: "" }));
        }
        if (path.includes("/wallets/")) {
          return Promise.resolve(
            jsonOk({
              citizen_id: "11111111-2222-3333-4444-555555555555",
              ...VALID_PROFILE,
              created_at: "2026-08-14T12:00:00+00:00",
              updated_at: "2026-08-14T12:00:00+00:00",
            }),
          );
        }
        return Promise.resolve({ ok: false, status: 404 });
      }),
    );
    renderAuthenticatedApp(["/voice-assistant"]);
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: "Type your question" }), "What if my salary changes?");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect((await screen.findAllByText(en.voiceIncomeWhatIfExplanation)).length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Eligibility What-If Simulator" })).not.toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Open Eligibility Simulator" })[0]);
    expect(await screen.findByRole("heading", { name: "Eligibility What-If Simulator" })).toBeInTheDocument();
    expect(await screen.findByText(en.simDisclaimer)).toBeInTheDocument();
    expect(await screen.findByText(en.simTemporaryCopy)).toBeInTheDocument();
  });

  it("keeps the English income explanation and Tamil CTA in the dictionaries", () => {
    expect(en.voiceIncomeWhatIfExplanation).toBe(
      "Income is not stored in your saved profile. You can use the Eligibility Simulator to try a temporary value. This does not update your wallet.",
    );
    expect(en.voiceOpenSimulator).toBe("Open Eligibility Simulator");
    expect(ta.voiceOpenSimulator).toBe("தகுதி உருவகப்படுத்தியைத் திற");
    expect(ta.voiceIncomeWhatIfExplanation.length).toBeGreaterThan(20);
  });
});
