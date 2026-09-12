import type { DetectedIntent, VoiceIntent, VoiceNavigateTarget } from "./voiceIntent";

interface SkillPhrase {
  intent: VoiceIntent;
  phrase: string;
  navigateTo?: VoiceNavigateTarget;
}

const SKILL_PHRASES: SkillPhrase[] = [
  { intent: "CHECK_ELIGIBILITY", phrase: "please see if i qualify" },
  { intent: "CHECK_ELIGIBILITY", phrase: "see if i qualify" },
  { intent: "CHECK_ELIGIBILITY", phrase: "do i meet the rules" },
  { intent: "CHECK_ELIGIBILITY", phrase: "run eligibility" },
  { intent: "CHECK_ELIGIBILITY", phrase: "score my profile" },
  { intent: "CHECK_ELIGIBILITY", phrase: "can i apply for schemes" },
  { intent: "EXPLAIN_RESULT", phrase: "why this result" },
  { intent: "EXPLAIN_RESULT", phrase: "why was this recommended" },
  { intent: "EXPLAIN_RESULT", phrase: "why was this scheme chosen" },
  { intent: "EXPLAIN_RESULT", phrase: "explain the prediction" },
  { intent: "PROFILE_COMPLETENESS", phrase: "whats left to fill" },
  { intent: "PROFILE_COMPLETENESS", phrase: "what is left to fill" },
  { intent: "PROFILE_COMPLETENESS", phrase: "anything left in my form" },
  { intent: "PROFILE_COMPLETENESS", phrase: "how complete am i" },
  { intent: "DOCUMENTS_NEEDED", phrase: "which papers do i need" },
  { intent: "DOCUMENTS_NEEDED", phrase: "what should i upload" },
  { intent: "HIGHEST_BENEFIT", phrase: "which scheme pays the most" },
  { intent: "HIGHEST_BENEFIT", phrase: "best benefit" },
  { intent: "SCHEME_QUESTION", phrase: "what welfare schemes exist" },
  { intent: "NAVIGATE", phrase: "take me to my papers", navigateTo: "documents" },
  { intent: "NAVIGATE", phrase: "open my papers", navigateTo: "documents" },
  { intent: "NAVIGATE", phrase: "take me to my vault", navigateTo: "wallet" },
  { intent: "ADMIN_PENDING_REVIEWS", phrase: "how many documents are waiting" },
  { intent: "ADMIN_PENDING_REVIEWS", phrase: "any reviews waiting" },
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/[?!.,']/g, " ").replace(/\s+/g, " ").trim();
}

export function scorePhrase(text: string, phrase: string): number {
  const value = normalize(text);
  const target = normalize(phrase);
  if (!value || !target) return 0;
  if (value.includes(target)) return 1;
  const words = target.split(" ").filter((word) => word.length > 2);
  if (!words.length) return 0;
  const hits = words.filter((word) => value.includes(word)).length;
  return hits / words.length;
}

export function detectParaphraseIntent(text: string): DetectedIntent | null {
  const value = normalize(text);
  if (!value) return null;
  const byIntent = new Map<VoiceIntent, { skill: SkillPhrase; score: number }>();
  for (const skill of SKILL_PHRASES) {
    const score = scorePhrase(value, skill.phrase);
    const current = byIntent.get(skill.intent);
    if (!current || score > current.score) {
      byIntent.set(skill.intent, { skill, score });
    }
  }
  const ranked = [...byIntent.values()].sort((left, right) => right.score - left.score);
  const best = ranked[0];
  const second = ranked[1]?.score ?? 0;
  if (!best || best.score < 0.78 || best.score - second < 0.08) return null;
  return {
    intent: best.skill.intent,
    confidence: Math.min(0.9, 0.7 + best.score * 0.2),
    navigateTo: best.skill.navigateTo,
  };
}
