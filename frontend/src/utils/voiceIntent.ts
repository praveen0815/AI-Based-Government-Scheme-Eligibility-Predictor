import type { CitizenProfile } from "../types/api";
import { extractProfileFields } from "./voiceProfileExtract";

export type VoiceIntent =
  | "CHECK_ELIGIBILITY"
  | "EXPLAIN_RESULT"
  | "PROFILE_COMPLETENESS"
  | "SCHEME_QUESTION"
  | "NAVIGATE"
  | "UPDATE_PROFILE"
  | "WHAT_IF"
  | "DOCUMENTS_NEEDED"
  | "HIGHEST_BENEFIT"
  | "UNSUPPORTED";

export type VoiceNavigateTarget =
  | "wallet"
  | "results"
  | "history"
  | "schemes"
  | "documents"
  | "insights"
  | "dashboard"
  | "simulator"
  | "applications"
  | "compare";

export interface DetectedIntent {
  intent: VoiceIntent;
  confidence: number;
  navigateTo?: VoiceNavigateTarget;
  studentFocus?: boolean;
  extracted?: Partial<CitizenProfile>;
  unsupportedMentions?: string[];
  followUp?: "CHECK_ELIGIBILITY";
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[?!.,]/g, " ").replace(/\s+/g, " ").trim();
}

export function isIncomeWhatIf(text: string): boolean {
  const value = normalize(text);
  if (!value) return false;
  return (
    /what if i earn (more|less)/.test(value) ||
    /what if my income is (higher|lower|more|less)/.test(value) ||
    /(what happens if|what if).*(income|salary)/.test(value) ||
    /how does income affect/.test(value) ||
    /will my eligib.*income/.test(value) ||
    /check eligib.*different income/.test(value) ||
    /(income|salary).*(change|affect).*(eligib)?/.test(value) ||
    /வருமானம் (மாறி|அதிக|குறை)|சம்பளம் மாறி/.test(value)
  );
}

export function detectVoiceIntent(text: string): DetectedIntent {
  const raw = text.trim();
  if (!raw) {
    return { intent: "UNSUPPORTED", confidence: 0 };
  }
  const value = normalize(raw);
  const extracted = extractProfileFields(raw);
  const hasFields = Object.keys(extracted.fields).length > 0;

  if (
    /open (my )?wallet|show (my )?wallet|go to (my )?wallet|என் பணப்பை|பணப்பையை/.test(value)
  ) {
    return { intent: "NAVIGATE", confidence: 0.95, navigateTo: "wallet" };
  }
  if (
    /show (my )?(recommended|recommendation)|open (my )?recommendations|பரிந்துரை/.test(value) &&
    !/check|தகுதி|eligible|eligib/.test(value)
  ) {
    return { intent: "NAVIGATE", confidence: 0.93, navigateTo: "results" };
  }
  if (/show (my )?history|open (my )?history|go to (my )?history|வரலாறு/.test(value)) {
    return { intent: "NAVIGATE", confidence: 0.93, navigateTo: "history" };
  }
  if (/open (the )?(eligibility )?simulator|go to (the )?simulator|உருவகப்படுத்தியை/.test(value)) {
    return { intent: "NAVIGATE", confidence: 0.95, navigateTo: "simulator" };
  }
  if (/open (my )?applications|go to applications|show (my )?applications|விண்ணப்பங்களை/.test(value)) {
    return { intent: "NAVIGATE", confidence: 0.93, navigateTo: "applications" };
  }
  if (/compare (these |the )?schemes|open compare|go to compare|ஒப்பிடு/.test(value)) {
    return { intent: "NAVIGATE", confidence: 0.93, navigateTo: "compare" };
  }
  if (/open (my )?documents|go to documents|show (my )?documents|ஆவண/.test(value)) {
    return { intent: "NAVIGATE", confidence: 0.93, navigateTo: "documents" };
  }
  if (/go to insights|open (my )?insights|show (my )?insights|நுண்ணறிவு/.test(value)) {
    return { intent: "NAVIGATE", confidence: 0.93, navigateTo: "insights" };
  }
  if (/open (the )?schemes|show (the )?catalog|திட்டப் பட்டியல்/.test(value)) {
    return { intent: "NAVIGATE", confidence: 0.9, navigateTo: "schemes" };
  }
  if (/open (my )?dashboard|go to (my )?dashboard|முகப்புப் பலகை|முகப்பு பலகை/.test(value)) {
    return { intent: "NAVIGATE", confidence: 0.9, navigateTo: "dashboard" };
  }

  if (isIncomeWhatIf(value)) {
    return { intent: "WHAT_IF", confidence: 0.94 };
  }
  if (
    /what documents do i need|documents? (do i|needed|required)|தேவையான ஆவண/.test(value) &&
    !/open|go to|show (my )?documents/.test(value)
  ) {
    return { intent: "DOCUMENTS_NEEDED", confidence: 0.93 };
  }
  if (/highest benefit|most benefit|which one (gives|has) the (highest|most)|அதிக பயன்/.test(value)) {
    return { intent: "HIGHEST_BENEFIT", confidence: 0.92 };
  }

  if (
    /why (am i|i am|i'm)|why not eligible|ஏன்/.test(value) &&
    /eligib|தகுதி|scheme|திட்ட/.test(value)
  ) {
    return { intent: "EXPLAIN_RESULT", confidence: 0.94 };
  }

  if (
    /missing|incomplete|what information|is my profile complete|profile complete|விடுபட்ட|முழுமையற்ற|சுயவிவரம் முழு/.test(
      value,
    )
  ) {
    return { intent: "PROFILE_COMPLETENESS", confidence: 0.94 };
  }

  const eligibilityAsked =
    /am i eligible|check (my )?eligib|check what schemes|which schemes (can i get|am i|i am)|what schemes (am i eligible|i can get)|schemes i can get|eligible for|can i get|தகுதியை|தகுதி சரி|நான் தகுதி/.test(
      value,
    );
  if (eligibilityAsked) {
    return {
      intent: "CHECK_ELIGIBILITY",
      confidence: 0.98,
      extracted: hasFields ? extracted.fields : undefined,
      unsupportedMentions: extracted.unsupportedMentions,
      followUp: hasFields ? "CHECK_ELIGIBILITY" : undefined,
    };
  }

  if (
    /tell me about (this |the )?scheme|explain (this |the )?scheme|what schemes|schemes? (are )?available|available schemes|schemes for|மாணவ.*திட்ட|எந்தத் திட்ட/.test(
      value,
    ) ||
    (/scheme|திட்ட/.test(value) && /student|மாணவ/.test(value) && !/eligib|தகுதி/.test(value))
  ) {
    return {
      intent: "SCHEME_QUESTION",
      confidence: 0.88,
      studentFocus: /student|மாணவ/.test(value),
    };
  }

  if (hasFields) {
    return {
      intent: "UPDATE_PROFILE",
      confidence: 0.9,
      extracted: extracted.fields,
      unsupportedMentions: extracted.unsupportedMentions,
    };
  }

  if (extracted.unsupportedMentions.length > 0) {
    return {
      intent: "UNSUPPORTED",
      confidence: 0.7,
      unsupportedMentions: extracted.unsupportedMentions,
    };
  }

  return { intent: "UNSUPPORTED", confidence: 0.4 };
}
