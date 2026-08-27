import { createElement, type ReactNode } from "react";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { LANGUAGE_STORAGE_KEY } from "../i18n";
import { setUiLanguage } from "../services/api";

vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-google-client.apps.googleusercontent.com");

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
  setUiLanguage("en");
  document.documentElement.lang = "en";
  document.documentElement.removeAttribute("data-language");
});
