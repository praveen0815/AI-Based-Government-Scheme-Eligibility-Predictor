export const NIRA_NAME = "Nira";
export const MIN_TRANSCRIPT_CHARS = 3;
export const LOW_SPEECH_CONFIDENCE = 0.55;

const FILLER_WORDS = new Set([
  "um",
  "uh",
  "uhh",
  "ah",
  "ahh",
  "er",
  "erm",
  "hmm",
  "hm",
  "mm",
  "mmm",
  "oh",
  "huh",
  "ha",
  "haha",
  "the",
  "and",
  "like",
  "a",
  "aa",
  "aaa",
  "ஆ",
  "ம்",
  "ஹ்ம்",
]);

const FILLER_PATTERN = /^(um+|uh+|ah+|hm+|m+|ஆ+|ம்+)$/;

export function displayFirstName(fullName?: string | null, email?: string | null): string {
  const fromName = fullName?.trim().split(/\s+/)[0];
  if (fromName) return fromName;
  const local = email?.trim().split("@")[0];
  return local || "";
}

export function isNoiseTranscript(text: string): boolean {
  const value = text
    .toLowerCase()
    .replace(/[?!.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!value) return true;
  if (value.length < MIN_TRANSCRIPT_CHARS) return true;
  const words = value.split(" ");
  return words.length === 1 && (FILLER_WORDS.has(words[0]) || FILLER_PATTERN.test(words[0]));
}

export function isLowSpeechConfidence(confidence: number | undefined): boolean {
  return typeof confidence === "number" && confidence > 0 && confidence < LOW_SPEECH_CONFIDENCE;
}
