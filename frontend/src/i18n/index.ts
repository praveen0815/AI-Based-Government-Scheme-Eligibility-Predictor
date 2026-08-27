import { en } from "./en";
import { ta } from "./ta";
import type { Language, Messages } from "./types";

export const LANGUAGE_STORAGE_KEY = "schemewise.language";

export const messages: Record<Language, Messages> = { en, ta };

export function isLanguage(value: string | null | undefined): value is Language {
  return value === "en" || value === "ta";
}

export function readStoredLanguage(): Language {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isLanguage(stored) ? stored : "en";
}

export type { Language, Messages };
export { en, ta };
