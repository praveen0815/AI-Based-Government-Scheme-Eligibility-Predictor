import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthUser, ProfileCompleteness } from "../types/api";
import { renderApp, renderAuthenticatedApp, TEST_USER } from "./renderApp";

const PASSWORD_USER: AuthUser = {
  ...TEST_USER,
  has_password: true,
  has_google: false,
  created_at: "2026-08-01T10:00:00+00:00",
};

const GOOGLE_USER: AuthUser = {
  ...TEST_USER,
  full_name: "Google User",
  email: "google.user@example.com",
  has_password: false,
  has_google: true,
  created_at: "2026-08-01T10:00:00+00:00",
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

function mockAccountFetch(
  user: AuthUser,
  extras?: {
    completeness?: ProfileCompleteness | "missing";
    onPatch?: (init?: RequestInit) => Promise<unknown>;
    onDelete?: () => Promise<unknown>;
  },
) {
  return vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    const path = String(url);
    const method = init?.method ?? "GET";
    if (path.includes("/wallets/me/completeness")) {
      if (!extras?.completeness || extras.completeness === "missing") {
        return Promise.resolve({ ok: false, status: 404 });
      }
      return Promise.resolve(jsonOk(extras.completeness));
    }
    if (path.includes("/notifications")) {
      return Promise.resolve(jsonOk({ notifications: [], unread_count: 0, count: 0 }));
    }
    if (method === "PATCH" && extras?.onPatch) {
      return extras.onPatch(init);
    }
    if (method === "DELETE") {
      return extras?.onDelete
        ? extras.onDelete()
        : Promise.resolve({ ok: true, status: 204 });
    }
    if (path.includes("/auth/me")) {
      return Promise.resolve(jsonOk(user));
    }
    return Promise.resolve({ ok: false, status: 404 });
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("account settings", () => {
  it("redirects unauthenticated visitors to login", () => {
    renderApp(["/settings"]);
    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
  });

  it("shows password account settings without exposing secrets", async () => {
    vi.stubGlobal("fetch", mockAccountFetch(PASSWORD_USER));
    renderAuthenticatedApp(["/settings"]);
    expect(await screen.findByRole("heading", { name: "Account Settings" })).toBeInTheDocument();
    expect(screen.getByDisplayValue(PASSWORD_USER.full_name)).toBeInTheDocument();
    expect(screen.getAllByText(PASSWORD_USER.email).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Email and password").length).toBeGreaterThan(0);
    expect(screen.getByText("The registered email cannot be changed here.")).toBeInTheDocument();
    expect(screen.getByLabelText("Current password")).toBeInTheDocument();
    expect(screen.queryByText("password_hash")).not.toBeInTheDocument();
    expect(screen.queryByText("google_sub")).not.toBeInTheDocument();
    expect(screen.queryByText("google-access-token")).not.toBeInTheDocument();
  });

  it("hides password change for Google-only accounts", async () => {
    vi.stubGlobal("fetch", mockAccountFetch(GOOGLE_USER));
    renderAuthenticatedApp(["/settings"]);
    expect(await screen.findByRole("heading", { name: "Account Settings" })).toBeInTheDocument();
    expect(screen.getAllByText("Signed in with Google").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Password login for this account is managed through Google/),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Change password" })).not.toBeInTheDocument();
  });

  it("updates the display name through the existing /me endpoint", async () => {
    const fetchMock = mockAccountFetch(PASSWORD_USER, {
      onPatch: (init) => {
        expect(JSON.parse(String(init?.body))).toEqual({ full_name: "Updated User" });
        return Promise.resolve(jsonOk({ ...PASSWORD_USER, full_name: "Updated User" }));
      },
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/settings"]);
    expect(await screen.findByDisplayValue(PASSWORD_USER.full_name)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText("Full name"));
    await user.type(screen.getByLabelText("Full name"), "Updated User");
    await user.click(screen.getByRole("button", { name: "Save name" }));
    expect(await screen.findByText("Your display name was updated.")).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        (call) =>
          String(call[0]).includes("/api/v1/auth/me") &&
          (call[1] as RequestInit | undefined)?.method === "PATCH",
      ),
    ).toBe(true);
  });

  it("deletes the account after confirmation and returns to login", async () => {
    vi.stubGlobal("fetch", mockAccountFetch(PASSWORD_USER));
    renderAuthenticatedApp(["/settings"]);
    expect(await screen.findByRole("button", { name: "Delete Account" })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Delete Account" }));
    expect(screen.getByText("Delete this account and its associated application data?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Yes, delete my account" }));
    expect(await screen.findByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Your account was deleted. You can create a new research prototype account at any time.",
    );
    expect(window.sessionStorage.getItem("prototypeAuthToken")).toBeNull();
  });

  it("opens settings with wallet links and existing completeness", async () => {
    vi.stubGlobal(
      "fetch",
      mockAccountFetch(PASSWORD_USER, { completeness: INCOMPLETE_PROFILE }),
    );
    renderAuthenticatedApp(["/settings"]);
    expect(await screen.findByRole("heading", { name: "Account Settings" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Socio-economic profile" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to My Wallet" })).toHaveAttribute("href", "/wallet");
    expect(screen.getByRole("link", { name: "Edit Profile" })).toHaveAttribute("href", "/wallet");
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Account$/ })).not.toBeInTheDocument();
    expect(screen.getByText("Your profile is 82% complete")).toBeInTheDocument();
    expect(screen.queryByText("A socio-economic wallet has not been created yet.")).not.toBeInTheDocument();
  });

  it("does not keep a duplicate /account settings page", () => {
    renderAuthenticatedApp(["/account"]);
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Account Settings" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Account$/ })).not.toBeInTheDocument();
  });

  it("does not invent a second profile when completeness is unavailable", async () => {
    vi.stubGlobal("fetch", mockAccountFetch(PASSWORD_USER, { completeness: "missing" }));
    renderAuthenticatedApp(["/settings"]);
    expect(await screen.findByRole("heading", { name: "Socio-economic profile" })).toBeInTheDocument();
    expect(screen.getByText("A socio-economic wallet has not been created yet.")).toBeInTheDocument();
    expect(screen.queryByText(/Your profile is \d+% complete/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to My Wallet" })).toBeInTheDocument();
  });
});
