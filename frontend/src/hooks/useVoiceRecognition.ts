import { useCallback, useEffect, useRef, useState } from "react";
import type { Language } from "../i18n/types";
import { pickBestTranscript, recognitionLanguage, recognitionTimeoutMs } from "../utils/niraSpeech";

export type VoiceRecognitionError =
  | "permission"
  | "unsupported"
  | "unavailable"
  | "empty"
  | "timeout"
  | "recognition";

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string; confidence?: number }> & { isFinal?: boolean }>;
}

interface SpeechRecognitionCtor {
  new (): BrowserSpeechRecognition;
}


function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export function useVoiceRecognition({
  language,
  onFinalTranscript,
}: {
  language: Language;
  onFinalTranscript?: (transcript: string, meta?: { confidence?: number }) => void;
}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<VoiceRecognitionError | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const finalRef = useRef("");
  const confidenceRef = useRef<number | undefined>(undefined);
  const stoppedByUserRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const onFinalRef = useRef(onFinalTranscript);
  onFinalRef.current = onFinalTranscript;
  const supported = typeof window !== "undefined" && Boolean(getSpeechRecognitionCtor());

  const clearTimeoutHandle = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const detachRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
    }
    recognitionRef.current = null;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeoutHandle();
      const recognition = recognitionRef.current;
      detachRecognition();
      try {
        recognition?.abort();
      } catch {
        /* already stopped */
      }
    };
  }, [clearTimeoutHandle, detachRecognition]);

  const stop = useCallback(() => {
    stoppedByUserRef.current = true;
    clearTimeoutHandle();
    recognitionRef.current?.stop();
  }, [clearTimeoutHandle]);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError("unsupported");
      return;
    }
    clearTimeoutHandle();
    try {
      recognitionRef.current?.abort();
    } catch {
      /* previous session already closed */
    }
    detachRecognition();
    const recognition = new Ctor();
    recognition.lang = recognitionLanguage(language);
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    finalRef.current = "";
    confidenceRef.current = undefined;
    stoppedByUserRef.current = false;
    setTranscript("");
    setInterimTranscript("");
    setError(null);
    setListening(true);

    recognition.onresult = (event) => {
      if (!mountedRef.current) return;
      let interim = "";
      let finalText = finalRef.current;
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const piece = event.results[index];
        const spoken = pickBestTranscript(Array.from(piece));
        if (piece.isFinal) {
          finalText = `${finalText} ${spoken.transcript}`.trim();
          if (typeof spoken.confidence === "number") {
            confidenceRef.current = spoken.confidence;
          }
        } else {
          interim = `${interim} ${spoken.transcript}`.trim();
        }
      }
      finalRef.current = finalText;
      setTranscript(finalText);
      setInterimTranscript(interim);
      if (finalText || interim) {
        clearTimeoutHandle();
      }
    };

    recognition.onerror = (event) => {
      if (!mountedRef.current) return;
      clearTimeoutHandle();
      if (event.error === "aborted" && stoppedByUserRef.current) {
        setListening(false);
        return;
      }
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("permission");
      } else if (event.error === "audio-capture" || event.error === "not-found") {
        setError("unavailable");
      } else if (event.error === "no-speech") {
        setError("empty");
      } else if (event.error === "network") {
        setError("recognition");
      } else {
        setError("recognition");
      }
      setListening(false);
    };

    recognition.onend = () => {
      if (!mountedRef.current) return;
      clearTimeoutHandle();
      setListening(false);
      const spoken = finalRef.current.trim();
      detachRecognition();
      if (spoken) {
        onFinalRef.current?.(spoken, { confidence: confidenceRef.current });
        return;
      }
      if (stoppedByUserRef.current) {
        return;
      }
      setError((current) => current ?? "empty");
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      timeoutRef.current = window.setTimeout(() => {
        if (!mountedRef.current || finalRef.current.trim()) return;
        setError("timeout");
        stoppedByUserRef.current = true;
        recognition.stop();
        setListening(false);
      }, recognitionTimeoutMs(language));
    } catch {
      setListening(false);
      setError("recognition");
    }
  }, [clearTimeoutHandle, detachRecognition, language]);

  return {
    supported,
    listening,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    setTranscript,
    clearError: () => setError(null),
  };
}
