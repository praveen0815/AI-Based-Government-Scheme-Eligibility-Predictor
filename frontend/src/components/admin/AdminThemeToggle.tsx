import { useAdminTheme } from "../../context/AdminThemeContext";
import { useI18n } from "../../context/LanguageContext";
import { MoonIcon, SunIcon } from "../icons";

export function AdminThemeToggle() {
  const { theme, toggleTheme } = useAdminTheme();
  const { t } = useI18n();

  return (
    <button
      type="button"
      className="admin-icon-btn"
      aria-label={theme === "dark" ? t.themeToggleToLight : t.themeToggleToDark}
      aria-pressed={theme === "dark"}
      onClick={toggleTheme}
    >
      {theme === "dark" ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
