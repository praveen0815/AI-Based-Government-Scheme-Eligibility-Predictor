import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { en } from "../i18n/en";
import { renderApp, renderAuthenticatedApp, TEST_USER } from "./renderApp";

const ADMIN_USER = {
  ...TEST_USER,
  email: "admin@example.com",
  is_admin: true,
};

function jsonOk(body: unknown) {
  return Promise.resolve({ ok: true as const, json: async () => body });
}

function widgetFetch() {
  return vi.fn().mockImplementation((url: string) => {
    const path = String(url);
    if (path.includes("/api/v1/voice/status")) {
      return jsonOk({
        stt_provider: "browser",
        tts_provider: "browser_neural",
        cloud_stt_available: false,
        https_required: false,
        audio_retained: false,
        disclaimer: "Voice is a research prototype.",
      });
    }
    if (path.includes("/api/v1/auth/me")) {
      return jsonOk(TEST_USER);
    }
    if (path.includes("/api/v1/notifications")) {
      return jsonOk({ notifications: [], unread_count: 0, disclaimer: "" });
    }
    if (path.includes("/api/v1/wallets")) {
      return Promise.resolve({ ok: false, status: 404 });
    }
    if (path.includes("/api/v1/history")) {
      return jsonOk({ count: 0, history: [] });
    }
    if (path.includes("/api/v1/documents")) {
      return jsonOk({
        schemes: [],
        schemes_with_progress: 0,
        overall_ready_count: 0,
        overall_item_count: 0,
        overall_progress_percent: 0,
        disclaimer: "",
      });
    }
    if (path.includes("/api/v1/readiness")) {
      return jsonOk({ schemes: [], schemes_being_prepared: 0, overall_progress_percent: 0, disclaimer: "" });
    }
    if (path.includes("/api/v1/applications")) {
      return jsonOk({ applications: [], count: 0, disclaimer: "" });
    }
    if (path.includes("/api/v1/uploads")) {
      return jsonOk({ uploads: [], count: 0, disclaimer: "" });
    }
    if (path.includes("/api/v1/catalog")) {
      return jsonOk({
        scheme_count: 0,
        total_catalog_count: 0,
        schemes: [],
        filters: { ml_scopes: [], departments: [], genders: [], student_statuses: [], categories: [] },
        disclaimer: "",
      });
    }
    if (path.includes("/api/v1/scheme-knowledge")) {
      return jsonOk({ scheme_count: 0, total_catalog_count: 0, schemes: [], departments: [], categories: [], disclaimer: "" });
    }
    if (path.includes("/api/v1/admin/overview")) {
      return jsonOk({
        total_users: 1,
        active_users: 1,
        total_document_uploads: 0,
        pending_document_reviews: 0,
        verified_documents: 0,
        rejected_documents: 0,
        eligible_scheme_results: 0,
        not_eligible_scheme_results: 0,
        cannot_fully_evaluate_users: 0,
        recent_activity: [],
        disclaimer: "Administrator monitoring for this academic research prototype.",
      });
    }
    return Promise.resolve({ ok: false, status: 404 });
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("unified voice assistant widget", () => {
  it("shows one citizen launcher and opens the shared conversation panel", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", widgetFetch());
    renderAuthenticatedApp(["/dashboard"]);
    expect(await screen.findByRole("heading", { name: "Welcome back, Test User" })).toBeInTheDocument();
    expect(document.querySelectorAll(".assistant-dock")).toHaveLength(1);
    expect(document.querySelector(".assistant-dock-citizen")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: en.assistantWidgetOpen }));
    expect(await screen.findByRole("dialog", { name: en.assistantWidgetTitle })).toBeInTheDocument();
    expect(screen.getByText(en.assistantWidgetNoteCitizen)).toBeInTheDocument();
    expect(screen.getByLabelText(en.voiceTextInputLabel)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: en.voiceStartSpeaking })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: en.assistantWidgetFullPage })).toHaveAttribute("href", "/voice-assistant");
    expect(document.querySelectorAll(".assistant-dock")).toHaveLength(1);
  });

  it("lets the dashboard rail reuse the same widget instead of adding another instance", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", widgetFetch());
    renderAuthenticatedApp(["/dashboard"]);
    await screen.findByRole("heading", { name: "Welcome back, Test User" });
    await user.click(document.querySelector(".dash-voice-btn") as HTMLButtonElement);
    expect(await screen.findByRole("dialog", { name: en.assistantWidgetTitle })).toBeInTheDocument();
    expect(document.querySelectorAll(".assistant-dock")).toHaveLength(1);
    expect(document.querySelectorAll(".assistant-launcher")).toHaveLength(1);
  });

  it("closes the panel and keeps a single dock after in-portal navigation", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", widgetFetch());
    renderAuthenticatedApp(["/dashboard"]);
    await screen.findByRole("heading", { name: "Welcome back, Test User" });
    await user.click(screen.getByRole("button", { name: en.assistantWidgetOpen }));
    expect(await screen.findByRole("dialog", { name: en.assistantWidgetTitle })).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: en.assistantWidgetClose })[0]);
    expect(screen.queryByRole("dialog", { name: en.assistantWidgetTitle })).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("link", { name: en.navSchemes })[0]);
    expect(await screen.findByRole("heading", { name: en.schemesTitle })).toBeInTheDocument();
    expect(document.querySelectorAll(".assistant-dock")).toHaveLength(1);
    expect(screen.getByRole("button", { name: en.assistantWidgetOpen })).toBeInTheDocument();
  });

  it("accepts a typed fallback question from the widget", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", widgetFetch());
    renderAuthenticatedApp(["/dashboard"]);
    await screen.findByRole("heading", { name: "Welcome back, Test User" });
    await user.click(screen.getByRole("button", { name: en.assistantWidgetOpen }));
    const input = await screen.findByLabelText(en.voiceTextInputLabel);
    await user.type(input, "Who are you?");
    await user.click(screen.getByRole("button", { name: en.voiceSend }));
    expect((await screen.findAllByText(/I'm Nira, a research voice assistant/i)).length).toBeGreaterThan(0);
  });

  it("hides the floating widget on the full Voice Assistant page", async () => {
    vi.stubGlobal("fetch", widgetFetch());
    renderAuthenticatedApp(["/voice-assistant"]);
    expect(await screen.findByRole("heading", { name: "Nira" })).toBeInTheDocument();
    expect(document.querySelector(".assistant-dock")).toBeNull();
    expect(screen.queryByRole("button", { name: en.assistantWidgetOpen })).not.toBeInTheDocument();
  });

  it("shows one admin launcher with admin guidance and no second dock", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", widgetFetch());
    renderApp(["/admin"], { user: ADMIN_USER, token: "admin-token" });
    expect(await screen.findByRole("heading", { name: en.adminTitle })).toBeInTheDocument();
    expect(document.querySelectorAll(".assistant-dock")).toHaveLength(1);
    expect(document.querySelector(".assistant-dock-admin")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: en.assistantWidgetOpen }));
    expect(await screen.findByRole("dialog", { name: en.assistantWidgetTitle })).toBeInTheDocument();
    expect(screen.getByText(en.assistantWidgetNoteAdmin)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: en.assistantWidgetFullPage })).toHaveAttribute(
      "href",
      "/admin/voice-assistant",
    );
  });
});
