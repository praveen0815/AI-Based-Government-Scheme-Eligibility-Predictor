import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp, renderAuthenticatedApp, TEST_USER } from "./renderApp";

const PASSWORD_USER = {
  ...TEST_USER,
  has_password: true,
  has_google: false,
  created_at: "2026-08-01T10:00:00+00:00",
};

const GOOGLE_USER = {
  ...TEST_USER,
  full_name: "Google User",
  email: "google.user@example.com",
  has_password: false,
  has_google: true,
  created_at: "2026-08-01T10:00:00+00:00",
};

function jsonOk(body: unknown) {
  return { ok: true as const, json: async () => body };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("account settings", () => {
  it("redirects unauthenticated visitors to login", () => {
    renderApp(["/account"]);
    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
  });

  it("shows password account settings without exposing secrets", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonOk(PASSWORD_USER));
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/account"]);
    expect(await screen.findByRole("heading", { name: "Account Settings" })).toBeInTheDocument();
    expect(screen.getByDisplayValue(PASSWORD_USER.full_name)).toBeInTheDocument();
    expect(screen.getAllByText(PASSWORD_USER.email).length).toBeGreaterThan(0);
    expect(screen.getByText("Email and password")).toBeInTheDocument();
    expect(screen.getByLabelText("Current password")).toBeInTheDocument();
    expect(screen.queryByText("password_hash")).not.toBeInTheDocument();
    expect(screen.queryByText("google_sub")).not.toBeInTheDocument();
    expect(screen.queryByText("google-access-token")).not.toBeInTheDocument();
  });

  it("hides password change for Google-only accounts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk(GOOGLE_USER)));
    renderAuthenticatedApp(["/account"]);
    expect(await screen.findByRole("heading", { name: "Account Settings" })).toBeInTheDocument();
    expect(screen.getAllByText("Signed in with Google").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Change password" })).not.toBeInTheDocument();
  });

  it("updates the display name through the existing /me endpoint", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if ((init?.method ?? "GET") === "PATCH") {
        expect(JSON.parse(String(init?.body))).toEqual({ full_name: "Updated User" });
        return Promise.resolve(jsonOk({ ...PASSWORD_USER, full_name: "Updated User" }));
      }
      return Promise.resolve(jsonOk(PASSWORD_USER));
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/account"]);
    expect(await screen.findByDisplayValue(PASSWORD_USER.full_name)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText("Full name"));
    await user.type(screen.getByLabelText("Full name"), "Updated User");
    await user.click(screen.getByRole("button", { name: "Save name" }));
    expect(await screen.findByText("Your display name was updated.")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/api/v1/auth/me") && (call[1] as RequestInit | undefined)?.method === "PATCH")).toBe(true);
  });

  it("deletes the account after confirmation and returns home", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if ((init?.method ?? "GET") === "DELETE") {
        return Promise.resolve({ ok: true, status: 204 });
      }
      return Promise.resolve(jsonOk(PASSWORD_USER));
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/account"]);
    expect(await screen.findByRole("button", { name: "Delete Account" })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Delete Account" }));
    expect(screen.getByText("Delete this account and its associated application data?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Yes, delete my account" }));
    expect(await screen.findByRole("heading", { name: "Welcome 👋" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Your account was deleted. You can create a new research prototype account at any time.",
    );
    expect(window.sessionStorage.getItem("prototypeAuthToken")).toBeNull();
  });
});
