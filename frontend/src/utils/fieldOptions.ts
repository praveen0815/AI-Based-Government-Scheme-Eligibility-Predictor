import type { Messages } from "../i18n/types";
import type {
  Gender,
  MaritalStatus,
  OccupationCategory,
  SchoolBackground,
} from "../types/api";

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "transgender", label: "Transgender" },
];

export const SCHOOL_OPTIONS: { value: SchoolBackground; label: string }[] = [
  { value: "government_6_to_12", label: "Government school, Classes 6 to 12" },
  {
    value: "government_or_aided_tamil_medium_6_to_12",
    label: "Government or aided Tamil-medium school, Classes 6 to 12",
  },
  { value: "other", label: "Other school background" },
];

export const MARITAL_OPTIONS: { value: MaritalStatus; label: string }[] = [
  { value: "never_married", label: "Never married" },
  { value: "married", label: "Married" },
  { value: "widow", label: "Widow" },
  { value: "widow_remarrying", label: "Widow remarrying" },
];

export const OCCUPATION_OPTIONS: { value: OccupationCategory; label: string }[] = [
  { value: "small_marginal_farmer", label: "Small or marginal farmer" },
  { value: "agricultural_labourer", label: "Agricultural labourer" },
  { value: "inland_fishing", label: "Inland fishing" },
  { value: "plantation_labourer", label: "Plantation labourer" },
  { value: "other", label: "Other" },
];

export const YES_NO_OPTIONS = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

export function genderOptions(t: Messages): { value: Gender; label: string }[] {
  return [
    { value: "female", label: t.genderFemale },
    { value: "male", label: t.genderMale },
    { value: "transgender", label: t.genderTransgender },
  ];
}

export function schoolOptions(t: Messages): { value: SchoolBackground; label: string }[] {
  return [
    { value: "government_6_to_12", label: t.schoolGov },
    { value: "government_or_aided_tamil_medium_6_to_12", label: t.schoolAided },
    { value: "other", label: t.schoolOther },
  ];
}

export function maritalOptions(t: Messages): { value: MaritalStatus; label: string }[] {
  return [
    { value: "never_married", label: t.maritalNever },
    { value: "married", label: t.maritalMarried },
    { value: "widow", label: t.maritalWidow },
    { value: "widow_remarrying", label: t.maritalRemarrying },
  ];
}

export function occupationOptions(t: Messages): { value: OccupationCategory; label: string }[] {
  return [
    { value: "small_marginal_farmer", label: t.occupationFarmer },
    { value: "agricultural_labourer", label: t.occupationLabourer },
    { value: "inland_fishing", label: t.occupationFishing },
    { value: "plantation_labourer", label: t.occupationPlantation },
    { value: "other", label: t.occupationOther },
  ];
}

export function yesNoOptions(t: Messages) {
  return [
    { value: "true", label: t.yes },
    { value: "false", label: t.no },
  ];
}
