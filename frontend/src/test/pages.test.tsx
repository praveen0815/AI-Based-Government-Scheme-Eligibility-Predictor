import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { recommendResponse, SAMPLE_SCHEME, SECOND_SCHEME, VALID_PROFILE } from "./fixtures";
import { fillCitizenForm } from "./formHelpers";
import { renderApp, renderAuthenticatedApp } from "./renderApp";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

async function fillValidForm() {
  return fillCitizenForm();
}

function emptyNotifications() {
  return {
    ok: true as const,
    json: async () => ({ notifications: [], unread_count: 0, unread_reminder_count: 0, disclaimer: "" }),
  };
}

function isNotificationUrl(url: unknown) {
  return String(url).includes("/notifications");
}

function calledRecommend(fetchMock: { mock: { calls: unknown[][] } }) {
  return fetchMock.mock.calls.some((call) => String(call[0]).includes("/recommend"));
}

describe("citizen portal", () => {
  it("loads the home page", () => {
<<<<<<< HEAD
    renderAuthenticatedApp(["/home"]);
=======
    renderApp(["/home"]);
>>>>>>> origin/main
    expect(
      screen.getByRole("heading", { name: "Welcome 👋" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Check Eligibility" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Explore Schemes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How SchemeWise Works" })).toBeInTheDocument();
  });

  it("loads the form page with required fields", () => {
    renderAuthenticatedApp(["/check"]);
    expect(screen.getByLabelText("Age")).toBeInTheDocument();
    expect(screen.getByLabelText("Gender")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check Eligible Schemes →" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^scheme$/i)).not.toBeInTheDocument();
  });

  it("rejects an invalid age before calling the API", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (isNotificationUrl(url)) return Promise.resolve(emptyNotifications());
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/check"]);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Age"), "150");
    await user.selectOptions(screen.getByLabelText("Gender"), "female");
    await user.click(screen.getByRole("button", { name: "Check Eligible Schemes →" }));
    expect(screen.getByText("Age must be between 0 and 120.")).toBeInTheDocument();
    expect(calledRecommend(fetchMock)).toBe(false);
  });

  it("rejects negative land before calling the API", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (isNotificationUrl(url)) return Promise.resolve(emptyNotifications());
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/check"]);
    const user = await fillValidForm();
    await user.clear(screen.getByLabelText("Wet land owned (acres)"));
    await user.type(screen.getByLabelText("Wet land owned (acres)"), "-2");
    await user.click(screen.getByRole("button", { name: "Check Eligible Schemes →" }));
    expect(screen.getByText("Land area cannot be negative.")).toBeInTheDocument();
    expect(calledRecommend(fetchMock)).toBe(false);
  });

  it("submits a valid citizen and shows loading then recommendations", async () => {
    let finish!: (value: unknown) => void;
    const pending = new Promise((resolve) => {
      finish = resolve;
    });
    const fetchMock = vi.fn().mockImplementation((url: string) => {
<<<<<<< HEAD
      if (isNotificationUrl(url)) return Promise.resolve(emptyNotifications());
=======
>>>>>>> origin/main
      if (String(url).includes("/recommend")) return pending;
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderAuthenticatedApp(["/check"]);
    const user = await fillValidForm();
    await user.click(screen.getByRole("button", { name: "Check Eligible Schemes →" }));

    expect(screen.getByText("Analyzing Your Profile")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check Eligible Schemes →" })).toBeDisabled();

    finish({
      ok: true,
      json: async () => recommendResponse([SAMPLE_SCHEME]),
    });

    expect(await screen.findByText("Your Results")).toBeInTheDocument();
    expect(screen.getByText("1 scheme may match your profile")).toBeInTheDocument();
    expect(screen.getByText("Predicted eligible")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Official Source/ })).toHaveAttribute(
      "href",
      SAMPLE_SCHEME.official_source_url,
    );
    expect(screen.getByRole("link", { name: /Official Source/ })).toHaveAttribute("target", "_blank");
    expect(screen.getAllByText(/NEEDS VERIFICATION/).length).toBeGreaterThan(0);
    const recommendCall = fetchMock.mock.calls.find((call) => String(call[0]).includes("/recommend"));
    expect(JSON.parse(String((recommendCall as [string, RequestInit])[1].body))).toEqual(
      VALID_PROFILE,
    );
  }, 15000);

  it("renders multiple recommendations", () => {
    renderAuthenticatedApp(["/results"], {
      profile: VALID_PROFILE,
      result: recommendResponse([SAMPLE_SCHEME, SECOND_SCHEME]),
    });
    expect(
      screen.getByText("2 schemes may match your profile"),
    ).toBeInTheDocument();
    expect(screen.getByText(SAMPLE_SCHEME.scheme_name)).toBeInTheDocument();
    expect(screen.getByText(SECOND_SCHEME.scheme_name)).toBeInTheDocument();
  });

  it("renders the zero-recommendation state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (isNotificationUrl(url)) return Promise.resolve(emptyNotifications());
        return Promise.resolve({ ok: false, status: 404 });
      }),
    );
    renderAuthenticatedApp(["/results"], {
      profile: VALID_PROFILE,
      result: recommendResponse([]),
    });
    expect(screen.getByText("No Matching Schemes Found")).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Edit Profile" }));
    expect(await screen.findByRole("heading", { name: "My Socio-Economic Wallet" })).toBeInTheDocument();
  });

  it("returns to the wallet with preserved values from Edit Profile", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (isNotificationUrl(url)) return Promise.resolve(emptyNotifications());
        if (String(url).includes("/completeness")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              percentage: 100,
              completed_fields: 11,
              total_fields: 11,
              incomplete_fields: [],
            }),
          });
        }
        if (String(url).includes("/wallets")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              citizen_id: "11111111-2222-3333-4444-555555555555",
              ...VALID_PROFILE,
              created_at: "2026-08-14T12:00:00+00:00",
              updated_at: "2026-08-14T12:00:00+00:00",
            }),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      }),
    );
    renderAuthenticatedApp(["/results"], {
      profile: VALID_PROFILE,
      result: recommendResponse([SAMPLE_SCHEME]),
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Edit Profile" }));
    expect(await screen.findByRole("heading", { name: "My Socio-Economic Wallet" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edit Profile" }));
    expect(screen.getByLabelText("Age")).toHaveValue(20);
    expect(screen.getByLabelText("Gender")).toHaveValue("female");
  });

  it("redirects /results to the form when there is no recommendation data", () => {
    renderAuthenticatedApp(["/results"]);
    expect(screen.getByLabelText("Age")).toBeInTheDocument();
  });

  it("handles a backend error and allows retry", async () => {
    let recommendAttempts = 0;
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (isNotificationUrl(url)) return Promise.resolve(emptyNotifications());
      if (String(url).includes("/recommend")) {
        recommendAttempts += 1;
        if (recommendAttempts === 1) return Promise.resolve({ ok: false, status: 500 });
        return Promise.resolve({
          ok: true,
          json: async () => recommendResponse([SAMPLE_SCHEME]),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderAuthenticatedApp(["/check"]);
    const user = await fillValidForm();
    await user.click(screen.getByRole("button", { name: "Check Eligible Schemes →" }));
    expect(
      await screen.findByText("Something went wrong while processing your request. Please try again."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Check Eligible Schemes →" }));
    expect(await screen.findByText("Your Results")).toBeInTheDocument();
  });

  it("handles HTTP 422 from the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (isNotificationUrl(url)) return Promise.resolve(emptyNotifications());
        return Promise.resolve({ ok: false, status: 422 });
      }),
    );
    renderAuthenticatedApp(["/check"]);
    const user = await fillValidForm();
    await user.click(screen.getByRole("button", { name: "Check Eligible Schemes →" }));
    expect(await screen.findByText(/Please check the information entered/)).toBeInTheDocument();
  });

  it("keeps the form usable in a narrow layout", () => {
    renderAuthenticatedApp(["/check"]);
    const form = screen.getByRole("button", { name: "Check Eligible Schemes →" }).closest("form");
    expect(form).toBeInTheDocument();
    expect(within(form as HTMLElement).getByLabelText("Age")).toBeVisible();
  });

  it("does not show model internals on citizen pages", () => {
    renderApp(["/"]);
    expect(screen.queryByText(/F1/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ROC-AUC/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/government approved/i)).not.toBeInTheDocument();
  });
});

describe("loading schemes catalog", () => {
  it("shows a catalog error when the backend is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    renderAuthenticatedApp(["/schemes"]);
    expect(await screen.findByText(/Unable to connect to SchemeWise AI/)).toBeInTheDocument();
  });
});
