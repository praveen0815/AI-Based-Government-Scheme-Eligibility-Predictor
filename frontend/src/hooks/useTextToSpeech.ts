import { useCallback, useEffect, useRef, useState } from "react";
import type { Language } from "../i18n/types";

function sanitizeSpokenText(text: string): string {
  return text
    .replace(/bearer\s+[a-z0-9._-]+/gi, "")
    .replace(/\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g, "")
    .replace(/\b\d{12}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pickVoice(language: Language): SpeechSynthesisVoice | undefined {
  if (!window.speechSynthesis?.getVoices) return undefined;
  const voices = window.speechSynthesis.getVoices();
  const wanted = language === "ta" ? "ta" : "en";
  return (
    voices.find((voice) => voice.lang.toLowerCase().startsWith(wanted === "ta" ? "ta-in" : "en-in")) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith(wanted))
  );
}

export function useTextToSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const mountedRef = useRef(true);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      window.speechSynthesis?.cancel?.();
      utteranceRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel?.();
    utteranceRef.current = null;
    if (mountedRef.current) setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string, language: Language) => {
      const spoken = sanitizeSpokenText(text);
      if (!spoken) return false;
      if (!supported) return false;
      window.speechSynthesis?.cancel?.();
      const utterance = new SpeechSynthesisUtterance(spoken);
      utterance.lang = language === "ta" ? "ta-IN" : "en-IN";
      const voice = pickVoice(language);
      if (voice) utterance.voice = voice;
      utterance.onend = () => {
        utteranceRef.current = null;
        if (mountedRef.current) setSpeaking(false);
      };
      utterance.onerror = () => {
        utteranceRef.current = null;
        if (mountedRef.current) setSpeaking(false);
      };
      utteranceRef.current = utterance;
      if (mountedRef.current) setSpeaking(true);
      window.speechSynthesis?.speak?.(utterance);
      return true;
    },
    [supported],
  );

  return { supported, speaking, speak, stop };
}
