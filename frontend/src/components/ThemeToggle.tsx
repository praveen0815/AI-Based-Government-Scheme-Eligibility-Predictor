import { useCitizenTheme } from "../context/CitizenThemeContext";
import { useI18n } from "../context/LanguageContext";
import { MoonIcon, SunIcon } from "./icons";

export function ThemeToggle() {
  const { theme, toggleTheme } = useCitizenTheme();
  const { t } = useI18n();
  const nextIsLight = theme === "dark";

  return (
    <button
      type="button"
      className="citizen-icon-btn"
      aria-label={nextIsLight ? t.themeToggleToLight : t.themeToggleToDark}
      aria-pressed={theme === "dark"}
      onClick={toggleTheme}
    >
      {theme === "dark" ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
