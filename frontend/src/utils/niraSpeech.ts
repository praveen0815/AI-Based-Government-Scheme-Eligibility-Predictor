import type { Language } from "../i18n/types";

export function isSecureSpeechContext(): boolean {
  return typeof window === "undefined" || window.isSecureContext;
}

export function recognitionLanguage(language: Language): string {
  return language === "ta" ? "ta-IN" : "en-IN";
}

export function recognitionTimeoutMs(language: Language): number {
  return language === "ta" ? 12000 : 8000;
}

export function scoreNiraVoice(voice: SpeechSynthesisVoice, language: Language): number {
  const lang = voice.lang.toLowerCase();
  const name = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  const wanted = language === "ta" ? ["ta-in", "ta"] : ["en-in", "en-gb", "en-us", "en"];
  let score = 0;
  if (wanted.some((prefix) => lang.startsWith(prefix))) score += 10;
  if (lang.startsWith(wanted[0])) score += 6;
  if (/neural|natural|online|google|microsoft|premium|wavenet/.test(name)) score += 5;
  if (/female|woman|heera|kalpana|vaani|nira/.test(name)) score += 3;
  if (voice.localService === false) score += 2;
  return score;
}

export function pickNiraVoice(
  language: Language,
  voices: SpeechSynthesisVoice[] = typeof window !== "undefined" ? (window.speechSynthesis?.getVoices?.() ?? []) : [],
): SpeechSynthesisVoice | undefined {
  if (!voices.length) return undefined;
  return [...voices].sort((left, right) => scoreNiraVoice(right, language) - scoreNiraVoice(left, language))[0];
}

export function niraVoiceLabel(voice?: SpeechSynthesisVoice | null): string {
  if (!voice?.name) return "Nira · browser neural";
  return `Nira · ${voice.name}`;
}

export function pickBestTranscript(
  alternatives: Array<{ transcript?: string; confidence?: number }>,
): { transcript: string; confidence?: number } {
  const spoken = alternatives
    .map((item) => ({
      transcript: (item.transcript ?? "").trim(),
      confidence: typeof item.confidence === "number" ? item.confidence : undefined,
    }))
    .filter((item) => item.transcript);
  if (!spoken.length) return { transcript: "" };
  return spoken.reduce((best, item) => {
    if ((item.confidence ?? 0) > (best.confidence ?? 0)) return item;
    return best;
  });
}
