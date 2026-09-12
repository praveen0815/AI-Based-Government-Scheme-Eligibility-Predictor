import { useCallback, useEffect, useRef, useState } from "react";
import type { Language } from "../i18n/types";
import { niraVoiceLabel, pickNiraVoice, recognitionLanguage } from "../utils/niraSpeech";

function sanitizeSpokenText(text: string): string {
  return text
    .replace(/bearer\s+[a-z0-9._-]+/gi, "")
    .replace(/\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g, "")
    .replace(/\b\d{12}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function useTextToSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [voiceLabel, setVoiceLabel] = useState(niraVoiceLabel());
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const mountedRef = useRef(true);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    mountedRef.current = true;
    const refreshVoices = () => {
      if (!mountedRef.current) return;
      setVoiceLabel(niraVoiceLabel(pickNiraVoice("en")));
    };
    refreshVoices();
    window.speechSynthesis?.addEventListener?.("voiceschanged", refreshVoices);
    return () => {
      mountedRef.current = false;
      window.speechSynthesis?.removeEventListener?.("voiceschanged", refreshVoices);
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
      utterance.lang = recognitionLanguage(language);
      utterance.rate = language === "ta" ? 0.92 : 1;
      const voice = pickNiraVoice(language);
      if (voice) {
        utterance.voice = voice;
        if (mountedRef.current) setVoiceLabel(niraVoiceLabel(voice));
      }
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

  return { supported, speaking, speak, stop, voiceLabel };
}
