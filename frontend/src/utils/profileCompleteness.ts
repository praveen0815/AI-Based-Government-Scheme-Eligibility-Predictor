import type { CitizenProfile } from "../types/api";

export const PROFILE_COMPLETENESS_FIELDS = [
  "age",
  "gender",
  "is_student",
  "first_higher_education_course",
  "school_background",
  "marital_status",
  "is_orphan",
  "is_destitute",
  "occupation_category",
  "wet_land_acres",
  "dry_land_acres",
] as const;

export function isProfileFieldCompleted(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  return true;
}

export function incompleteProfileFields(profile: CitizenProfile | null | undefined): string[] {
  if (!profile) return [];
  return PROFILE_COMPLETENESS_FIELDS.filter((field) => !isProfileFieldCompleted(profile[field]));
}
