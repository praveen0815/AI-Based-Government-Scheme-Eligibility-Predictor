import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp, renderAuthenticatedApp, TEST_USER } from "./renderApp";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("authentication pages", () => {
  it("loads the register page", () => {
    renderApp(["/register"]);
    expect(screen.getByRole("heading", { name: "Create Your SchemeWise Profile" })).toBeInTheDocument();
    expect(screen.getByLabelText("Full name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
  });

  it("validates register fields before calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderApp(["/register"]);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Create Account" }));
    expect(screen.getByText("Full name is required.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires matching passwords of at least 8 characters", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderApp(["/register"]);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Full name"), "Praveen Kumar");
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.type(screen.getByLabelText("Confirm password"), "different");
    await user.click(screen.getByRole("button", { name: "Create Account" }));
    expect(screen.getByText("Password must be at least 8 characters.")).toBeInTheDocument();
    expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("registers and redirects to login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => TEST_USER,
      }),
    );
    renderApp(["/register"]);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Full name"), "Praveen Kumar");
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create Account" }));
    expect(await screen.findByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
    expect(screen.getByText("Account created. Please sign in.")).toBeInTheDocument();
  });

  it("does not treat a register outage as an eligibility outage", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    renderApp(["/register"]);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Full name"), "KamalNath V");
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create Account" }));
    expect(await screen.findByText("We could not create the account.")).toBeInTheDocument();
    expect(
      screen.queryByText("The eligibility service is temporarily unavailable. Please try again in a moment."),
    ).not.toBeInTheDocument();
  });

  it("loads the login page", () => {
    renderApp(["/login"]);
    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create an account" })).toBeInTheDocument();
  });

  it("signs in with Google and opens the dashboard", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const path = String(url);
      if (path.includes("/api/v1/auth/google")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            access_token: "google-access-token",
            token_type: "bearer",
            expires_in: 3600,
            user: TEST_USER,
          }),
        });
      }
      if (path.includes("/api/v1/auth/me")) {
        return Promise.resolve({ ok: true, json: async () => TEST_USER });
      }
      if (path.includes("/api/v1/history")) {
        return Promise.resolve({ ok: true, json: async () => ({ count: 0, history: [] }) });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderApp(["/login"]);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(await screen.findByRole("heading", { name: "Welcome back, Test User" })).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/v1/auth/google");
    expect(JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))).toEqual({
      credential: "test-google-credential",
    });
    expect(window.sessionStorage.getItem("prototypeAuthToken")).toBe("google-access-token");
    expect(window.sessionStorage.getItem("google-id-token")).toBeNull();
    expect(window.localStorage.getItem("google-id-token")).toBeNull();
  });

  it("shows a Google authentication error instead of the eligibility outage message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    renderApp(["/login"]);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(await screen.findByText("Google sign-in failed. Please try again.")).toBeInTheDocument();
    expect(
      screen.queryByText("The eligibility service is temporarily unavailable. Please try again in a moment."),
    ).not.toBeInTheDocument();
  });

  it("shows a failed login message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    renderApp(["/login"]);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "wrongpass");
    await user.click(screen.getByRole("button", { name: "Sign In" }));
    expect(await screen.findByText("Invalid email or password.")).toBeInTheDocument();
  });

  it("logs in and opens the dashboard", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const path = String(url);
      if (path.includes("/api/v1/auth/login")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            access_token: "access-token",
            token_type: "bearer",
            expires_in: 3600,
            user: TEST_USER,
          }),
        });
      }
      if (path.includes("/api/v1/auth/me")) {
        return Promise.resolve({ ok: true, json: async () => TEST_USER });
      }
      if (path.includes("/api/v1/history")) {
        return Promise.resolve({ ok: true, json: async () => ({ count: 0, history: [] }) });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderApp(["/login"]);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));
    expect(await screen.findByRole("heading", { name: "Welcome back, Test User" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My Wallet" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "History" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Documents" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Insights" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Application Readiness" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My Documents" })).toBeInTheDocument();
    expect(screen.getAllByText(TEST_USER.full_name).length).toBeGreaterThan(0);
  });

  it("sends an already signed-in visitor from login to the dashboard", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    renderAuthenticatedApp(["/login"]);
    expect(await screen.findByRole("heading", { name: "Welcome back, Test User" })).toBeInTheDocument();
  });

  it("opens the login page for an unauthenticated visitor at the application root", () => {
    renderApp(["/"]);
    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Register" })).toBeInTheDocument();
  });

  it("sends an already signed-in visitor from the application root to the dashboard", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    renderAuthenticatedApp(["/"]);
    expect(await screen.findByRole("heading", { name: "Welcome back, Test User" })).toBeInTheDocument();
  });

  it("sends an already signed-in visitor from register to the dashboard", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    renderAuthenticatedApp(["/register"]);
    expect(await screen.findByRole("heading", { name: "Welcome back, Test User" })).toBeInTheDocument();
  });

  it("shows authenticated navigation and logs out to login", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    renderAuthenticatedApp(["/dashboard"]);
    expect(await screen.findByRole("heading", { name: "Welcome back, Test User" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Dashboard$/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^My Wallet$/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^History$/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Documents$/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Insights$/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Application Readiness$/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^My Documents$/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Account$/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Settings$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Logout" })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Logout" }));
    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Register" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Dashboard$/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^My Wallet$/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^History$/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Documents$/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Insights$/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Application Readiness$/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^My Documents$/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Account$/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Settings$/ })).toBeInTheDocument();
  });

  it("shows unauthenticated navigation", () => {
    renderApp(["/login"]);
    expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Register" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Dashboard$/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^My Wallet$/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^History$/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Documents$/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Insights$/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Application Readiness$/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^My Documents$/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Account$/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Settings$/ })).toBeInTheDocument();
  });
});
