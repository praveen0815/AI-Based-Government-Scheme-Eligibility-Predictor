import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RecommendResponse } from "../types/api";
import { recommendResponse, SAMPLE_SCHEME, VALID_PROFILE } from "./fixtures";
import { renderApp } from "./renderApp";

function disagreeingResult(): RecommendResponse {
  const scheme = {
    ...SAMPLE_SCHEME,
    agreement: false,
    ml_prediction: "not_eligible" as const,
  };
  return recommendResponse([scheme]);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("explainable recommendation view", () => {
  it("keeps result cards clean until Why this result? is opened", async () => {
    renderApp(["/results"], {
      profile: VALID_PROFILE,
      result: recommendResponse([SAMPLE_SCHEME]),
    });
    expect(screen.getByRole("heading", { name: "Your Results" })).toBeInTheDocument();
    expect(screen.getByText("Predicted eligible")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Why this result/ })).toBeInTheDocument();
    expect(screen.queryByText("Documented scheme rules checked")).not.toBeInTheDocument();
    expect(screen.queryByText(/government approved/i)).not.toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Why this result/ }));
    expect(screen.getByText("Documented scheme rules checked")).toBeInTheDocument();
    expect(screen.getAllByText("female").length).toBeGreaterThan(0);
    expect(screen.getByText("What the Decision Tree predicted")).toBeInTheDocument();
    expect(screen.getByText("Things to review")).toBeInTheDocument();
    expect(
      screen.getByText(
        "These items come from incomplete profile fields already stored for this research prototype. They are not instructions to change personal information to become eligible.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Visit Official Website" })).toHaveAttribute(
      "href",
      SAMPLE_SCHEME.official_source_url,
    );
  });

  it("states that the documented rule is the reference when Rule and ML differ", async () => {
    renderApp(["/results"], {
      profile: VALID_PROFILE,
      result: disagreeingResult(),
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Why this result/ }));
    expect(screen.getByText("Rule and ML prediction differ")).toBeInTheDocument();
    expect(screen.getAllByText("Documented rule result is used as the reference.").length).toBeGreaterThan(0);
    expect(screen.queryByText(/guaranteed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/government approved/i)).not.toBeInTheDocument();
  });

  it("lists incomplete profile fields as review items without telling the user to change them", async () => {
    renderApp(["/results"], {
      profile: { ...VALID_PROFILE, occupation_category: "" as never },
      result: recommendResponse([SAMPLE_SCHEME]),
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Why this result/ }));
    expect(screen.getByText("Occupation")).toBeInTheDocument();
    expect(
      screen.getByText(/They are not instructions to change personal information to become eligible/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/government approved/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/guaranteed/i)).not.toBeInTheDocument();
  });
});
