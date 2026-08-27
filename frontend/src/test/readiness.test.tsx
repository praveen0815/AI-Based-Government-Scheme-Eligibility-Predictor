import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReadinessProgressResponse, SchemeReadiness } from "../types/api";
import { SAMPLE_SCHEME } from "./fixtures";
import { renderApp, renderAuthenticatedApp } from "./renderApp";

const DISCLAIMER =
  "Application Readiness is a research-prototype tracker. Completed Preparation does not mean the government application was submitted or approved.";

const EMPTY_PROGRESS: ReadinessProgressResponse = {
  schemes: [],
  schemes_being_prepared: 0,
  overall_progress_percent: 0,
  disclaimer: DISCLAIMER,
};

const SCHEME: SchemeReadiness = {
  scheme_id: SAMPLE_SCHEME.scheme_id,
  scheme_name: SAMPLE_SCHEME.scheme_name,
  official_source_url: SAMPLE_SCHEME.official_source_url,
  stage: "not_started",
  stage_index: 0,
  stage_count: 6,
  progress_percent: 0,
  has_saved_progress: false,
  updated_at: null,
  disclaimer: DISCLAIMER,
};

const PROGRESS: ReadinessProgressResponse = {
  schemes: [SCHEME],
  schemes_being_prepared: 0,
  overall_progress_percent: 0,
  disclaimer: DISCLAIMER,
};

const READY_SCHEME: SchemeReadiness = {
  ...SCHEME,
  stage: "profile_ready",
  stage_index: 1,
  progress_percent: 20,
  has_saved_progress: true,
  updated_at: "2026-08-24T09:00:00+00:00",
};

const READY_PROGRESS: ReadinessProgressResponse = {
  schemes: [READY_SCHEME],
  schemes_being_prepared: 1,
  overall_progress_percent: 20,
  disclaimer: DISCLAIMER,
};

function jsonOk(body: unknown) {
  return { ok: true as const, json: async () => body };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("application readiness page", () => {
  it("redirects unauthenticated visitors to login", () => {
    renderApp(["/readiness"]);
    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
  });

  it("shows the empty state when no schemes were recommended", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk(EMPTY_PROGRESS)));
    renderAuthenticatedApp(["/readiness"]);
    expect(await screen.findByRole("heading", { name: "Application Readiness" })).toBeInTheDocument();
    expect(screen.getByText("No recommended schemes yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Check eligibility from your saved wallet first. Readiness trackers are not created for schemes that were never recommended to you.",
      ),
    ).toBeInTheDocument();
  });

  it("loads a recommended scheme tracker and updates the preparation stage", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const path = String(url);
      const method = (init?.method ?? "GET").toUpperCase();
      if (path.endsWith("/api/v1/readiness")) {
        const alreadyUpdated = fetchMock.mock.calls.some(
          (call) => (call[1] as RequestInit | undefined)?.method === "PATCH",
        );
        return Promise.resolve(jsonOk(alreadyUpdated ? READY_PROGRESS : PROGRESS));
      }
      if (method === "PATCH") {
        return Promise.resolve(jsonOk(READY_SCHEME));
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/readiness"]);

    expect(await screen.findByRole("heading", { name: "Application Readiness" })).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Completed Preparation does not mean the government application was submitted or approved.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Current stage: Not Started · 0%/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Document Preparation" })).toHaveAttribute(
      "href",
      `/documents?scheme=${SAMPLE_SCHEME.scheme_id}`,
    );
    expect(screen.getByRole("link", { name: "Visit Official Website" })).toHaveAttribute(
      "href",
      SAMPLE_SCHEME.official_source_url,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Profile Ready" }));
    expect(await screen.findByText(/Current stage: Profile Ready · 20%/)).toBeInTheDocument();
    const patchCall = fetchMock.mock.calls.find((call) => (call[1] as RequestInit | undefined)?.method === "PATCH");
    expect(patchCall?.[0]).toContain(`/api/v1/readiness/schemes/${SAMPLE_SCHEME.scheme_id}`);
    expect(JSON.parse(String((patchCall?.[1] as RequestInit).body))).toEqual({ stage: "profile_ready" });
  });
});
