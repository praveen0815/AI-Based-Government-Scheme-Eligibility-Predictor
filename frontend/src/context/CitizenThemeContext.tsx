import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const CITIZEN_THEME_STORAGE_KEY = "schemewise.citizen-theme";
export type CitizenTheme = "light" | "dark";

function isCitizenTheme(value: string | null | undefined): value is CitizenTheme {
  return value === "light" || value === "dark";
}

export function readStoredCitizenTheme(): CitizenTheme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(CITIZEN_THEME_STORAGE_KEY);
  if (isCitizenTheme(stored)) return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyCitizenTheme(theme: CitizenTheme) {
  document.documentElement.dataset.citizenTheme = theme;
}

interface CitizenThemeState {
  theme: CitizenTheme;
  setTheme: (theme: CitizenTheme) => void;
  toggleTheme: () => void;
}

const CitizenThemeContext = createContext<CitizenThemeState | null>(null);

export function CitizenThemeProvider({
  children,
  initialTheme,
}: {
  children: ReactNode;
  initialTheme?: CitizenTheme;
}) {
  const [theme, setThemeState] = useState<CitizenTheme>(
    () => initialTheme ?? readStoredCitizenTheme(),
  );

  useEffect(() => {
    window.localStorage.setItem(CITIZEN_THEME_STORAGE_KEY, theme);
    applyCitizenTheme(theme);
  }, [theme]);

  const value = useMemo<CitizenThemeState>(
    () => ({
      theme,
      setTheme: (next) => {
        if (isCitizenTheme(next)) setThemeState(next);
      },
      toggleTheme: () => setThemeState((current) => (current === "dark" ? "light" : "dark")),
    }),
    [theme],
  );

  return <CitizenThemeContext.Provider value={value}>{children}</CitizenThemeContext.Provider>;
}

// Hook lives with the provider; this is the standard React context pattern.
// eslint-disable-next-line react-refresh/only-export-components
export function useCitizenTheme(): CitizenThemeState {
  const context = useContext(CitizenThemeContext);
  if (!context) {
    throw new Error("useCitizenTheme must be used within CitizenThemeProvider");
  }
  return context;
}
