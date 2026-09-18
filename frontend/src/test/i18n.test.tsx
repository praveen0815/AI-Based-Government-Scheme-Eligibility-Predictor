import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LANGUAGE_STORAGE_KEY } from "../i18n";
import { renderApp } from "./renderApp";

describe("English / Tamil language switcher", () => {
  it("defaults to English and keeps the existing home copy", () => {
<<<<<<< HEAD
    renderApp(["/login"]);
=======
    renderApp(["/home"]);
>>>>>>> origin/main
    expect(
      screen.getByRole("heading", { name: "Welcome Back" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /English/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "தமிழ்" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("group", { name: "Language" }).length).toBeGreaterThan(0);
  });

  it("switches the visible UI to Tamil without changing page structure", async () => {
<<<<<<< HEAD
    renderApp(["/login"]);
=======
    renderApp(["/home"]);
>>>>>>> origin/main
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("button", { name: "தமிழ்" })[0]);
    expect(
      screen.getByRole("heading", { name: "மீண்டும் வருக" }),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("ta");
    expect(document.documentElement.lang).toBe("ta");
  });

  it("restores the stored language after a new render", () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, "ta");
<<<<<<< HEAD
    renderApp(["/login"], { persistLanguage: true });
    expect(screen.getByRole("heading", { name: "மீண்டும் வருக" })).toBeInTheDocument();
=======
    renderApp(["/home"], { persistLanguage: true });
    expect(screen.getByRole("heading", { name: "வணக்கம் 👋" })).toBeInTheDocument();
>>>>>>> origin/main
  });
});
