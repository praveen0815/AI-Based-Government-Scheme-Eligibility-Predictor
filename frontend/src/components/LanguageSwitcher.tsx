import { useI18n } from "../context/LanguageContext";

export function LanguageSwitcher({
  variant = "light",
}: {
<<<<<<< Updated upstream
<<<<<<< HEAD
  variant?: "light" | "sidebar" | "dark" | "login";
=======
  variant?: "light" | "sidebar" | "dark";
>>>>>>> origin/main
=======
  variant?: "light" | "sidebar" | "dark" | "login" | "citizen";
>>>>>>> Stashed changes
}) {
  const { language, setLanguage, t } = useI18n();
  const sidebar = variant === "sidebar";
  const dark = variant === "dark";
<<<<<<< Updated upstream
<<<<<<< HEAD
=======
  const citizen = variant === "citizen";
>>>>>>> Stashed changes
  const login = variant === "login";

  if (login) {
    return (
      <div className="inline-flex items-center gap-3 text-[15px] text-[#6B7C93]" role="group" aria-label={t.languageLabel}>
        <span aria-hidden="true" className="text-[16px]">
          🌐
        </span>
        <button
          type="button"
          aria-pressed={language === "en"}
          className={`font-medium transition ${language === "en" ? "text-[#0B1F4B]" : "hover:text-[#0B1F4B]"}`}
          onClick={() => setLanguage("en")}
        >
          {t.languageEnglish}
        </button>
        <span aria-hidden="true">|</span>
        <button
          type="button"
          aria-pressed={language === "ta"}
          className={`font-medium transition ${language === "ta" ? "text-[#0B1F4B]" : "hover:text-[#0B1F4B]"}`}
          onClick={() => setLanguage("ta")}
        >
          {t.languageTamil}
        </button>
      </div>
    );
  }
=======
>>>>>>> origin/main

  if (citizen) {
    return (
      <div className="citizen-lang" role="group" aria-label={t.languageLabel}>
        <button
          type="button"
          aria-pressed={language === "en"}
          className={`citizen-lang-btn ${language === "en" ? "is-active" : ""}`}
          onClick={() => setLanguage("en")}
        >
          {t.languageEnglish}
        </button>
        <button
          type="button"
          aria-pressed={language === "ta"}
          className={`citizen-lang-btn ${language === "ta" ? "is-active" : ""}`}
          onClick={() => setLanguage("ta")}
        >
          {t.languageTamil}
        </button>
      </div>
    );
  }

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
        className={`min-w-[4.75rem] flex-1 rounded-[10px] px-3 py-2.5 text-[16px] font-semibold transition duration-150 ${
          language === "en"
            ? sidebar || dark
              ? "bg-action text-white"
              : "bg-navy-900 text-white"
            : sidebar || dark
              ? "text-[#D5DDD8] hover:bg-white/10 hover:text-white"
              : "text-ink-500 hover:bg-sage hover:text-ink-900"
        }`}
        onClick={() => setLanguage("en")}
      >
        {t.languageEnglish}
      </button>
      <button
        type="button"
        aria-pressed={language === "ta"}
        className={`min-w-[4.75rem] flex-1 rounded-[10px] px-3 py-2.5 text-[16px] font-semibold transition duration-150 ${
          language === "ta"
            ? sidebar || dark
              ? "bg-action text-white"
              : "bg-navy-900 text-white"
            : sidebar || dark
              ? "text-[#D5DDD8] hover:bg-white/10 hover:text-white"
              : "text-ink-500 hover:bg-sage hover:text-ink-900"
        }`}
        onClick={() => setLanguage("ta")}
      >
        {t.languageTamil}
      </button>
    </div>
  );
}
