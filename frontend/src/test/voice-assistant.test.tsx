import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProfileCompleteness } from "../types/api";
import { detectVoiceIntent } from "../utils/voiceIntent";
import { displayFirstName, isLowSpeechConfidence, isNoiseTranscript } from "../utils/niraIdentity";
import { niraVoiceLabel, pickBestTranscript, pickNiraVoice } from "../utils/niraSpeech";
import { hashTranscript, maskEmail } from "../services/voiceAdminService";
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

const KAMAL = {
  user_id: "bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee",
  full_name: "Kamal Nath",
  email: "kamal@example.com",
  has_wallet: true,
  is_admin: false,
  created_at: "2026-09-01T10:00:00+00:00",
  last_activity_at: "2026-09-12T04:00:00+00:00",
};

const KAMAL_RAJ = {
  ...KAMAL,
  user_id: "cccccccc-bbbb-cccc-dddd-eeeeeeeeeeee",
  full_name: "Kamal Raj",
  email: "kamal.raj@example.com",
};

function mockAdminVoiceFetch(options?: { multiple?: boolean }) {
  return vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    const path = String(url);
    const method = String(init?.method ?? "GET").toUpperCase();
    if (path.includes("/notifications")) {
      return jsonOk({ items: [], unread_count: 0, unread_reminder_count: 0 });
    }
    if (path.includes("/api/v1/admin/overview")) {
      return jsonOk({
        total_users: 4,
        active_users: 2,
        total_document_uploads: 3,
        pending_document_reviews: 1,
        verified_documents: 1,
        rejected_documents: 1,
        eligible_scheme_results: 5,
        not_eligible_scheme_results: 7,
        cannot_fully_evaluate_users: 1,
        recent_activity: [],
        disclaimer: "Administrator monitoring for this academic research prototype.",
      });
    }
    if (/\/api\/v1\/admin\/users\/[^/?]+/.test(path)) {
      return jsonOk({
        user: KAMAL,
        wallet: { citizen_id: WALLET.citizen_id, ...VALID_PROFILE },
        completeness: COMPLETE_PROFILE,
        eligibility: {
          has_wallet: true,
          prediction_label: "eligible",
          eligible_scheme_count: 2,
          evaluated_schemes: [],
          incomplete_fields: [],
          last_checked_at: "2026-09-12T04:00:00+00:00",
          disclaimer: "Administrator monitoring for this academic research prototype.",
        },
        applications: [],
        history: [],
        disclaimer: "Administrator monitoring for this academic research prototype.",
      });
    }
    if (path.includes("/api/v1/admin/users")) {
      const users = options?.multiple ? [KAMAL, KAMAL_RAJ] : [KAMAL];
      return jsonOk({
        users,
        count: users.length,
        disclaimer: "Administrator monitoring for this academic research prototype.",
      });
    }
    if (path.includes("/api/v1/admin/audit/voice") && method === "POST") {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      return jsonOk({
        id: "audit-1",
        admin_user_id: TEST_USER.user_id,
        intent: body.intent,
        outcome: body.outcome,
        target_user_id: body.target_user_id ?? null,
        transcript_hash: body.transcript_hash,
        created_at: "2026-09-12T16:00:00+00:00",
        disclaimer: "Administrator monitoring for this academic research prototype.",
      });
    }
    if (path.includes("/api/v1/admin/documents/") && method === "PATCH") {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      return jsonOk({
        id: "upload-1",
        owner_user_id: KAMAL.user_id,
        owner_name: KAMAL.full_name,
        owner_email: KAMAL.email,
        category: "education_certificate",
        display_name: "school-certificate.pdf",
        content_type: "application/pdf",
        size_bytes: 128,
        scheme_id: null,
        scheme_name: null,
        review_status: body.review_status ?? "verified",
        created_at: "2026-09-12T04:00:00+00:00",
      });
    }
    if (path.includes("/api/v1/admin/documents") && method === "GET") {
      return jsonOk({
        documents: [
          {
            id: "upload-1",
            owner_user_id: KAMAL.user_id,
            owner_name: KAMAL.full_name,
            owner_email: KAMAL.email,
            category: "education_certificate",
            display_name: "school-certificate.pdf",
            content_type: "application/pdf",
            size_bytes: 128,
            scheme_id: null,
            scheme_name: null,
            review_status: "pending",
            created_at: "2026-09-12T04:00:00+00:00",
          },
          {
            id: "upload-2",
            owner_user_id: KAMAL.user_id,
            owner_name: KAMAL.full_name,
            owner_email: KAMAL.email,
            category: "income_proof",
            display_name: "income-note.pdf",
            content_type: "application/pdf",
            size_bytes: 64,
            scheme_id: null,
            scheme_name: null,
            review_status: "verified",
            created_at: "2026-09-12T04:00:00+00:00",
          },
          {
            id: "upload-3",
            owner_user_id: KAMAL.user_id,
            owner_name: KAMAL.full_name,
            owner_email: KAMAL.email,
            category: "other",
            display_name: "extra.pdf",
            content_type: "application/pdf",
            size_bytes: 32,
            scheme_id: null,
            scheme_name: null,
            review_status: "rejected",
            created_at: "2026-09-12T04:00:00+00:00",
          },
        ],
        count: 3,
        disclaimer: "Administrator monitoring for this academic research prototype.",
      });
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
    expect(detectVoiceIntent("Who are you?").intent).toBe("WHO_ARE_YOU");
    expect(detectVoiceIntent("What can you help with?").intent).toBe("HELP");
    expect(detectVoiceIntent("Hi Nira").intent).toBe("GREET");
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
    expect(detectVoiceIntent("Open documents").intent).toBe("NAVIGATE");
    expect(detectVoiceIntent("Show Kamal Nath's documents").intent).toBe("ADMIN_USER_DOCUMENTS");
    expect(detectVoiceIntent("Show Kamal Nath's documents").personQuery).toBe("Kamal Nath");
    expect(detectVoiceIntent("Find user Kamal Nath").intent).toBe("ADMIN_LOOKUP_USER");
    expect(detectVoiceIntent("Summarize Kamal Nath").intent).toBe("ADMIN_USER_SUMMARY");
    expect(maskEmail("kamal@example.com")).toBe("k***@example.com");
    expect(maskEmail("kamal.raj@example.com")).toBe("k***@example.com");
    expect(detectVoiceIntent("How many pending reviews?").intent).toBe("ADMIN_PENDING_REVIEWS");
    expect(detectVoiceIntent("How many documents are waiting").intent).toBe("ADMIN_PENDING_REVIEWS");
    expect(detectVoiceIntent("Please see if I qualify").intent).toBe("CHECK_ELIGIBILITY");
    expect(detectVoiceIntent("What's left to fill in my profile").intent).toBe("PROFILE_COMPLETENESS");
    expect(detectVoiceIntent("Why was this scheme recommended").intent).toBe("EXPLAIN_RESULT");
    expect(detectVoiceIntent("Take me to my papers").navigateTo).toBe("documents");
    expect(detectVoiceIntent("Which scheme pays the most").intent).toBe("HIGHEST_BENEFIT");
    expect(detectVoiceIntent("Verify Kamal Nath's document").intent).toBe("ADMIN_REVIEW_DOCUMENT");
    expect(detectVoiceIntent("Verify Kamal Nath's document").personQuery).toBe("Kamal Nath");
    expect(detectVoiceIntent("Verify Kamal Nath's document").reviewStatus).toBe("verified");
    expect(detectVoiceIntent("Reject Kamal Nath's education certificate").reviewStatus).toBe("rejected");
    expect(detectVoiceIntent("Open users").adminNavigateTo).toBe("users");
    expect(extractProfileFields("My age is 21. I am a student.").fields).toEqual({
      age: 21,
      is_student: true,
    });
    expect(extractProfileFields("My annual income is 2 lakh.").unsupportedMentions).toContain("income");
  });

  it("picks a named neural Nira voice and the best transcript alternative", () => {
    const voices = [
      { name: "Android Local", lang: "en-US", localService: true, voiceURI: "local", default: false },
      { name: "Microsoft Heera Neural", lang: "en-IN", localService: false, voiceURI: "heera", default: false },
    ] as SpeechSynthesisVoice[];
    const chosen = pickNiraVoice("en", voices);
    expect(chosen?.name).toBe("Microsoft Heera Neural");
    expect(niraVoiceLabel(chosen)).toBe("Nira · Microsoft Heera Neural");
    expect(pickBestTranscript([{ transcript: "weak", confidence: 0.2 }, { transcript: "strong", confidence: 0.9 }])).toEqual({
      transcript: "strong",
      confidence: 0.9,
    });
  });

  it("hashes transcripts and masks emails without keeping raw speech", async () => {
    expect(maskEmail("kamal@example.com")).toBe("k***@example.com");
    const hashed = await hashTranscript("  Show Kamal Nath's documents  ");
    expect(hashed).toMatch(/^[a-f0-9]{64}$/);
    expect(hashed).toBe(await hashTranscript("Show Kamal Nath's documents"));
    expect(hashed).not.toMatch(/kamal|documents/i);
  });

  it("treats filler and low-confidence speech as unsafe to act on", () => {
    expect(displayFirstName("Praveen Kumar", "other@example.com")).toBe("Praveen");
    expect(displayFirstName("", "kamal@example.com")).toBe("kamal");
    expect(isNoiseTranscript("um")).toBe(true);
    expect(isNoiseTranscript("ahh")).toBe(true);
    expect(isNoiseTranscript("Check my eligibility")).toBe(false);
    expect(isLowSpeechConfidence(0.2)).toBe(true);
    expect(isLowSpeechConfidence(0)).toBe(false);
    expect(isLowSpeechConfidence(undefined)).toBe(false);
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
    expect(screen.getByRole("heading", { name: "Nira" })).toBeInTheDocument();
    expect(screen.getAllByText("Hi, I'm Nira. What can I help you with?").length).toBeGreaterThan(0);
    expect(screen.getByText("Signed in as Test · Citizen portal")).toBeInTheDocument();
    expect(screen.getAllByText("Hi, I'm Nira. How can I help you today, Test?").length).toBeGreaterThan(0);
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Speaking" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Type your question" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voice Assistant" })).toHaveAttribute("href", "/voice-assistant");
    expect(screen.getByRole("button", { name: "Check my eligibility" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Who are you?" })).toBeInTheDocument();
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
    expect(screen.getByRole("heading", { name: "நிரா" })).toBeInTheDocument();
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
    expect(screen.getByRole("heading", { name: "Nira" })).toBeInTheDocument();
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
    const utterance = tts.speak.mock.calls
      .map((call) => call[0] as { text: string; onend: (() => void) | null })
      .find((item) => item.text.includes("Income is not stored"));
    expect(utterance).toBeTruthy();
    expect(utterance?.text).toContain("Income is not stored");
    expect(screen.getAllByRole("button", { name: "Open Eligibility Simulator" })[0]).toBeDisabled();
    await act(async () => {
      utterance?.onend?.();
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

  it("answers identity and help questions without calling eligibility APIs", async () => {
    const fetchMock = mockVoiceFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/voice-assistant"]);
    await sendTyped("Who are you?");
    expect((await screen.findAllByText(/I'm Nira, a research voice assistant/i)).length).toBeGreaterThan(0);
    await sendTyped("What can you help with?");
    expect((await screen.findAllByText(/I can check eligibility/i)).length).toBeGreaterThan(0);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/recommend"))).toBe(false);
  });

  it("does not run skills for filler noise", async () => {
    const fetchMock = mockVoiceFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/voice-assistant"]);
    await sendTyped("um");
    expect((await screen.findAllByText(/I didn't catch a clear question/i)).length).toBeGreaterThan(0);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/recommend"))).toBe(false);
    expect(fetchMock.mock.calls.some((call) => String(call[1]?.method ?? "GET").toUpperCase() === "PUT")).toBe(false);
  });

  it("asks for confirmation instead of acting on low-confidence speech", async () => {
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
        results: [Object.assign([{ transcript: "Check my eligibility", confidence: 0.2 }], { isFinal: true })],
      });
      active?.onend?.();
    });
    expect((await screen.findAllByText(/I heard something like "Check my eligibility"/i)).length).toBeGreaterThan(0);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/recommend"))).toBe(false);
  });

  it("greets an administrator by name on the admin voice page", () => {
    vi.stubGlobal("fetch", mockVoiceFetch());
    renderApp(["/admin/voice-assistant"], {
      user: { ...TEST_USER, is_admin: true },
      token: "test-token",
    });
    expect(screen.getByRole("heading", { name: "Nira" })).toBeInTheDocument();
    expect(
      screen.getAllByText("Hi, I'm Nira. You're in the Admin Console. How can I help you today, Test?").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Signed in as Test · Administrator")).toBeInTheDocument();
  });

  it("refuses another person's records for a citizen", async () => {
    const fetchMock = mockVoiceFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/voice-assistant"]);
    await sendTyped("Show Kamal Nath's documents");
    expect((await screen.findAllByText(/I can't open another person's records/i)).length).toBeGreaterThan(0);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/admin/"))).toBe(false);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/audit/voice"))).toBe(false);
  });

  it("asks an admin to confirm before fetching Kamal Nath's document statuses", async () => {
    const fetchMock = mockAdminVoiceFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderApp(["/admin/voice-assistant"], {
      user: { ...TEST_USER, is_admin: true },
      token: "admin-token",
    });
    await sendTyped("Show Kamal Nath's documents");
    expect((await screen.findAllByText(/look up document statuses for Kamal Nath/i)).length).toBeGreaterThan(0);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/admin/users"))).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => {
      expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/admin/users"))).toBe(true);
    });
    await waitFor(() => {
      expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/admin/audit/voice"))).toBe(true);
    });
    expect((await screen.findAllByText(/Kamal Nath has 3 uploads/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1 pending, 1 verified, 1 rejected/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/school-certificate\.pdf/i)).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some((call) => String(call[1]?.method ?? "GET").toUpperCase() === "PATCH")).toBe(false);
    const auditCall = fetchMock.mock.calls.find(
      (call) => String(call[0]).includes("/admin/audit/voice") && String(call[1]?.method).toUpperCase() === "POST",
    );
    expect(auditCall).toBeTruthy();
    const auditBody = JSON.parse(String(auditCall?.[1]?.body));
    expect(auditBody.intent).toBe("ADMIN_USER_DOCUMENTS");
    expect(auditBody.outcome).toBe("ok");
    expect(auditBody.transcript_hash).toBe(await hashTranscript("Show Kamal Nath's documents"));
    expect(auditBody.transcript).toBeUndefined();
    expect(JSON.stringify(auditBody)).not.toMatch(/kamal nath's documents/i);
    await userEvent.click(screen.getByRole("button", { name: "Open full record" }));
    expect(await screen.findByRole("heading", { name: en.adminDocumentVerification })).toBeInTheDocument();
  });

  it("lets an admin cancel a lookup without calling admin APIs", async () => {
    const fetchMock = mockAdminVoiceFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderApp(["/admin/voice-assistant"], {
      user: { ...TEST_USER, is_admin: true },
      token: "admin-token",
    });
    await sendTyped("Find user Kamal Nath");
    expect((await screen.findAllByText(/look up Kamal Nath in the admin user list/i)).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect((await screen.findAllByText(en.voiceAdminCancelled)).length).toBeGreaterThan(0);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/admin/users"))).toBe(false);
    await waitFor(() => {
      expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/admin/audit/voice"))).toBe(true);
    });
    const cancelAudit = fetchMock.mock.calls.find((call) => String(call[0]).includes("/admin/audit/voice"));
    const cancelBody = JSON.parse(String(cancelAudit?.[1]?.body));
    expect(cancelBody.outcome).toBe("cancelled");
    expect(cancelBody.transcript_hash).toBe(await hashTranscript("Find user Kamal Nath"));
    expect(cancelBody.transcript).toBeUndefined();
  });

  it("asks which person when more than one user matches", async () => {
    const fetchMock = mockAdminVoiceFetch({ multiple: true });
    vi.stubGlobal("fetch", fetchMock);
    renderApp(["/admin/voice-assistant"], {
      user: { ...TEST_USER, is_admin: true },
      token: "admin-token",
    });
    await sendTyped("Find user Kamal");
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect((await screen.findAllByText(/Kamal Nath \(k\*\*\*@example\.com\)/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/Kamal Raj \(k\*\*\*@example\.com\)/i)).length).toBeGreaterThan(0);
    await sendTyped("Kamal Nath");
    expect((await screen.findAllByText(/Kamal Nath has a saved wallet/i)).length).toBeGreaterThan(0);
  });

  it("answers pending review counts from the admin overview API", async () => {
    const fetchMock = mockAdminVoiceFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderApp(["/admin/voice-assistant"], {
      user: { ...TEST_USER, is_admin: true },
      token: "admin-token",
    });
    await sendTyped("How many pending reviews?");
    expect((await screen.findAllByText(/There is 1 pending document review/i)).length).toBeGreaterThan(0);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/admin/overview"))).toBe(true);
    await waitFor(() => {
      expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/admin/audit/voice"))).toBe(true);
    });
    const pendingAudit = fetchMock.mock.calls.find((call) => String(call[0]).includes("/admin/audit/voice"));
    const pendingBody = JSON.parse(String(pendingAudit?.[1]?.body));
    expect(pendingBody.intent).toBe("ADMIN_PENDING_REVIEWS");
    expect(pendingBody.outcome).toBe("ok");
    expect(pendingBody.transcript).toBeUndefined();
  });

  it("refuses a citizen who asks to change another person's review status", async () => {
    const fetchMock = mockVoiceFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderAuthenticatedApp(["/voice-assistant"]);
    await sendTyped("Verify Kamal Nath's document");
    expect((await screen.findAllByText(/I can't open another person's records/i)).length).toBeGreaterThan(0);
    expect(fetchMock.mock.calls.some((call) => String(call[1]?.method ?? "GET").toUpperCase() === "PATCH")).toBe(false);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/admin/"))).toBe(false);
  });

  it("changes a review status only after two admin confirms and an audit hash", async () => {
    const fetchMock = mockAdminVoiceFetch();
    vi.stubGlobal("fetch", fetchMock);
    renderApp(["/admin/voice-assistant"], {
      user: { ...TEST_USER, is_admin: true },
      token: "admin-token",
    });
    await sendTyped("Verify Kamal Nath's document");
    expect((await screen.findAllByText(/set Kamal Nath's supporting document review status to verified/i)).length).toBeGreaterThan(0);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/admin/users"))).toBe(false);
    expect(fetchMock.mock.calls.some((call) => String(call[1]?.method ?? "GET").toUpperCase() === "PATCH")).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect((await screen.findAllByText(/Last check: change Kamal Nath's education certificate to verified/i)).length).toBeGreaterThan(0);
    expect(fetchMock.mock.calls.some((call) => String(call[1]?.method ?? "GET").toUpperCase() === "PATCH")).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          (call) => String(call[0]).includes("/admin/documents/") && String(call[1]?.method).toUpperCase() === "PATCH",
        ),
      ).toBe(true);
    });
    expect((await screen.findAllByText(/review status is now verified/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/Eligibility was not changed/i)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/school-certificate\.pdf/i)).not.toBeInTheDocument();
    const reviewAudit = fetchMock.mock.calls.find((call) => String(call[0]).includes("/admin/audit/voice"));
    const reviewBody = JSON.parse(String(reviewAudit?.[1]?.body));
    expect(reviewBody.intent).toBe("ADMIN_REVIEW_DOCUMENT");
    expect(reviewBody.outcome).toBe("ok");
    expect(reviewBody.transcript_hash).toBe(await hashTranscript("Verify Kamal Nath's document"));
    expect(reviewBody.transcript).toBeUndefined();
  });
});
