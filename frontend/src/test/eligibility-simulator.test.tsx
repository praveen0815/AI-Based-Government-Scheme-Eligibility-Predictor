import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { en } from "../i18n/en";
import { recommendResponse, SAMPLE_SCHEME, SECOND_SCHEME, VALID_PROFILE } from "./fixtures";
import { renderApp } from "./renderApp";

const WALLET = {
  citizen_id: "11111111-2222-3333-4444-555555555555",
  ...VALID_PROFILE,
  created_at: "2026-08-14T12:00:00+00:00",
  updated_at: "2026-08-14T12:00:00+00:00",
};

function jsonOk(body: unknown) {
  return { ok: true as const, json: async () => body };
}

function evaluated(schemeId: string, schemeName: string, prediction: "eligible" | "not_eligible") {
  return {
    scheme_id: schemeId,
    scheme_name: schemeName,
    prediction,
    eligible_probability: prediction === "eligible" ? 1 : 0.1,
    not_eligible_probability: prediction === "eligible" ? 0 : 0.9,
    reason: prediction === "eligible" ? "Documented conditions were satisfied." : "Age requirement not satisfied",
    rule_eligible: prediction === "eligible",
    ml_prediction: prediction,
    agreement: true,
  };
}

function mockSimulatorFetch() {
  return vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    const path = String(url);
    const method = String(init?.method ?? "GET").toUpperCase();
    if (path.includes("/notifications")) {
      return Promise.resolve(jsonOk({ notifications: [], unread_count: 0, disclaimer: "" }));
    }
    if (path.includes("/wallets/") && method === "PUT") {
      return Promise.resolve({ ok: false, status: 500 });
    }
    if (path.includes("/wallets/me") || path.includes("/wallets/")) {
      return Promise.resolve(jsonOk(WALLET));
    }
    if (path.includes("/recommend") && method === "POST") {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      const age = Number(body.age ?? VALID_PROFILE.age);
      const schemes = age >= 18 ? [SAMPLE_SCHEME] : [];
      return Promise.resolve(
        jsonOk({
          ...recommendResponse(schemes),
          evaluated_schemes: [
            evaluated(SAMPLE_SCHEME.scheme_id, SAMPLE_SCHEME.scheme_name, age >= 18 ? "eligible" : "not_eligible"),
            evaluated(SECOND_SCHEME.scheme_id, SECOND_SCHEME.scheme_name, "not_eligible"),
          ],
        }),
      );
    }
    return Promise.resolve({ ok: false, status: 404 });
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("eligibility simulator", () => {
  it("redirects unauthenticated visitors to login", () => {
    renderApp(["/eligibility-simulator"]);
    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
  });

  it("loads a temporary copy of the wallet and does not persist simulation", async () => {
    const fetchMock = mockSimulatorFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderApp(["/eligibility-simulator"], {
      user: { user_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", full_name: "Test User", email: "test@example.com" },
      token: "test-token",
      profile: VALID_PROFILE,
      result: {
        ...recommendResponse([SAMPLE_SCHEME]),
        evaluated_schemes: [
          evaluated(SAMPLE_SCHEME.scheme_id, SAMPLE_SCHEME.scheme_name, "eligible"),
          evaluated(SECOND_SCHEME.scheme_id, SECOND_SCHEME.scheme_name, "not_eligible"),
        ],
      },
    });

    expect(await screen.findByRole("heading", { name: "Eligibility What-If Simulator" })).toBeInTheDocument();
    expect(screen.getByText(en.simDisclaimer)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: en.simCurrentProfile })).toBeInTheDocument();
    expect(screen.getByText(en.simTemporaryCopy)).toBeInTheDocument();
    expect(screen.getByLabelText("Age")).toHaveValue(20);
    expect(screen.getByRole("button", { name: "Run Simulation" })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.clear(screen.getByLabelText("Age"));
    await user.type(screen.getByLabelText("Age"), "16");
    await user.click(screen.getByRole("button", { name: "Run Simulation" }));

    expect(await screen.findByText("Simulation results")).toBeInTheDocument();
    expect(screen.getAllByText("Simulation").length).toBeGreaterThan(0);
    expect(screen.getByText(SAMPLE_SCHEME.scheme_name)).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        (call) => String(call[0]).includes("/wallets/") && String(call[1]?.method ?? "GET").toUpperCase() === "PUT",
      ),
    ).toBe(false);
    expect(
      fetchMock.mock.calls.some((call) => String(call[0]).includes("/wallets/") && String(call[0]).includes("/recommend")),
    ).toBe(false);
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          (call) => String(call[0]).includes("/recommend") && String(call[1]?.method ?? "GET").toUpperCase() === "POST",
        ),
      ).toBe(true);
    });
  });
});
