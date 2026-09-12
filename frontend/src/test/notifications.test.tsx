import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NotificationItem, NotificationListResponse } from "../types/api";
import { renderApp, renderAuthenticatedApp } from "./renderApp";

const PROFILE_REMINDER: NotificationItem = {
  notification_id: "note-profile",
  type: "profile_incomplete",
  title: "Complete your profile",
  message: "A socio-economic wallet is needed before this research prototype can prepare personalized reminders.",
  related_feature: "wallet",
  related_id: null,
  href: "/wallet",
  is_read: false,
  created_at: "2026-08-31T10:00:00+00:00",
  count: null,
};

const DOCUMENT_REMINDER: NotificationItem = {
  notification_id: "note-docs",
  type: "document_attention",
  title: "Document preparation needs attention",
  message: "1 recommended scheme still has document checklist items to review. This is not a government deadline.",
  related_feature: "documents",
  related_id: "scheme-1",
  href: "/documents?scheme=scheme-1",
  is_read: true,
  created_at: "2026-08-30T09:00:00+00:00",
  count: 1,
};

const EMPTY_LIST: NotificationListResponse = {
  notifications: [],
  unread_count: 0,
  disclaimer: "These reminders are generated from your research-prototype activity only.",
};

const LISTED: NotificationListResponse = {
  notifications: [PROFILE_REMINDER, DOCUMENT_REMINDER],
  unread_count: 1,
  disclaimer: "These reminders are generated from your research-prototype activity only.",
};

function jsonOk(body: unknown) {
  return { ok: true as const, json: async () => body };
}

function mockNotificationsFetch(list: NotificationListResponse | number = LISTED) {
  return vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    const path = String(url);
    const method = String(init?.method ?? "GET").toUpperCase();
    if (path.includes("/api/v1/notifications") && path.includes("/read") && method === "PATCH") {
      return Promise.resolve(jsonOk({ ...PROFILE_REMINDER, is_read: true }));
    }
    if (path.includes("/api/v1/notifications/") && method === "DELETE") {
      return Promise.resolve({ ok: true, status: 204 });
    }
    if (path.includes("/api/v1/notifications")) {
      if (typeof list === "number") {
        return Promise.resolve({ ok: false, status: list });
      }
      return Promise.resolve(jsonOk(list));
    }
    return Promise.resolve({ ok: false, status: 404 });
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("notifications page", () => {
  it("redirects unauthenticated visitors to login", () => {
    renderApp(["/notifications"]);
    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
  });

  it("shows the empty state when there are no reminders", async () => {
    vi.stubGlobal("fetch", mockNotificationsFetch(EMPTY_LIST));
    renderAuthenticatedApp(["/notifications"]);
    expect(await screen.findByRole("heading", { name: "Notifications & Reminders" })).toBeInTheDocument();
    expect(screen.getByText("No reminders right now")).toBeInTheDocument();
    expect(
      screen.getByText(
        "When your profile, documents, readiness, or eligibility checks need attention, they will appear here.",
      ),
    ).toBeInTheDocument();
  });

  it("lists reminders with categories, timestamps, and related links", async () => {
    vi.stubGlobal("fetch", mockNotificationsFetch(LISTED));
    renderAuthenticatedApp(["/notifications"]);
    expect(await screen.findByRole("heading", { name: "Complete your profile" })).toBeInTheDocument();
    expect(screen.getByText("1 unread reminder")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getAllByText("Documents").length).toBeGreaterThan(0);
    expect(screen.getByText("Unread")).toBeInTheDocument();
    expect(screen.getByText("Read")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Notifications" })).toHaveAttribute("href", "/notifications");
    expect(screen.getByRole("link", { name: "Notifications, 1 unread reminder" })).toBeInTheDocument();
    const openLinks = screen.getAllByRole("link", { name: "Open related page" });
    expect(openLinks[0]).toHaveAttribute("href", "/wallet");
    expect(openLinks[1]).toHaveAttribute("href", "/documents?scheme=scheme-1");
  });

  it("marks a reminder as read", async () => {
    vi.stubGlobal("fetch", mockNotificationsFetch(LISTED));
    renderAuthenticatedApp(["/notifications"]);
    expect(await screen.findByRole("button", { name: "Mark as read" })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Mark as read" }));
    expect(await screen.findAllByText("Read")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Mark as read" })).not.toBeInTheDocument();
  });

  it("dismisses a reminder", async () => {
    vi.stubGlobal("fetch", mockNotificationsFetch(LISTED));
    renderAuthenticatedApp(["/notifications"]);
    expect(await screen.findByRole("heading", { name: "Complete your profile" })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("button", { name: "Dismiss" })[0]);
    expect(await screen.findByRole("heading", { name: "Document preparation needs attention" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Complete your profile" })).not.toBeInTheDocument();
  });

  it("shows an error when the notifications API is unavailable", async () => {
    vi.stubGlobal("fetch", mockNotificationsFetch(503));
    renderAuthenticatedApp(["/notifications"]);
    expect(
      await screen.findByText("The eligibility service is temporarily unavailable. Please try again in a moment."),
    ).toBeInTheDocument();
  });

  it("renders eligibility and application reminder categories", async () => {
    vi.stubGlobal(
      "fetch",
      mockNotificationsFetch({
        notifications: [
          {
            notification_id: "note-elig",
            type: "eligibility_incomplete",
            title: "Eligibility cannot be fully evaluated",
            message: "3 profile fields are required to fully evaluate some schemes.",
            related_feature: "wallet",
            related_id: null,
            href: "/wallet",
            is_read: false,
            created_at: "2026-09-08T10:00:00+00:00",
            count: 3,
          },
          {
            notification_id: "note-app",
            type: "application_status",
            title: "Review your saved schemes",
            message: "You are tracking 1 scheme in this research prototype.",
            related_feature: "applications",
            related_id: null,
            href: "/applications",
            is_read: true,
            created_at: "2026-09-08T09:00:00+00:00",
            count: 1,
          },
        ],
        unread_count: 1,
        disclaimer: "These reminders are generated from your research-prototype activity only.",
      }),
    );
    renderAuthenticatedApp(["/notifications"]);
    expect(await screen.findByRole("heading", { name: "Eligibility cannot be fully evaluated" })).toBeInTheDocument();
    expect(screen.getAllByText("Eligibility").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Applications" })).toHaveAttribute("href", "/applications");
    expect(screen.getByText("3 profile fields are required to fully evaluate some schemes.")).toBeInTheDocument();
    expect(screen.getByText("You are tracking 1 scheme in this research prototype.")).toBeInTheDocument();
    expect(screen.getByText("Unread")).toBeInTheDocument();
    expect(screen.getByText("Read")).toBeInTheDocument();
  });

  it("shows Tamil copy on the notifications page", async () => {
    vi.stubGlobal("fetch", mockNotificationsFetch(EMPTY_LIST));
    renderApp(["/notifications"], {
      user: { user_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", full_name: "Test User", email: "test@example.com" },
      token: "test-token",
      language: "ta",
    });
    expect(await screen.findByRole("heading", { name: "அறிவிப்புகள் & நினைவூட்டல்கள்" })).toBeInTheDocument();
    expect(screen.getByText("இப்போது நினைவூட்டல்கள் இல்லை")).toBeInTheDocument();
  });
});
