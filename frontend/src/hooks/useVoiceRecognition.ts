import { useCallback, useEffect, useRef, useState } from "react";
import type { Language } from "../i18n/types";

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
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>;
}

interface SpeechRecognitionCtor {
  new (): BrowserSpeechRecognition;
}

const RECOGNITION_TIMEOUT_MS = 8000;

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
  onFinalTranscript?: (transcript: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<VoiceRecognitionError | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const finalRef = useRef("");
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
    recognition.lang = language === "ta" ? "ta-IN" : "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;
    finalRef.current = "";
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
        const spoken = Array.from(piece)
          .map((item) => item.transcript)
          .join(" ")
          .trim();
        if (piece.isFinal) {
          finalText = `${finalText} ${spoken}`.trim();
        } else {
          interim = `${interim} ${spoken}`.trim();
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
        onFinalRef.current?.(spoken);
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
      }, RECOGNITION_TIMEOUT_MS);
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
