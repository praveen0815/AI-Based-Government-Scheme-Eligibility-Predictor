import type { Language, Messages } from "../i18n/types";
import type { CitizenProfile } from "../types/api";
import {
  genderOptions,
  maritalOptions,
  occupationOptions,
  schoolOptions,
} from "./fieldOptions";

function labelFrom(options: { value: string; label: string }[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function yesNo(value: boolean, t?: Messages): string {
  if (!t) return value ? "Yes" : "No";
  return value ? t.yes : t.no;
}

export interface WalletSummaryRow {
  label: string;
  value: string;
}

export interface WalletSummaryGroup {
  title: string;
  rows: WalletSummaryRow[];
}

export function walletSummaryRows(profile: CitizenProfile, t: Messages): WalletSummaryRow[] {
  return walletSummaryGroups(profile, t).flatMap((group) => group.rows);
}

export function profileFieldLabel(field: string, t: Messages): string {
  const labels: Record<string, string> = {
    age: t.fieldAge,
    gender: t.fieldGender,
    is_student: t.labelStudent,
    first_higher_education_course: t.labelFirstCourse,
    school_background: t.labelSchool,
    marital_status: t.fieldMarital,
    is_orphan: t.labelOrphan,
    is_destitute: t.labelDestitute,
    occupation_category: t.fieldOccupation,
    wet_land_acres: t.labelWetLand,
    dry_land_acres: t.labelDryLand,
  };
  return labels[field] ?? field;
}

export function formatCheckedAt(value: string, language: Language = "en"): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString(language === "ta" ? "ta-IN" : "en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function walletSummaryGroups(profile: CitizenProfile, t: Messages): WalletSummaryGroup[] {
  return [
    {
      title: t.groupPersonal,
      rows: [
        { label: t.fieldAge, value: String(profile.age) },
        { label: t.fieldGender, value: labelFrom(genderOptions(t), profile.gender) },
      ],
    },
    {
      title: t.groupEducation,
      rows: [
        { label: t.labelStudent, value: yesNo(profile.is_student, t) },
        { label: t.labelFirstCourse, value: yesNo(profile.first_higher_education_course, t) },
        { label: t.labelSchool, value: labelFrom(schoolOptions(t), profile.school_background) },
      ],
    },
    {
      title: t.groupFamily,
      rows: [
        { label: t.fieldMarital, value: labelFrom(maritalOptions(t), profile.marital_status) },
        { label: t.labelOrphan, value: yesNo(profile.is_orphan, t) },
        { label: t.labelDestitute, value: yesNo(profile.is_destitute, t) },
      ],
    },
    {
      title: t.groupOccupation,
      rows: [
        { label: t.fieldOccupation, value: labelFrom(occupationOptions(t), profile.occupation_category) },
        { label: t.labelWetLand, value: t.acres(String(profile.wet_land_acres)) },
        { label: t.labelDryLand, value: t.acres(String(profile.dry_land_acres)) },
      ],
    },
  ];
}
