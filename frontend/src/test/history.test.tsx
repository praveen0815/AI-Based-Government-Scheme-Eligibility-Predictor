import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RecommendationHistoryItem, RecommendationHistoryListResponse } from "../types/api";
import { SAMPLE_SCHEME, VALID_PROFILE } from "./fixtures";
import { renderApp, renderAuthenticatedApp } from "./renderApp";

const HISTORY_ITEM: RecommendationHistoryItem = {
  id: "hist-1",
  checked_at: "2026-08-17T10:15:00+00:00",
  profile_snapshot: VALID_PROFILE,
  recommended_scheme_ids: [SAMPLE_SCHEME.scheme_id],
  recommendation_count: 1,
  recommended_schemes: [
    { scheme_id: SAMPLE_SCHEME.scheme_id, scheme_name: SAMPLE_SCHEME.scheme_name },
  ],
};

const HISTORY_LIST: RecommendationHistoryListResponse = {
  count: 1,
  history: [HISTORY_ITEM],
};

function jsonOk(body: unknown) {
  return { ok: true as const, json: async () => body };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("recommendation history page", () => {
  it("redirects unauthenticated visitors to login", () => {
    renderApp(["/history"]);
    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
  });

  it("shows the empty state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk({ count: 0, history: [] })));
    renderAuthenticatedApp(["/history"]);
    expect(await screen.findByRole("heading", { name: "Recommendation History" })).toBeInTheDocument();
    expect(
      screen.getByText("Review previous scheme checks from your socio-economic profile."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "These are previous AI research prototype results, not official government eligibility decisions.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("No recommendation history yet")).toBeInTheDocument();
    expect(
      screen.getByText("Complete your profile and check eligible schemes to see your previous results here."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to My Wallet" })).toBeInTheDocument();
  });

  it("opens a saved history record from the dashboard deep link", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (String(url).endsWith("/api/v1/history")) {
        return Promise.resolve(jsonOk(HISTORY_LIST));
      }
      if (String(url).includes("/api/v1/history/hist-1")) {
        return Promise.resolve(jsonOk(HISTORY_ITEM));
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/history/hist-1"]);
    expect(await screen.findByText("Saved check details")).toBeInTheDocument();
    expect(screen.getAllByText(SAMPLE_SCHEME.scheme_name).length).toBeGreaterThan(0);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/recommend"))).toBe(false);
  });

  it("lists saved history and loads details without recommending again", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (String(url).endsWith("/api/v1/history")) {
        return Promise.resolve(jsonOk(HISTORY_LIST));
      }
      if (String(url).includes("/api/v1/history/hist-1")) {
        return Promise.resolve(jsonOk(HISTORY_ITEM));
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/history"]);
    expect(await screen.findByText(SAMPLE_SCHEME.scheme_name)).toBeInTheDocument();
    expect(screen.getByText("1 recommended scheme")).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "View Details" }));
    expect(await screen.findByText("Saved check details")).toBeInTheDocument();
    expect(screen.getByText("Government school, Classes 6 to 12")).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some((call) => String(call[0]).includes("/recommend")),
    ).toBe(false);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/api/v1/history/hist-1"))).toBe(
      true,
    );
  });

  it("asks for delete confirmation and deletes one history record", async () => {
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      if ((init?.method ?? "GET") === "DELETE") {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve(jsonOk(HISTORY_LIST));
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/history"]);
    expect(await screen.findByText(SAMPLE_SCHEME.scheme_name)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Delete this recommendation history?")).toBeInTheDocument();
    expect(
      screen.getByText("This only removes the saved research result. Your wallet profile will not be deleted."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Yes, delete history" }));
    expect(await screen.findByText("No recommendation history yet")).toBeInTheDocument();
    const deleteCall = fetchMock.mock.calls.find((call) => (call[1] as RequestInit | undefined)?.method === "DELETE");
    expect(deleteCall?.[0]).toContain("/api/v1/history/hist-1");
  });
});
