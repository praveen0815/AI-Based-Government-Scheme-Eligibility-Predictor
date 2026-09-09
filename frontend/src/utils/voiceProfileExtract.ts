import type { CitizenProfile } from "../types/api";

export interface ProfileExtraction {
  fields: Partial<CitizenProfile>;
  unsupportedMentions: string[];
}

export function extractProfileFields(text: string): ProfileExtraction {
  const value = text.toLowerCase();
  const fields: Partial<CitizenProfile> = {};
  const unsupportedMentions: string[] = [];

  const ageMatch =
    value.match(/(?:age(?:\s+is)?|i am|i'm|வயது)\s+(\d{1,3})/) ??
    value.match(/(\d{1,3})\s*(?:year|years|yrs|வயது)/);
  if (ageMatch) {
    const age = Number(ageMatch[1]);
    if (Number.isInteger(age) && age >= 0 && age <= 120) {
      fields.age = age;
    }
  }

  if (/\bnot a student\b|மாணவர் அல்ல/.test(value)) {
    fields.is_student = false;
  } else if (/\bstudent\b|மாணவ/.test(value)) {
    fields.is_student = true;
  }

  if (/\bfemale\b|\bwoman\b|\bgirl\b|பெண்/.test(value)) {
    fields.gender = "female";
  } else if (/\btransgender\b|திருநங்கை/.test(value)) {
    fields.gender = "transgender";
  } else if (/\bmale\b|\bman\b|\bboy\b|ஆண்/.test(value)) {
    fields.gender = "male";
  }

  if (/agricultural labour|agricultural labor|வேளாண் தொழிலாளர்/.test(value)) {
    fields.occupation_category = "agricultural_labourer";
  } else if (/plantation/.test(value)) {
    fields.occupation_category = "plantation_labourer";
  } else if (/fishing|மீன்/.test(value)) {
    fields.occupation_category = "inland_fishing";
  } else if (/\bfarmer\b|விவசாய/.test(value)) {
    fields.occupation_category = "small_marginal_farmer";
  }

  if (/widow remarry|widow remarrying/.test(value)) {
    fields.marital_status = "widow_remarrying";
  } else if (/\bwidow\b/.test(value)) {
    fields.marital_status = "widow";
  } else if (/never married|unmarried/.test(value)) {
    fields.marital_status = "never_married";
  } else if (/\bmarried\b/.test(value)) {
    fields.marital_status = "married";
  }

  if (/\borphan\b/.test(value)) {
    fields.is_orphan = true;
  }
  if (/\bdestitute\b/.test(value)) {
    fields.is_destitute = true;
  }

  if (/income|lakh|salary|வருமான/.test(value)) {
    unsupportedMentions.push("income");
  }
  if (/(tamil nadu|தமிழ்நாடு)/.test(value) && /(live|from|in |வசி)/.test(value)) {
    unsupportedMentions.push("state");
  }

  return { fields, unsupportedMentions };
}
