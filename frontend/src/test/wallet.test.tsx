import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProfileCompleteness } from "../types/api";
import { recommendResponse, SAMPLE_SCHEME, VALID_PROFILE } from "./fixtures";
import { fillCitizenForm } from "./formHelpers";
import { renderApp, renderAuthenticatedApp } from "./renderApp";

const WALLET = {
  citizen_id: "11111111-2222-3333-4444-555555555555",
  ...VALID_PROFILE,
  created_at: "2026-08-14T12:00:00+00:00",
  updated_at: "2026-08-14T12:00:00+00:00",
};

const COMPLETE_PROFILE: ProfileCompleteness = {
  percentage: 100,
  completed_fields: 11,
  total_fields: 11,
  incomplete_fields: [],
};

const INCOMPLETE_PROFILE: ProfileCompleteness = {
  percentage: 82,
  completed_fields: 9,
  total_fields: 11,
  incomplete_fields: ["occupation_category", "wet_land_acres"],
};

function jsonOk(body: unknown) {
  return { ok: true as const, json: async () => body };
}

function mockWalletFetch(options?: {
  completeness?: ProfileCompleteness;
  onRequest?: (url: string, init?: RequestInit) => object | undefined;
}) {
  return vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    const path = String(url);
    const extra = options?.onRequest?.(path, init);
    if (extra) return Promise.resolve(extra);
    if (path.includes("/completeness")) {
      return Promise.resolve(jsonOk(options?.completeness ?? COMPLETE_PROFILE));
    }
    return Promise.resolve(jsonOk(WALLET));
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("data wallet page", () => {
  it("redirects unauthenticated visitors to login", () => {
    renderApp(["/wallet"]);
    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
  });

  it("loads the wallet page and shows the prototype warning", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    renderAuthenticatedApp(["/wallet"]);
    expect(await screen.findByRole("heading", { name: "My Socio-Economic Wallet" })).toBeInTheDocument();
    expect(screen.getAllByText(/Academic Research Prototype/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Your socio-economic wallet has not been created yet/)).toBeInTheDocument();
  });

  it("rejects invalid age before creating a wallet", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/wallet"]);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Create Profile" }));
    await user.type(screen.getByLabelText("Age"), "150");
    await user.selectOptions(screen.getByLabelText("Gender"), "female");
    await user.click(screen.getByRole("button", { name: "Save Wallet" }));
    expect(screen.getByText("Age must be between 0 and 120.")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((call) => String(call[1]?.method) === "POST")).toBe(false);
  });

  it("creates a wallet and shows the summary", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (String(url).includes("/completeness")) {
        return Promise.resolve(jsonOk(COMPLETE_PROFILE));
      }
      if ((init?.method ?? "GET") === "POST") {
        return Promise.resolve(jsonOk(WALLET));
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/wallet"]);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Create Profile" }));
    await fillCitizenForm();
    await user.click(screen.getByRole("button", { name: "Save Wallet" }));
    expect(await screen.findByText("Your socio-economic data wallet has been created.")).toBeInTheDocument();
    expect(screen.getByText(WALLET.citizen_id)).toBeInTheDocument();
    expect(screen.getByText(/internal wallet identifier/)).toBeInTheDocument();
    const createCall = fetchMock.mock.calls.find((call) => (call[1] as RequestInit | undefined)?.method === "POST");
    expect(createCall?.[0]).toContain("/api/v1/wallets");
    expect(JSON.parse(String((createCall?.[1] as RequestInit).body))).toEqual(VALID_PROFILE);
    expect((createCall?.[1] as RequestInit).headers).toMatchObject({
      Authorization: "Bearer test-token",
    });
  });

  it("handles wallet creation failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ ok: false, status: 404 }).mockResolvedValueOnce({ ok: false, status: 503 }),
    );
    renderAuthenticatedApp(["/wallet"]);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Create Profile" }));
    await fillCitizenForm();
    await user.click(screen.getByRole("button", { name: "Save Wallet" }));
    expect(await screen.findByText(/temporarily unavailable/)).toBeInTheDocument();
  });

  it("loads existing values when editing", async () => {
    vi.stubGlobal("fetch", mockWalletFetch());
    renderAuthenticatedApp(["/wallet"]);
    expect(await screen.findByText(WALLET.citizen_id)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Edit Profile" }));
    expect(screen.getByLabelText("Age")).toHaveValue(20);
    expect(screen.getByLabelText("Gender")).toHaveValue("female");
  });

  it("updates a wallet", async () => {
    const fetchMock = mockWalletFetch({
      onRequest: (_url, init) => {
        if ((init?.method ?? "GET") === "PUT") {
          return jsonOk({ ...WALLET, age: 21 });
        }
        return undefined;
      },
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/wallet"]);
    expect(await screen.findByText(WALLET.citizen_id)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Edit Profile" }));
    await user.clear(screen.getByLabelText("Age"));
    await user.type(screen.getByLabelText("Age"), "21");
    await user.click(screen.getByRole("button", { name: "Save Wallet" }));
    expect(await screen.findByText("Your data wallet has been updated.")).toBeInTheDocument();
    const putCall = fetchMock.mock.calls.find((call) => (call[1] as RequestInit | undefined)?.method === "PUT");
    expect(putCall?.[0]).toContain(`/api/v1/wallets/${WALLET.citizen_id}`);
  });

  it("asks for delete confirmation and deletes the wallet", async () => {
    const fetchMock = mockWalletFetch({
      onRequest: (_url, init) => {
        if ((init?.method ?? "GET") === "DELETE") {
          return { ok: true };
        }
        return undefined;
      },
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/wallet"]);
    expect(await screen.findByText(WALLET.citizen_id)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Delete Wallet" }));
    expect(screen.getByText("Are you sure you want to delete your data wallet?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Yes, delete wallet" }));
    expect(
      await screen.findByRole("heading", {
        name: "Welcome 👋",
      }),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((call) => (call[1] as RequestInit | undefined)?.method === "DELETE")).toBe(true);
  });

  it("finds eligible schemes from the saved wallet only", async () => {
    const fetchMock = mockWalletFetch({
      onRequest: (url, init) => {
        if (url.includes("/recommend") && (init?.method ?? "GET") === "POST") {
          return jsonOk(recommendResponse([SAMPLE_SCHEME]));
        }
        return undefined;
      },
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/wallet"]);
    expect(await screen.findByText(WALLET.citizen_id)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Find Eligible Schemes" }));
    expect(await screen.findByText("Your Results")).toBeInTheDocument();
    const recommendCall = fetchMock.mock.calls.find((call) => String(call[0]).includes("/recommend")) as
      | [string, RequestInit]
      | undefined;
    expect(recommendCall?.[0]).toContain(`/api/v1/wallets/${WALLET.citizen_id}/recommend`);
    expect(recommendCall?.[1].method).toBe("POST");
    expect(recommendCall?.[1].body).toBeUndefined();
  });

  it("handles a missing owned wallet as an empty state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    renderAuthenticatedApp(["/wallet"]);
    expect(await screen.findByText(/Your socio-economic wallet has not been created yet/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Profile" })).toBeInTheDocument();
  });

  it("handles a database or API error", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockRejectedValueOnce(new TypeError("Failed to fetch")),
    );
    renderAuthenticatedApp(["/wallet"]);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Create Profile" }));
    await fillCitizenForm();
    await user.click(screen.getByRole("button", { name: "Save Wallet" }));
    expect(await screen.findByText(/Unable to connect to SchemeWise AI/)).toBeInTheDocument();
  });

  it("clears the session and returns to login after HTTP 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    renderAuthenticatedApp(["/wallet"]);
    expect(await screen.findByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
  });

  it("shows a complete profile completeness card", async () => {
    vi.stubGlobal("fetch", mockWalletFetch());
    renderAuthenticatedApp(["/wallet"]);
    expect(await screen.findByText("Your profile is 100% complete")).toBeInTheDocument();
    expect(screen.getByText("11 of 11 fields completed")).toBeInTheDocument();
    expect(screen.getByText("Your profile is complete.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Complete Profile" })).not.toBeInTheDocument();
  });

  it("shows missing fields and opens the existing edit form", async () => {
    vi.stubGlobal("fetch", mockWalletFetch({ completeness: INCOMPLETE_PROFILE }));
    renderAuthenticatedApp(["/wallet"]);
    expect(await screen.findByText("Your profile is 82% complete")).toBeInTheDocument();
    expect(screen.getByText("9 of 11 fields completed")).toBeInTheDocument();
    const completenessCard = screen.getByLabelText("Profile completeness").closest("section");
    expect(completenessCard).not.toBeNull();
    expect(within(completenessCard as HTMLElement).getByText("Missing information")).toBeInTheDocument();
    expect(within(completenessCard as HTMLElement).getByText("Occupation")).toBeInTheDocument();
    expect(within(completenessCard as HTMLElement).getByText("Wet land")).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Complete Profile" }));
    expect(screen.getByLabelText("Age")).toHaveValue(20);
    expect(screen.getByRole("button", { name: "Save Wallet" })).toBeInTheDocument();
  });
});
