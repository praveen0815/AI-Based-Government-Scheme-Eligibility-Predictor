import { useI18n } from "../context/LanguageContext";

export function LanguageSwitcher({
  variant = "light",
}: {
  variant?: "light" | "sidebar" | "dark";
}) {
  const { language, setLanguage, t } = useI18n();
  const sidebar = variant === "sidebar";
  const dark = variant === "dark";

  return (
    <div
      className={
        sidebar
          ? "inline-flex w-full items-center gap-1 rounded-[12px] bg-navy-800 p-1"
          : dark
            ? "inline-flex items-center rounded-[12px] bg-white/10 p-1"
            : "inline-flex items-center rounded-[12px] border border-line bg-surface p-1 shadow-sm"
      }
      role="group"
      aria-label={t.languageLabel}
    >
      <button
        type="button"
        aria-pressed={language === "en"}
        className={`min-w-[4.5rem] flex-1 rounded-[10px] px-3 py-2 text-[14px] font-semibold transition duration-150 ${
          language === "en"
            ? sidebar || dark
              ? "bg-action text-white"
              : "bg-navy-900 text-white"
            : sidebar || dark
              ? "text-slate-300 hover:bg-white/10 hover:text-white"
              : "text-ink-500 hover:bg-canvas hover:text-ink-900"
        }`}
        onClick={() => setLanguage("en")}
      >
        {t.languageEnglish}
      </button>
      <button
        type="button"
        aria-pressed={language === "ta"}
        className={`min-w-[4.5rem] flex-1 rounded-[10px] px-3 py-2 text-[14px] font-semibold transition duration-150 ${
          language === "ta"
            ? sidebar || dark
              ? "bg-action text-white"
              : "bg-navy-900 text-white"
            : sidebar || dark
              ? "text-slate-300 hover:bg-white/10 hover:text-white"
              : "text-ink-500 hover:bg-canvas hover:text-ink-900"
        }`}
        onClick={() => setLanguage("ta")}
      >
        {t.languageTamil}
      </button>
    </div>
  );
}
