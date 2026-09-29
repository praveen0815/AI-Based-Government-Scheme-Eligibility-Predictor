import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const ADMIN_THEME_STORAGE_KEY = "schemewise.admin-theme";
export type AdminTheme = "light" | "dark";

function isAdminTheme(value: string | null | undefined): value is AdminTheme {
  return value === "light" || value === "dark";
}

export function readStoredAdminTheme(): AdminTheme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY);
  if (isAdminTheme(stored)) return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

interface AdminThemeState {
  theme: AdminTheme;
  toggleTheme: () => void;
}

const AdminThemeContext = createContext<AdminThemeState | null>(null);

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<AdminTheme>(() => readStoredAdminTheme());

  useEffect(() => {
    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, theme);
    document.documentElement.dataset.adminTheme = theme;
    document.documentElement.classList.add("admin-boot");
    return () => {
      delete document.documentElement.dataset.adminTheme;
      document.documentElement.classList.remove("admin-boot");
    };
  }, [theme]);

  const value = useMemo<AdminThemeState>(
    () => ({
      theme,
      toggleTheme: () => setTheme((current) => (current === "dark" ? "light" : "dark")),
    }),
    [theme],
  );

  return <AdminThemeContext.Provider value={value}>{children}</AdminThemeContext.Provider>;
}

export function useAdminTheme(): AdminThemeState {
  const context = useContext(AdminThemeContext);
  if (!context) {
    throw new Error("useAdminTheme must be used within AdminThemeProvider");
  }
  return context;
}
