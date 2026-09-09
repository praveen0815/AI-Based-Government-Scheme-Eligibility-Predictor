import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProfileCompleteness } from "../types/api";
import { detectVoiceIntent } from "../utils/voiceIntent";
import { buildIncomeWhatIfMessage } from "../services/voiceAssistantService";
import { en } from "../i18n/en";
import { extractProfileFields } from "../utils/voiceProfileExtract";
import { recommendResponse, SAMPLE_SCHEME, VALID_PROFILE } from "./fixtures";
import { renderApp, renderAuthenticatedApp, TEST_USER } from "./renderApp";

const WALLET = {
  citizen_id: "11111111-2222-3333-4444-555555555555",
  ...VALID_PROFILE,
  created_at: "2026-08-14T12:00:00+00:00",
  updated_at: "2026-08-14T12:00:00+00:00",
};

const COMPLETE_PROFILE: ProfileCompleteness = {
  percentage: 100,
  completed_fields: 11,
  total_fields: 11,
  incomplete_fields: [],
};

const INCOMPLETE_PROFILE: ProfileCompleteness = {
  percentage: 82,
  completed_fields: 9,
  total_fields: 11,
  incomplete_fields: ["occupation_category", "wet_land_acres"],
};

const CORE_SCHEMES = {
  scheme_count: 1,
  schemes: [
    {
      scheme_id: SAMPLE_SCHEME.scheme_id,
      scheme_name: SAMPLE_SCHEME.scheme_name,
      department: SAMPLE_SCHEME.department,
      scheme_category: SAMPLE_SCHEME.scheme_category,
      description: SAMPLE_SCHEME.description,
      benefit_description: SAMPLE_SCHEME.benefit,
      required_documents: SAMPLE_SCHEME.required_documents,
      application_method: SAMPLE_SCHEME.application_method,
      official_source_url: SAMPLE_SCHEME.official_source_url,
      eligibility_notes: "Student higher-education support.",
      ml_scope: "CORE",
      eligibility_rule_status: "PARTIALLY_VERIFIED",
    },
  ],
};

function jsonOk(body: unknown) {
  return { ok: true as const, json: async () => body };
}

function jsonError(status: number) {
  return { ok: false as const, status, json: async () => ({ detail: "error" }) };
}

function mockVoiceFetch(options?: {
  wallet?: typeof WALLET | null;
  completeness?: ProfileCompleteness;
  recommend?: ReturnType<typeof recommendResponse> | { error: number };
  delayRecommend?: Promise<void>;
}) {
  return vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    const path = String(url);
    const method = String(init?.method ?? "GET").toUpperCase();
    if (path.includes("/notifications")) {
      return jsonOk({ items: [], unread_count: 0, unread_reminder_count: 0 });
    }
    if (path.includes("/completeness")) {
      return jsonOk(options?.completeness ?? COMPLETE_PROFILE);
    }
    if (path.includes("/recommend") && method === "POST") {
      if (options?.delayRecommend) await options.delayRecommend;
      if (options?.recommend && "error" in options.recommend) {
        return jsonError(options.recommend.error);
      }
      return jsonOk(options?.recommend ?? recommendResponse([SAMPLE_SCHEME]));
    }
    if (path.includes("/api/v1/schemes")) {
      return jsonOk(CORE_SCHEMES);
    }
    if (method === "PUT" && path.includes("/wallets/")) {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      return jsonOk({ ...WALLET, ...body });
    }
    if (path.includes("/wallets/me") || path.includes("/wallets/")) {
      if (options?.wallet === null) return jsonError(404);
      return jsonOk(options?.wallet ?? WALLET);
    }
    return jsonOk({});
  });
}

class MockSpeechRecognition {
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((event: {
    resultIndex: number;
    results: Array<Array<{ transcript: string }> & { isFinal?: boolean }>;
  }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => {
    this.onend?.();
  });
  abort = vi.fn();
}

const recognitionInstances: MockSpeechRecognition[] = [];

function SpeechRecognitionCtor() {
  const instance = new MockSpeechRecognition();
  recognitionInstances.push(instance);
  return instance;
}

class MockUtterance {
  text: string;
  lang = "";
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

function installSpeechRecognition() {
  recognitionInstances.length = 0;
  vi.stubGlobal("SpeechRecognition", SpeechRecognitionCtor);
  vi.stubGlobal("webkitSpeechRecognition", SpeechRecognitionCtor);
}

function installTts() {
  const spoken: string[] = [];
  const speak = vi.fn((utterance: MockUtterance) => {
    spoken.push(utterance.text);
  });
  vi.stubGlobal("SpeechSynthesisUtterance", MockUtterance);
  vi.stubGlobal("speechSynthesis", {
    speak,
    cancel: vi.fn(),
    speaking: false,
    pending: false,
    paused: false,
    getVoices: () => [],
  });
  return { spoken, speak };
}

function voiceTextbox() {
  return screen.getByRole("textbox", { name: "Type your question" });
}

async function sendTyped(text: string) {
  const user = userEvent.setup();
  await user.type(voiceTextbox(), text);
  await user.click(screen.getByRole("button", { name: "Send" }));
  return user;
}

afterEach(() => {
  recognitionInstances.length = 0;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("voice intent and profile extraction", () => {
  it("detects eligibility, navigation, completeness, and profile fields", () => {
    expect(detectVoiceIntent("Check my eligibility").intent).toBe("CHECK_ELIGIBILITY");
    expect(detectVoiceIntent("Am I eligible?").intent).toBe("CHECK_ELIGIBILITY");
    expect(detectVoiceIntent("Which schemes can I get?").intent).toBe("CHECK_ELIGIBILITY");
    expect(detectVoiceIntent("What schemes am I eligible for?").intent).toBe("CHECK_ELIGIBILITY");
    expect(detectVoiceIntent("Open my wallet").navigateTo).toBe("wallet");
    expect(detectVoiceIntent("Show my history").navigateTo).toBe("history");
    expect(detectVoiceIntent("Open documents").navigateTo).toBe("documents");
    expect(detectVoiceIntent("Go to insights").navigateTo).toBe("insights");
    expect(detectVoiceIntent("Show my recommended schemes").navigateTo).toBe("results");
    expect(detectVoiceIntent("What information is missing?").intent).toBe("PROFILE_COMPLETENESS");
    expect(detectVoiceIntent("Is my profile complete?").intent).toBe("PROFILE_COMPLETENESS");
    expect(detectVoiceIntent("Why am I eligible?").intent).toBe("EXPLAIN_RESULT");
    expect(detectVoiceIntent("What schemes are available?").intent).toBe("SCHEME_QUESTION");
    expect(detectVoiceIntent("Tell me about this scheme").intent).toBe("SCHEME_QUESTION");
    expect(detectVoiceIntent("Explain this scheme").intent).toBe("SCHEME_QUESTION");
    expect(detectVoiceIntent("What schemes are available for students?").intent).toBe("SCHEME_QUESTION");
    expect(detectVoiceIntent("I am a student").intent).toBe("UPDATE_PROFILE");
    expect(detectVoiceIntent("Tell me a joke").intent).toBe("UNSUPPORTED");
    expect(detectVoiceIntent("My income is 50000").intent).toBe("UNSUPPORTED");
    expect(detectVoiceIntent("What happens if my income changes?").intent).toBe("WHAT_IF");
    expect(detectVoiceIntent("What if my income changes?").intent).toBe("WHAT_IF");
    expect(detectVoiceIntent("What if my income is higher?").intent).toBe("WHAT_IF");
    expect(detectVoiceIntent("What if my income is lower?").intent).toBe("WHAT_IF");
    expect(detectVoiceIntent("What if I earn more?").intent).toBe("WHAT_IF");
    expect(detectVoiceIntent("What if I earn less?").intent).toBe("WHAT_IF");
    expect(detectVoiceIntent("What happens if my salary changes?").intent).toBe("WHAT_IF");
    expect(detectVoiceIntent("How does income affect eligibility?").intent).toBe("WHAT_IF");
    expect(detectVoiceIntent("Will my eligibility change if my income changes?").intent).toBe("WHAT_IF");
    expect(detectVoiceIntent("Can I check eligibility with a different income?").intent).toBe("WHAT_IF");
    expect(detectVoiceIntent("What documents do I need?").intent).toBe("DOCUMENTS_NEEDED");
    expect(detectVoiceIntent("Which one gives the highest benefit?").intent).toBe("HIGHEST_BENEFIT");
    expect(detectVoiceIntent("Compare these schemes").navigateTo).toBe("compare");
    expect(detectVoiceIntent("Open the eligibility simulator").navigateTo).toBe("simulator");
    expect(detectVoiceIntent("Open my applications").navigateTo).toBe("applications");
    expect(detectVoiceIntent("Check what schemes I can get").intent).toBe("CHECK_ELIGIBILITY");
    expect(extractProfileFields("My age is 21. I am a student.").fields).toEqual({
      age: 21,
      is_student: true,
    });
    expect(extractProfileFields("My annual income is 2 lakh.").unsupportedMentions).toContain("income");
  });
});

describe("voice assistant page", () => {
  it("redirects unauthenticated visitors to login", () => {
    renderApp(["/voice-assistant"]);
    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
  });

  it("renders the authenticated voice assistant page", () => {
    vi.stubGlobal("fetch", mockVoiceFetch());
    renderAuthenticatedApp(["/voice-assistant"]);
    expect(screen.getByRole("heading", { name: "Voice Eligibility Assistant" })).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Speaking" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Type your question" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voice Assistant" })).toHaveAttribute("href", "/voice-assistant");
    expect(screen.getByRole("button", { name: "Check my eligibility" })).toBeInTheDocument();
    expect(screen.getByText("No messages in this session yet. Speak or type a question to begin.")).toBeInTheDocument();
  });

  it("starts and stops recognition without continuous recording", async () => {
    installSpeechRecognition();
    vi.stubGlobal("fetch", mockVoiceFetch());
    renderAuthenticatedApp(["/voice-assistant"]);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Start Speaking" }));
    expect(screen.getByText("Listening")).toBeInTheDocument();
    expect(screen.getAllByText("Listening... Speak now").length).toBeGreaterThan(0);
    const active = recognitionInstances.at(-1);
    expect(active?.start).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Stop Listening" }));
    expect(active?.stop).toHaveBeenCalled();
    expect(active?.continuous).toBe(false);
  });

  it("shows the recognized transcript before processing", async () => {
    installSpeechRecognition();
    installTts();
    vi.stubGlobal("fetch", mockVoiceFetch());
    renderAuthenticatedApp(["/voice-assistant"]);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Start Speaking" }));
    const active = recognitionInstances.at(-1);
    const spoken = "I am a 21 year old student from Tamil Nadu.";
    await act(async () => {
      active?.onresult?.({
        resultIndex: 0,
        results: [Object.assign([{ transcript: spoken }], { isFinal: true })],
      });
    });
    expect(await screen.findByText(spoken)).toBeInTheDocument();
  });

  it("shows an empty-transcript error when Send is used with no text", async () => {
    vi.stubGlobal("fetch", mockVoiceFetch());
    renderAuthenticatedApp(["/voice-assistant"]);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByText("I couldn't understand that. Please try again.")).toBeInTheDocument();
  });

  it("shows a permission error when the microphone is blocked", async () => {
    installSpeechRecognition();
    vi.stubGlobal("fetch", mockVoiceFetch());
    renderAuthenticatedApp(["/voice-assistant"]);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Start Speaking" }));
    await act(async () => {
      recognitionInstances.at(-1)?.onerror?.({ error: "not-allowed" });
    });
    expect(
      await screen.findByText("Microphone access was denied. Please allow microphone permission in your browser."),
    ).toBeInTheDocument();
  });

  it("shows an unsupported-browser message when speech recognition is missing", async () => {
    vi.stubGlobal("fetch", mockVoiceFetch());
    renderAuthenticatedApp(["/voice-assistant"]);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Start Speaking" }));
    expect(
      screen.getByText("This browser does not support speech recognition. You can still type your question."),
    ).toBeInTheDocument();
  });

  it("uses the existing wallet recommend API for an eligibility intent", async () => {
    installTts();
    const fetchMock = mockVoiceFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/voice-assistant"]);
    await sendTyped("Check my eligibility");
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          (call) =>
            String(call[0]).includes(`/api/v1/wallets/${WALLET.citizen_id}/recommend`) &&
            String(call[1]?.method).toUpperCase() === "POST",
        ),
      ).toBe(true);
    });
    expect(fetchMock.mock.calls.some((call) => String(call[0]).endsWith("/api/v1/recommend"))).toBe(false);
    expect((await screen.findAllByText(/you may be eligible for 1 scheme/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/top recommendation is/i).length).toBeGreaterThan(0);
  });

  it("navigates to the wallet from a voice navigation intent", async () => {
    vi.stubGlobal("fetch", mockVoiceFetch({ wallet: null }));
    renderAuthenticatedApp(["/voice-assistant"]);
    await sendTyped("Open my wallet");
    expect(await screen.findByRole("heading", { name: "My Socio-Economic Wallet" })).toBeInTheDocument();
  });

  it("asks for confirmation before updating the wallet profile", async () => {
    installTts();
    const fetchMock = mockVoiceFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/voice-assistant"]);
    await sendTyped("My age is 21");
    expect((await screen.findAllByText("Would you like me to update your wallet?")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/I understood your age as 21/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Age: 21/).length).toBeGreaterThan(0);
    expect(fetchMock.mock.calls.some((call) => String(call[1]?.method).toUpperCase() === "PUT")).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => {
      const putCall = fetchMock.mock.calls.find(
        (call) =>
          String(call[0]).includes(`/api/v1/wallets/${WALLET.citizen_id}`) &&
          String(call[1]?.method).toUpperCase() === "PUT",
      );
      expect(putCall).toBeTruthy();
      const body = JSON.parse(String(putCall?.[1]?.body));
      expect(body.age).toBe(21);
      expect(body.gender).toBe(VALID_PROFILE.gender);
      expect(body.is_student).toBe(VALID_PROFILE.is_student);
    });
    expect((await screen.findAllByText("Your profile was updated with the confirmed details.")).length).toBeGreaterThan(0);
  });

  it("cancels a detected profile update without calling the wallet API", async () => {
    installTts();
    const fetchMock = mockVoiceFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/voice-assistant"]);
    await sendTyped("I am a student");
    expect(await screen.findByRole("button", { name: "Cancel" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect((await screen.findAllByText("No profile changes were saved.")).length).toBeGreaterThan(0);
    expect(fetchMock.mock.calls.some((call) => String(call[1]?.method).toUpperCase() === "PUT")).toBe(false);
  });

  it("shows a processing state while the eligibility API is pending", async () => {
    let release: (() => void) | undefined;
    const delayRecommend = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.stubGlobal("fetch", mockVoiceFetch({ delayRecommend }));
    renderAuthenticatedApp(["/voice-assistant"]);
    const user = userEvent.setup();
    await user.type(voiceTextbox(), "Check my eligibility");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText("Processing")).toBeInTheDocument();
    expect(screen.getAllByText("Understanding your request...").length).toBeGreaterThan(0);
    release?.();
    expect((await screen.findAllByText(/you may be eligible for 1 scheme/i)).length).toBeGreaterThan(0);
  });

  it("shows a friendly message when the eligibility API fails", async () => {
    vi.stubGlobal("fetch", mockVoiceFetch({ recommend: { error: 500 } }));
    renderAuthenticatedApp(["/voice-assistant"]);
    await sendTyped("Check my eligibility");
    expect((await screen.findAllByText("Unable to retrieve eligibility results right now.")).length).toBeGreaterThan(0);
    expect(screen.queryByText(/TypeError|stack/i)).not.toBeInTheDocument();
  });

  it("reads the response with browser text-to-speech", async () => {
    const tts = installTts();
    vi.stubGlobal("fetch", mockVoiceFetch());
    renderAuthenticatedApp(["/voice-assistant"]);
    await sendTyped("Check my eligibility");
    await waitFor(() => {
      expect(tts.speak).toHaveBeenCalled();
    });
    expect(screen.getByText("Speaking")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop Speaking" })).toBeInTheDocument();
  });

  it("renders English and Tamil voice assistant copy from the existing i18n dictionaries", () => {
    vi.stubGlobal("fetch", mockVoiceFetch());
    renderApp(["/voice-assistant"], { user: TEST_USER, token: "test-token", language: "ta" });
    expect(screen.getByRole("heading", { name: "குரல் தகுதி உதவியாளர்" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "பேசத் தொடங்கு" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "குரல் உதவியாளர்" })).toBeInTheDocument();
  });

  it("explains the existing hybrid result without inventing a new reason", async () => {
    installTts();
    vi.stubGlobal("fetch", mockVoiceFetch({ completeness: INCOMPLETE_PROFILE }));
    renderAuthenticatedApp(["/voice-assistant"], {
      profile: VALID_PROFILE,
      result: recommendResponse([SAMPLE_SCHEME]),
    });
    await sendTyped("Why am I eligible?");
    expect(
      (await screen.findAllByText(/documented conditions checked against your profile were satisfied/i)).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/rule engine and machine learning prediction agree/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/missing Occupation/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/add income to become eligible/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/eligibility cannot be fully evaluated/i).length).toBeGreaterThan(0);
  });

  it("uses the existing scheme catalog for a scheme question", async () => {
    installTts();
    const fetchMock = mockVoiceFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/voice-assistant"]);
    await sendTyped("Tell me about this scheme");
    await waitFor(() => {
      expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/api/v1/schemes"))).toBe(true);
    });
    expect((await screen.findAllByText(/CORE schemes in this research prototype/i)).length).toBeGreaterThan(0);
  });

  it("navigates to documents and insights from voice commands", async () => {
    vi.stubGlobal("fetch", mockVoiceFetch());
    renderAuthenticatedApp(["/voice-assistant"]);
    await sendTyped("Open documents");
    expect(await screen.findByRole("heading", { name: "Document Preparation" })).toBeInTheDocument();
  });

  it("prevents a second eligibility request while the first is processing", async () => {
    let release: (() => void) | undefined;
    const delayRecommend = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fetchMock = mockVoiceFetch({ delayRecommend });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/voice-assistant"]);
    const user = userEvent.setup();
    await user.type(voiceTextbox(), "Check my eligibility");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText("Processing")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Start Speaking" })).toBeDisabled();
    release?.();
    expect((await screen.findAllByText(/you may be eligible for 1 scheme/i)).length).toBeGreaterThan(0);
    const recommendCalls = fetchMock.mock.calls.filter(
      (call) => String(call[0]).includes("/recommend") && String(call[1]?.method).toUpperCase() === "POST",
    );
    expect(recommendCalls).toHaveLength(1);
  });

  it("stops text-to-speech without restarting the microphone", async () => {
    const tts = installTts();
    installSpeechRecognition();
    vi.stubGlobal("fetch", mockVoiceFetch());
    renderAuthenticatedApp(["/voice-assistant"]);
    await sendTyped("Check my eligibility");
    await waitFor(() => {
      expect(tts.speak).toHaveBeenCalled();
    });
    await userEvent.click(screen.getByRole("button", { name: "Stop Speaking" }));
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
    expect(screen.queryByText("Listening")).not.toBeInTheDocument();
  });

  it("clears the session conversation without writing a voice history API", async () => {
    installTts();
    const fetchMock = mockVoiceFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/voice-assistant"]);
    await sendTyped("Check my eligibility");
    expect((await screen.findAllByText(/you may be eligible for 1 scheme/i)).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: "Clear conversation" }));
    expect(screen.getByText("No messages in this session yet. Speak or type a question to begin.")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/history"))).toBe(false);
  });

  it("retries a failed eligibility request", async () => {
    let failOnce = true;
    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      const path = String(url);
      const method = String(init?.method ?? "GET").toUpperCase();
      if (path.includes("/notifications")) return jsonOk({ items: [], unread_count: 0, unread_reminder_count: 0 });
      if (path.includes("/completeness")) return jsonOk(COMPLETE_PROFILE);
      if (path.includes("/recommend") && method === "POST") {
        if (failOnce) {
          failOnce = false;
          return jsonError(500);
        }
        return jsonOk(recommendResponse([SAMPLE_SCHEME]));
      }
      if (path.includes("/wallets/me") || path.includes("/wallets/")) return jsonOk(WALLET);
      return jsonOk({});
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/voice-assistant"]);
    await sendTyped("Check my eligibility");
    expect((await screen.findAllByText("Unable to retrieve eligibility results right now.")).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect((await screen.findAllByText(/you may be eligible for 1 scheme/i)).length).toBeGreaterThan(0);
  });

  it("shows a microphone unavailable error", async () => {
    installSpeechRecognition();
    vi.stubGlobal("fetch", mockVoiceFetch());
    renderAuthenticatedApp(["/voice-assistant"]);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Start Speaking" }));
    await act(async () => {
      recognitionInstances.at(-1)?.onerror?.({ error: "audio-capture" });
    });
    expect(await screen.findByText("A microphone is not available. You can type your question instead.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Type your question" })).toBeEnabled();
  });

  it("answers a typed income what-if without auto-navigation or wallet writes", async () => {
    const fetchMock = mockVoiceFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/voice-assistant"]);
    await sendTyped("What happens if my income changes?");
    expect((await screen.findAllByText(en.voiceIncomeWhatIfExplanation)).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Open Eligibility Simulator" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Voice Eligibility Assistant" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Eligibility What-If Simulator" })).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        (call) => String(call[0]).includes("/wallets/") && String(call[1]?.method ?? "GET").toUpperCase() === "PUT",
      ),
    ).toBe(false);
    expect(buildIncomeWhatIfMessage(en)).toEqual({
      type: "assistant",
      intent: "income_what_if",
      text: en.voiceIncomeWhatIfExplanation,
      action: "open_simulator",
    });
    await userEvent.click(screen.getAllByRole("button", { name: "Open Eligibility Simulator" })[0]);
    expect(await screen.findByRole("heading", { name: "Eligibility What-If Simulator" })).toBeInTheDocument();
  });

  it("speaks a voiced income what-if and waits for the action button before navigating", async () => {
    const tts = installTts();
    installSpeechRecognition();
    const fetchMock = mockVoiceFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/voice-assistant"]);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Start Speaking" }));
    const active = recognitionInstances.at(-1);
    await act(async () => {
      active?.onresult?.({
        resultIndex: 0,
        results: [Object.assign([{ transcript: "What if I earn more?" }], { isFinal: true })],
      });
      active?.onend?.();
    });
    expect((await screen.findAllByText(en.voiceIncomeWhatIfExplanation)).length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Eligibility What-If Simulator" })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(tts.speak).toHaveBeenCalled();
    });
    const utterance = tts.speak.mock.calls[0][0] as { text: string; onend: (() => void) | null };
    expect(utterance.text).toContain("Income is not stored");
    expect(screen.getAllByRole("button", { name: "Open Eligibility Simulator" })[0]).toBeDisabled();
    await act(async () => {
      utterance.onend?.();
    });
    expect(
      fetchMock.mock.calls.some(
        (call) => String(call[0]).includes("/wallets/") && String(call[1]?.method ?? "GET").toUpperCase() === "PUT",
      ),
    ).toBe(false);
    await user.click(screen.getAllByRole("button", { name: "Open Eligibility Simulator" })[0]);
    expect(await screen.findByRole("heading", { name: "Eligibility What-If Simulator" })).toBeInTheDocument();
  });

  it("answers document and highest-benefit questions from existing recommendations", async () => {
    installTts();
    vi.stubGlobal("fetch", mockVoiceFetch());
    renderApp(["/voice-assistant"], {
      user: TEST_USER,
      token: "test-token",
      profile: VALID_PROFILE,
      result: recommendResponse([SAMPLE_SCHEME]),
    });
    await sendTyped("What documents do I need?");
    expect((await screen.findAllByText(/Required documents come from the official catalog/i)).length).toBeGreaterThan(0);
    await sendTyped("Which one gives the highest benefit?");
    expect((await screen.findAllByText(/Catalog benefit text for your predicted-eligible schemes/i)).length).toBeGreaterThan(0);
  });
});
