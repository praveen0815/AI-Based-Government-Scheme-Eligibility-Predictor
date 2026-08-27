import { useI18n } from "../context/LanguageContext";

export function LanguageSwitcher({ variant = "light" }: { variant?: "light" | "sidebar" }) {
  const { language, setLanguage, t } = useI18n();
  const sidebar = variant === "sidebar";

  return (
    <div
      className={
        sidebar
          ? "inline-flex w-full items-center gap-1"
          : "inline-flex items-center rounded-[12px] border border-line bg-surface p-1"
      }
      role="group"
      aria-label={t.languageLabel}
    >
      <button
        type="button"
        aria-pressed={language === "en"}
        className={`flex-1 rounded-[10px] px-3 py-2 text-[14px] font-semibold transition duration-150 ${
          language === "en"
            ? sidebar
              ? "border border-action bg-white text-action"
              : "bg-brand-900 text-white"
            : sidebar
              ? "border border-line bg-white text-ink-500 hover:bg-canvas"
              : "text-ink-500 hover:bg-canvas hover:text-ink-900"
        }`}
        onClick={() => setLanguage("en")}
      >
        {sidebar ? (
          <span className="inline-flex items-center justify-center gap-2">
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded-[4px] text-[9px] font-bold ${
                language === "en" ? "bg-action text-white" : "bg-slate-200 text-ink-500"
              }`}
            >
              EN
            </span>
            {t.languageEnglish}
          </span>
        ) : (
          t.languageEnglish
        )}
      </button>
      <button
        type="button"
        aria-pressed={language === "ta"}
        className={`flex-1 rounded-[10px] px-3 py-2 text-[14px] font-semibold transition duration-150 ${
          language === "ta"
            ? sidebar
              ? "border border-action bg-white text-action"
              : "bg-brand-900 text-white"
            : sidebar
              ? "border border-line bg-white text-ink-500 hover:bg-canvas"
              : "text-ink-500 hover:bg-canvas hover:text-ink-900"
        }`}
        onClick={() => setLanguage("ta")}
      >
        {t.languageTamil}
      </button>
    </div>
  );
}
