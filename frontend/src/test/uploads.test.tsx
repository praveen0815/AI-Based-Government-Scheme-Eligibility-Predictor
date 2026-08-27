import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DocumentProgressResponse, SupportingUpload, SupportingUploadListResponse } from "../types/api";
import { SAMPLE_SCHEME } from "./fixtures";
import { renderApp, renderAuthenticatedApp } from "./renderApp";

const WARNING =
  "Do not upload Aadhaar, PAN, passport, or other sensitive identity documents. This is an academic research prototype.";

const EMPTY_UPLOADS: SupportingUploadListResponse = {
  uploads: [],
  count: 0,
  disclaimer: WARNING,
};

const UPLOADED: SupportingUpload = {
  id: "upload-1",
  category: "education_certificate",
  display_name: "school-certificate.pdf",
  stored_filename: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf",
  content_type: "application/pdf",
  size_bytes: 2048,
  scheme_id: SAMPLE_SCHEME.scheme_id,
  scheme_name: SAMPLE_SCHEME.scheme_name,
  created_at: "2026-08-27T08:00:00+00:00",
  disclaimer: WARNING,
};

const LISTED: SupportingUploadListResponse = {
  uploads: [UPLOADED],
  count: 1,
  disclaimer: WARNING,
};

const DOCUMENTS: DocumentProgressResponse = {
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

function jsonOk(body: unknown) {
  return { ok: true as const, json: async () => body };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("supporting documents page", () => {
  it("redirects unauthenticated visitors to login", () => {
    renderApp(["/uploads"]);
    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
  });

  it("shows the safety warning and empty state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        const path = String(url);
        if (path.includes("/api/v1/uploads")) return Promise.resolve(jsonOk(EMPTY_UPLOADS));
        if (path.includes("/api/v1/documents")) return Promise.resolve(jsonOk({ ...DOCUMENTS, schemes: [] }));
        return Promise.resolve({ ok: false, status: 404 });
      }),
    );
    renderAuthenticatedApp(["/uploads"]);
    expect(await screen.findByRole("heading", { name: "My Documents" })).toBeInTheDocument();
    expect(screen.getByText(WARNING)).toBeInTheDocument();
    expect(screen.getByText("No supporting documents yet")).toBeInTheDocument();
  });

  it("uploads a non-sensitive file and can delete it", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const path = String(url);
      const method = (init?.method ?? "GET").toUpperCase();
      if (path.endsWith("/api/v1/uploads") && method === "POST") {
        return Promise.resolve(jsonOk(UPLOADED));
      }
      if (path.endsWith("/api/v1/uploads") && method === "GET") {
        const uploaded = fetchMock.mock.calls.some(
          (call) => (call[1] as RequestInit | undefined)?.method === "POST",
        );
        return Promise.resolve(jsonOk(uploaded ? LISTED : EMPTY_UPLOADS));
      }
      if (path.includes("/api/v1/documents")) {
        return Promise.resolve(jsonOk(DOCUMENTS));
      }
      if (method === "DELETE") {
        return Promise.resolve({ ok: true, status: 204, json: async () => ({}) });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/uploads"]);

    expect(await screen.findByText(WARNING)).toBeInTheDocument();
    const user = userEvent.setup();
    const file = new File(["%PDF"], "school-certificate.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText("File"), file);
    await user.selectOptions(screen.getByLabelText("Document category"), "education_certificate");
    await user.click(screen.getByRole("button", { name: "Upload document" }));

    expect(await screen.findByText("school-certificate.pdf")).toBeInTheDocument();
    const postCall = fetchMock.mock.calls.find((call) => (call[1] as RequestInit | undefined)?.method === "POST");
    expect(postCall?.[0]).toContain("/api/v1/uploads");
    expect((postCall?.[1] as RequestInit).body).toBeInstanceOf(FormData);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    const deleteCall = fetchMock.mock.calls.find((call) => (call[1] as RequestInit | undefined)?.method === "DELETE");
    expect(deleteCall?.[0]).toContain("/api/v1/uploads/upload-1");
  });
});
