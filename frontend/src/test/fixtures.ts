import type { CitizenProfile, RecommendResponse, RecommendedScheme } from "../types/api";

export const VALID_PROFILE: CitizenProfile = {
  age: 20,
  gender: "female",
  is_student: true,
  first_higher_education_course: true,
  school_background: "government_6_to_12",
  marital_status: "never_married",
  is_orphan: false,
  is_destitute: false,
  occupation_category: "other",
  wet_land_acres: 0,
  dry_land_acres: 0,
};

export const SAMPLE_SCHEME: RecommendedScheme = {
  scheme_id: "TN-SW-001",
  scheme_name: "Moovalur Ramamirtham Ammaiyar Ninaivu Pudhumai Penn Thittam",
  department: "Social Welfare and Women Empowerment Department",
  scheme_category: "Higher education assurance",
  description: "Higher education assurance scheme.",
  prediction: "eligible",
  status_label: "Predicted eligible",
  eligible_probability: 1,
  not_eligible_probability: 0,
  reason:
    "Eligible for Pudhumai Penn because the citizen is female, is_student=True, first_higher_education_course=True, and school_background=government_6_to_12.",
  benefit: "Rs. 1,000 per month by Direct Benefit Transfer.",
  required_documents: "NEEDS VERIFICATION",
  application_method: "Online through the Penkalvi portal; girl students can apply directly",
  official_source_url: "https://www.tnsocialwelfare.tn.gov.in/en/specilisationswoman-welfare/pudhumai-penn",
  rule_result: {
    eligible: true,
    reasons: ["female", "student", "first higher education course", "government-school background"],
  },
  rule_reasons: ["female", "student", "first higher education course", "government-school background"],
  ml_prediction: "eligible",
  agreement: true,
};

export const SECOND_SCHEME: RecommendedScheme = {
  ...SAMPLE_SCHEME,
  scheme_id: "TN-SW-006",
  scheme_name: "Annai Therasa Ninaivu Marriage Assistance Scheme for Orphan Girls",
  official_source_url:
    "https://www.tnsocialwelfare.tn.gov.in/en/specilisationswoman-welfare/marriage-assistance-schemes",
};

export const THIRD_SCHEME: RecommendedScheme = {
  ...SAMPLE_SCHEME,
  scheme_id: "TN-SW-002",
  scheme_name: "Chief Minister's Girl Child Protection Scheme",
};

export function recommendResponse(schemes: RecommendedScheme[]): RecommendResponse {
  return {
    total_schemes_evaluated: 6,
    eligible_scheme_count: schemes.length,
    ranking_rule: "eligible_probability descending, then scheme_id ascending",
    recommendations: schemes,
    evaluated_schemes: [],
    disclaimer: "This is a research prototype.",
  };
}
