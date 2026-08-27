import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  LANGUAGE_STORAGE_KEY,
  isLanguage,
  messages,
  readStoredLanguage,
  type Language,
  type Messages,
} from "../i18n";
import { setUiLanguage } from "../services/api";

interface LanguageState {
  language: Language;
  t: Messages;
  setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageState | null>(null);

export function LanguageProvider({
  children,
  initialLanguage,
}: {
  children: ReactNode;
  initialLanguage?: Language;
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage ?? readStoredLanguage);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dataset.language = language;
    setUiLanguage(language);
  }, [language]);

  const value = useMemo<LanguageState>(
    () => ({
      language,
      t: messages[language],
      setLanguage: (next) => {
        if (isLanguage(next)) setLanguageState(next);
      },
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// Hook lives with the provider; this is the standard React context pattern.
// eslint-disable-next-line react-refresh/only-export-components
export function useI18n(): LanguageState {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useI18n must be used within LanguageProvider");
  }
  return context;
}
