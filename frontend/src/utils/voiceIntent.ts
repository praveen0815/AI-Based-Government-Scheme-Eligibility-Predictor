import type { CitizenProfile, DocumentReviewStatus } from "../types/api";
import { extractProfileFields } from "./voiceProfileExtract";
import { detectParaphraseIntent } from "./voiceNlu";

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
  | "WHO_ARE_YOU"
  | "HELP"
  | "GREET"
  | "ADMIN_LOOKUP_USER"
  | "ADMIN_USER_SUMMARY"
  | "ADMIN_USER_DOCUMENTS"
  | "ADMIN_PENDING_REVIEWS"
  | "ADMIN_NAVIGATE"
  | "ADMIN_REVIEW_DOCUMENT"
  | "UNSUPPORTED";

export type AdminNavigateTarget = "users" | "documents" | "eligibility" | "overview";
export type AdminLookupKind = "lookup" | "summary" | "documents";

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
  personQuery?: string;
  adminNavigateTo?: AdminNavigateTarget;
  adminKind?: AdminLookupKind;
  reviewStatus?: DocumentReviewStatus;
  documentCategory?: string;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[?!.,]/g, " ").replace(/\s+/g, " ").trim();
}

function cleanPersonQuery(raw: string): string {
  return raw
    .replace(/\b(user|the|please|record|profile|details|summary|account)\b/g, " ")
    .replace(/['’]s\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const RESERVED_SHOW_WORDS = new Set([
  "my",
  "the",
  "our",
  "wallet",
  "history",
  "documents",
  "schemes",
  "catalog",
  "dashboard",
  "applications",
  "insights",
  "compare",
  "results",
  "recommendations",
  "users",
]);

function reviewStatusFromText(value: string): DocumentReviewStatus | null {
  if (/(reject|deny|நிராகரி)/.test(value)) return "rejected";
  if (/(verify|verif|approve|accept|சரிபார்)/.test(value) || /as verified|to verified|status to verified/.test(value)) {
    return "verified";
  }
  if (/as pending|to pending|mark.*pending/.test(value)) return "pending";
  return null;
}

function documentCategoryFromText(value: string): string | undefined {
  if (/education|school|கல்வி/.test(value)) return "education_certificate";
  if (/income|வருமான/.test(value)) return "income_certificate";
  if (/community|சாதி/.test(value)) return "community_certificate";
  if (/address|முகவரி/.test(value)) return "address_proof";
  if (/identity|அடையாள/.test(value)) return "identity_proof_demo";
  return undefined;
}

export function detectAdminReviewIntent(text: string): DetectedIntent | null {
  const raw = text.trim();
  const value = normalize(raw);
  if (!value) return null;
  if (!/(document|upload|certificate|ஆவண|சான்றிதழ்)/.test(value)) return null;
  if (!/(verify|verif|approve|accept|reject|deny|mark|set|change|update|சரிபார்|நிராகரி)/.test(value)) {
    return null;
  }
  const reviewStatus = reviewStatusFromText(value);
  if (!reviewStatus) return null;

  const matched =
    raw.match(
      /^(?:verify|approve|accept|reject|deny|சரிபார்|நிராகரி) (?:the )?(?:pending )?(.+?)(?:['’]s)? (?:pending )?(?:education |income |community |address |identity )?(?:supporting )?(?:document|upload|certificate|ஆவண|சான்றிதழ்)/i,
    ) ||
    raw.match(
      /^(?:mark|set|change|update) (.+?)(?:['’]s)? (?:pending )?(?:education |income |community |address )?(?:document|upload|certificate|review).*(?:as|to) /i,
    ) ||
    raw.match(/(?:document|upload|certificate|ஆவண) (?:for|of) (.+)$/i);
  const personQuery = cleanPersonQuery(matched?.[1] ?? "")
    .replace(/\b(pending|education|income|community|address|identity|supporting)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!personQuery || RESERVED_SHOW_WORDS.has(personQuery.toLowerCase())) return null;
  return {
    intent: "ADMIN_REVIEW_DOCUMENT",
    confidence: 0.94,
    personQuery,
    adminKind: "documents",
    reviewStatus,
    documentCategory: documentCategoryFromText(value),
  };
}

export function detectAdminVoiceIntent(text: string): DetectedIntent | null {
  const raw = text.trim();
  const value = normalize(raw);
  if (!value) return null;

  const reviewIntent = detectAdminReviewIntent(raw);
  if (reviewIntent) return reviewIntent;

  if (/how many pending|pending (document )?reviews|pending reviews|how many documents are waiting/.test(value)) {
    return { intent: "ADMIN_PENDING_REVIEWS", confidence: 0.94 };
  }
  if (/^open users$|^go to users$|^show users$|open (the )?users page/.test(value)) {
    return { intent: "ADMIN_NAVIGATE", confidence: 0.93, adminNavigateTo: "users" };
  }
  if (/open (the )?admin documents|go to document review|open document review/.test(value)) {
    return { intent: "ADMIN_NAVIGATE", confidence: 0.93, adminNavigateTo: "documents" };
  }
  if (/open (the )?eligibility (page|monitoring)|go to eligibility monitoring/.test(value)) {
    return { intent: "ADMIN_NAVIGATE", confidence: 0.93, adminNavigateTo: "eligibility" };
  }
  if (/^open (the )?admin( console| overview)?$|^go to admin( overview)?$/.test(value)) {
    return { intent: "ADMIN_NAVIGATE", confidence: 0.9, adminNavigateTo: "overview" };
  }

  const documentMatch =
    raw.match(/^(?:show|open|get|list|fetch) (.+?) documents?$/i) ||
    raw.match(/^(?:show|open|get|list) documents? (?:for|of) (.+)$/i) ||
    raw.match(/^(.+?) documents?$/i);
  if (documentMatch) {
    const personQuery = cleanPersonQuery(documentMatch[1]);
    if (personQuery && !RESERVED_SHOW_WORDS.has(personQuery.toLowerCase())) {
      return { intent: "ADMIN_USER_DOCUMENTS", confidence: 0.93, personQuery, adminKind: "documents" };
    }
  }

  const summaryMatch =
    raw.match(/^(?:summarize|summarise) (.+)$/i) ||
    raw.match(/^(?:show|open|get) (.+?) (?:profile|details|summary|record)$/i);
  if (summaryMatch) {
    const personQuery = cleanPersonQuery(summaryMatch[1]);
    if (personQuery && !RESERVED_SHOW_WORDS.has(personQuery.toLowerCase())) {
      return { intent: "ADMIN_USER_SUMMARY", confidence: 0.92, personQuery, adminKind: "summary" };
    }
  }

  const findMatch = raw.match(/^(?:find|look up|lookup|search)(?: user)? (.+)$/i) || raw.match(/^show user (.+)$/i);
  if (findMatch) {
    const personQuery = cleanPersonQuery(findMatch[1]);
    if (personQuery) {
      return { intent: "ADMIN_LOOKUP_USER", confidence: 0.92, personQuery, adminKind: "lookup" };
    }
  }

  const showPerson = raw.match(
    /^show ([a-zA-Z\u0b80-\u0bff][a-zA-Z.\u0b80-\u0bff]*(?: [a-zA-Z\u0b80-\u0bff][a-zA-Z.\u0b80-\u0bff]*){0,3})$/i,
  );
  if (showPerson) {
    const personQuery = cleanPersonQuery(showPerson[1]);
    if (personQuery && !RESERVED_SHOW_WORDS.has(personQuery.toLowerCase())) {
      return { intent: "ADMIN_LOOKUP_USER", confidence: 0.8, personQuery, adminKind: "lookup" };
    }
  }

  return null;
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
    /who are you|what's your name|what is your name|who is nira|who is neera|introduce yourself|நீங்கள் யார்|உன் பெயர்|உங்கள் பெயர்|நிரா யார்/.test(
      value,
    )
  ) {
    return { intent: "WHO_ARE_YOU", confidence: 0.96 };
  }
  if (
    /^(help|help me)$|what can you (do|help)|how can you help|what do you (do|help)|show help|what can you help with|நீங்கள் எதில் உதவ|என்ன செய்ய முடியும்/.test(
      value,
    )
  ) {
    return { intent: "HELP", confidence: 0.95 };
  }
  if (/^(hi|hello|hey|namaste|vanakkam|வணக்கம்|ஹாய்)( nira| neera| நிரா)?$/.test(value)) {
    return { intent: "GREET", confidence: 0.9 };
  }

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
  if (
    /^(open|show|go to) (my )?documents$/.test(value) ||
    /open my documents|show my documents|go to my documents|என் ஆவண/.test(value)
  ) {
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

  const adminIntent = detectAdminVoiceIntent(raw);
  if (adminIntent) {
    return adminIntent;
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

  const paraphrase = detectParaphraseIntent(raw);
  if (paraphrase) return paraphrase;

  return { intent: "UNSUPPORTED", confidence: 0.4 };
}
