import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DocumentProgressResponse, SchemeDocumentChecklist } from "../types/api";
import { SAMPLE_SCHEME } from "./fixtures";
import { renderApp, renderAuthenticatedApp } from "./renderApp";

const EMPTY_PROGRESS: DocumentProgressResponse = {
  schemes: [],
  schemes_with_progress: 0,
  overall_ready_count: 0,
  overall_item_count: 0,
  overall_progress_percent: 0,
  disclaimer: "Document preparation progress is a research-prototype checklist.",
};

const PROGRESS: DocumentProgressResponse = {
  schemes: [
    {
      scheme_id: SAMPLE_SCHEME.scheme_id,
      scheme_name: SAMPLE_SCHEME.scheme_name,
      official_source_url: SAMPLE_SCHEME.official_source_url,
      documents_need_verification: true,
      ready_count: 0,
      item_count: 1,
      progress_percent: 0,
      has_saved_progress: false,
    },
  ],
  schemes_with_progress: 0,
  overall_ready_count: 0,
  overall_item_count: 1,
  overall_progress_percent: 0,
  disclaimer: "Document preparation progress is a research-prototype checklist.",
};

const CHECKLIST: SchemeDocumentChecklist = {
  scheme_id: SAMPLE_SCHEME.scheme_id,
  scheme_name: SAMPLE_SCHEME.scheme_name,
  official_source_url: SAMPLE_SCHEME.official_source_url,
  documents_need_verification: true,
  required_documents_text: "NEEDS VERIFICATION",
  ready_count: 0,
  item_count: 1,
  progress_percent: 0,
  has_saved_progress: false,
  items: [
    {
      item_key: "official-source-review",
      label: "Confirm the current document list on the official scheme source",
      source: "project_reminder",
      status: "not_started",
      updated_at: null,
    },
  ],
  disclaimer: "Document preparation progress is a research-prototype checklist.",
};

const READY_CHECKLIST: SchemeDocumentChecklist = {
  ...CHECKLIST,
  ready_count: 1,
  progress_percent: 100,
  has_saved_progress: true,
  items: [{ ...CHECKLIST.items[0], status: "ready", updated_at: "2026-08-24T06:00:00+00:00" }],
};

const READY_PROGRESS: DocumentProgressResponse = {
  ...PROGRESS,
  schemes_with_progress: 1,
  overall_ready_count: 1,
  overall_progress_percent: 100,
  schemes: [{ ...PROGRESS.schemes[0], ready_count: 1, progress_percent: 100, has_saved_progress: true }],
};

function jsonOk(body: unknown) {
  return { ok: true as const, json: async () => body };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("document preparation page", () => {
  it("redirects unauthenticated visitors to login", () => {
    renderApp(["/documents"]);
    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
  });

  it("shows the empty state when no schemes were recommended", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk(EMPTY_PROGRESS)));
    renderAuthenticatedApp(["/documents"]);
    expect(await screen.findByRole("heading", { name: "Document Preparation" })).toBeInTheDocument();
    expect(screen.getByText("No recommended schemes yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Check eligibility from your saved wallet first. This page does not create checklists for schemes that were never recommended to you.",
      ),
    ).toBeInTheDocument();
  });

  it("loads a recommended scheme checklist and updates preparation status", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const path = String(url);
      const method = (init?.method ?? "GET").toUpperCase();
      if (path.endsWith("/api/v1/documents")) {
        const alreadyReady = fetchMock.mock.calls.some(
          (call) => (call[1] as RequestInit | undefined)?.method === "PATCH",
        );
        return Promise.resolve(jsonOk(alreadyReady ? READY_PROGRESS : PROGRESS));
      }
      if (method === "PATCH") {
        return Promise.resolve(jsonOk(READY_CHECKLIST));
      }
      if (path.includes(`/api/v1/documents/schemes/${SAMPLE_SCHEME.scheme_id}`)) {
        return Promise.resolve(jsonOk(CHECKLIST));
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/documents"]);

    expect(await screen.findByRole("heading", { name: "Document Preparation" })).toBeInTheDocument();
    expect(await screen.findByText("Document preparation progress")).toBeInTheDocument();
    expect(
      await screen.findByText("Document requirements need verification from the official scheme source."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Visit Official Website" })).toHaveAttribute(
      "href",
      SAMPLE_SCHEME.official_source_url,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Ready" }));
    expect(await screen.findByText("100%")).toBeInTheDocument();
    const patchCall = fetchMock.mock.calls.find((call) => (call[1] as RequestInit | undefined)?.method === "PATCH");
    expect(patchCall?.[0]).toContain(
      `/api/v1/documents/schemes/${SAMPLE_SCHEME.scheme_id}/items/official-source-review`,
    );
    expect(JSON.parse(String((patchCall?.[1] as RequestInit).body))).toEqual({ status: "ready" });
  });
});
