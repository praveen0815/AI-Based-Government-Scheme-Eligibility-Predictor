import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { en } from "../i18n/en";
import type { CitizenWallet, DocumentScan, SupportingUpload, SupportingUploadListResponse } from "../types/api";
import { VALID_PROFILE } from "./fixtures";
import { renderApp, renderAuthenticatedApp } from "./renderApp";

const WARNING =
  "Do not upload Aadhaar, PAN, passport, or other sensitive identity documents. This is an academic research prototype.";

const WALLET: CitizenWallet = {
  citizen_id: "wallet-1",
  ...VALID_PROFILE,
  created_at: "2026-08-27T08:00:00+00:00",
  updated_at: "2026-08-27T08:00:00+00:00",
};

const UPLOADED: SupportingUpload = {
  id: "upload-1",
  category: "education_certificate",
  display_name: "school-certificate.pdf",
  stored_filename: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf",
  content_type: "application/pdf",
  size_bytes: 2048,
  scheme_id: null,
  scheme_name: null,
  review_status: "pending",
  created_at: "2026-08-27T08:00:00+00:00",
  disclaimer: WARNING,
};

const EMPTY_UPLOADS: SupportingUploadListResponse = {
  uploads: [],
  count: 0,
  disclaimer: WARNING,
};

const LISTED: SupportingUploadListResponse = {
  uploads: [UPLOADED],
  count: 1,
  disclaimer: WARNING,
};

const PENDING_SCAN: DocumentScan = {
  id: "scan-1",
  upload_id: "upload-1",
  document_type: "education_certificate",
  status: "pending_review",
  review_status: "pending",
  fields: [
    { name: "age", value: 19, clarity: "extracted", current_wallet_value: 20 },
    { name: "is_student", value: true, clarity: "extracted", current_wallet_value: true },
    { name: "first_higher_education_course", value: null, clarity: "missing", current_wallet_value: true },
    {
      name: "school_background",
      value: "other",
      clarity: "unclear",
      current_wallet_value: "government_6_to_12",
    },
  ],
  applied_fields: [],
  wallet: null,
  disclaimer: "OCR extraction is a research-prototype helper only.",
  created_at: "2026-09-28T08:00:00+00:00",
};

function jsonOk(body: unknown) {
  return { ok: true as const, json: async () => body };
}

function jsonError(status: number) {
  return { ok: false as const, status, json: async () => ({ detail: "error" }) };
}

function mockPortalFetch(handler: (url: string, method: string, body?: string) => Promise<unknown> | unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const path = String(url);
      const method = String(init?.method || "GET").toUpperCase();
      return Promise.resolve(handler(path, method, typeof init?.body === "string" ? init.body : undefined));
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("AI document scanner page", () => {
  it("redirects unauthenticated visitors to login", () => {
    renderApp(["/document-scanner"]);
    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
  });

  it("shows the review form after a successful scan and keeps the wallet unchanged until confirm", async () => {
    const user = userEvent.setup();
    mockPortalFetch((path, method) => {
      if (path.includes("/api/v1/uploads") && method === "GET") return jsonOk(EMPTY_UPLOADS);
      if (path.includes("/api/v1/wallets/me") && method === "GET") return jsonOk(WALLET);
      if (path.endsWith("/api/v1/uploads") && method === "POST") return jsonOk(UPLOADED);
      if (path.endsWith("/api/v1/document-scans") && method === "POST") return jsonOk(PENDING_SCAN);
      return jsonError(404);
    });

    renderAuthenticatedApp(["/document-scanner"]);
    expect(await screen.findByRole("heading", { name: en.scannerTitle })).toBeInTheDocument();
    expect(screen.getByText(en.scannerWarning)).toBeInTheDocument();

    const file = new File(["%PDF-1.4"], "school-certificate.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText(en.scannerFile), file);
    await user.click(screen.getByRole("button", { name: en.scannerSubmit }));

    expect(await screen.findByRole("heading", { name: en.scannerReviewTitle })).toBeInTheDocument();
    expect(screen.getAllByText(en.scannerExtracted).length).toBeGreaterThan(0);
    expect(screen.getAllByText(en.scannerUnclear).length).toBeGreaterThan(0);
    expect(screen.getAllByText(en.scannerMissing).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: en.scannerConfirm })).toBeInTheDocument();

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock.mock.calls.some(([url, init]) => String(url).includes("/api/v1/uploads") && String(init?.method) === "POST")).toBe(true);
    expect(fetchMock.mock.calls.some(([url, init]) => String(url).includes("/api/v1/document-scans") && String(init?.method) === "POST")).toBe(true);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/confirm"))).toBe(false);
  });

  it("confirms only selected fields", async () => {
    const user = userEvent.setup();
    mockPortalFetch((path, method, body) => {
      if (path.includes("/api/v1/uploads") && method === "GET") return jsonOk(LISTED);
      if (path.includes("/api/v1/wallets/me") && method === "GET") return jsonOk(WALLET);
      if (path.endsWith("/api/v1/document-scans") && method === "POST") return jsonOk(PENDING_SCAN);
      if (path.endsWith("/confirm") && method === "POST") {
        const payload = JSON.parse(body || "{}") as { fields: Record<string, unknown> };
        expect(payload.fields).toEqual({ is_student: true });
        return jsonOk({
          ...PENDING_SCAN,
          status: "confirmed",
          applied_fields: ["is_student"],
          wallet: WALLET,
        });
      }
      return jsonError(404);
    });

    renderAuthenticatedApp(["/document-scanner"]);
    await screen.findByRole("heading", { name: en.scannerTitle });
    await user.selectOptions(screen.getByLabelText(en.scannerExisting), "upload-1");
    await user.click(screen.getByRole("button", { name: en.scannerSubmit }));
    expect(await screen.findByRole("heading", { name: en.scannerReviewTitle })).toBeInTheDocument();

    const studentRow = screen.getByText(en.fieldStudent).closest("li");
    expect(studentRow).not.toBeNull();
    await user.click(within(studentRow as HTMLElement).getByRole("checkbox", { name: en.scannerApplyField }));
    await user.click(screen.getByRole("button", { name: en.scannerConfirm }));
    expect(await screen.findByText(en.scannerSuccess)).toBeInTheDocument();
  });

  it("cancels a pending scan without calling confirm", async () => {
    const user = userEvent.setup();
    mockPortalFetch((path, method) => {
      if (path.includes("/api/v1/uploads") && method === "GET") return jsonOk(LISTED);
      if (path.includes("/api/v1/wallets/me") && method === "GET") return jsonOk(WALLET);
      if (path.endsWith("/api/v1/document-scans") && method === "POST") return jsonOk(PENDING_SCAN);
      if (path.endsWith("/cancel") && method === "POST") {
        return jsonOk({ ...PENDING_SCAN, status: "cancelled" });
      }
      return jsonError(404);
    });

    renderAuthenticatedApp(["/document-scanner"]);
    await screen.findByRole("heading", { name: en.scannerTitle });
    await user.selectOptions(screen.getByLabelText(en.scannerExisting), "upload-1");
    await user.click(screen.getByRole("button", { name: en.scannerSubmit }));
    await screen.findByRole("heading", { name: en.scannerReviewTitle });
    await user.click(screen.getByRole("button", { name: en.scannerCancel }));
    expect(await screen.findByText(en.scannerCancelled)).toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes("/confirm"))).toBe(false);
  });

  it("shows a wallet reminder when no wallet exists", async () => {
    mockPortalFetch((path) => {
      if (path.includes("/api/v1/uploads")) return jsonOk(EMPTY_UPLOADS);
      if (path.includes("/api/v1/wallets/me")) return jsonError(404);
      return jsonError(404);
    });
    renderAuthenticatedApp(["/document-scanner"]);
    expect(await screen.findByText(en.scannerNoWallet)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: en.scannerWalletLink })).toHaveAttribute("href", "/wallet");
  });
});
