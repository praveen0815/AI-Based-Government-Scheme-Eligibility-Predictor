import { createElement, type ReactNode } from "react";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { CITIZEN_THEME_STORAGE_KEY } from "../context/CitizenThemeContext";
import { LANGUAGE_STORAGE_KEY } from "../i18n";
import { setUiLanguage } from "../services/api";

configure({ asyncUtilTimeout: 3000 });

vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-google-client.apps.googleusercontent.com");

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

vi.mock("@react-oauth/google", () => ({
  GoogleOAuthProvider: ({ children }: { children: ReactNode }) => children,
  GoogleLogin: ({
    onSuccess,
  }: {
    onSuccess: (response: { credential?: string }) => void;
  }) =>
    createElement(
      "button",
      {
        type: "button",
        onClick: () => onSuccess({ credential: "test-google-credential" }),
      },
      "Continue with Google",
    ),
}));

afterEach(() => {
  cleanup();
  window.localStorage.removeItem(LANGUAGE_STORAGE_KEY);
  window.localStorage.removeItem(CITIZEN_THEME_STORAGE_KEY);
  setUiLanguage("en");
  document.documentElement.lang = "en";
  document.documentElement.removeAttribute("data-language");
  document.documentElement.removeAttribute("data-citizen-theme");
});
