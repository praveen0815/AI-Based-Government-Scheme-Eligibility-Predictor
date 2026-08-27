import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter, type MemoryRouterProps } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { LanguageProvider } from "../context/LanguageContext";
import { RecommendationProvider } from "../context/RecommendationContext";
import type { Language } from "../i18n";
import type { AuthUser, CitizenProfile, RecommendResponse } from "../types/api";
import App from "../App";

export const TEST_USER: AuthUser = {
  user_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  full_name: "Test User",
  email: "test@example.com",
};

export function renderApp(
  initialEntries: MemoryRouterProps["initialEntries"] = ["/"],
  initial?: {
    profile?: CitizenProfile | null;
    result?: RecommendResponse | null;
    user?: AuthUser | null;
    token?: string | null;
    language?: Language;
    persistLanguage?: boolean;
  },
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(
    <MemoryRouter
      initialEntries={initialEntries}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <LanguageProvider
        initialLanguage={initial?.persistLanguage ? undefined : (initial?.language ?? "en")}
      >
        <AuthProvider initialUser={initial?.user ?? null} initialToken={initial?.token ?? null}>
          <RecommendationProvider initialProfile={initial?.profile} initialResult={initial?.result}>
            <App />
          </RecommendationProvider>
        </AuthProvider>
      </LanguageProvider>
    </MemoryRouter>,
    options,
  );
}

export function renderAuthenticatedApp(
  initialEntries: MemoryRouterProps["initialEntries"] = ["/wallet"],
  initial?: {
    profile?: CitizenProfile | null;
    result?: RecommendResponse | null;
  },
) {
  return renderApp(initialEntries, {
    ...initial,
    user: TEST_USER,
    token: "test-token",
  });
}
