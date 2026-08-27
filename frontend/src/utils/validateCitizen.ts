import { en } from "../i18n/en";
import type { Messages } from "../i18n/types";
import type { CitizenProfile } from "../types/api";
import {
  GENDER_OPTIONS,
  MARITAL_OPTIONS,
  OCCUPATION_OPTIONS,
  SCHOOL_OPTIONS,
} from "./fieldOptions";

export interface CitizenFormValues {
  age: string;
  gender: string;
  is_student: string;
  first_higher_education_course: string;
  school_background: string;
  marital_status: string;
  is_orphan: string;
  is_destitute: string;
  occupation_category: string;
  wet_land_acres: string;
  dry_land_acres: string;
}

export type FieldErrors = Partial<Record<keyof CitizenFormValues, string>>;

export const EMPTY_FORM: CitizenFormValues = {
  age: "",
  gender: "",
  is_student: "",
  first_higher_education_course: "",
  school_background: "",
  marital_status: "",
  is_orphan: "",
  is_destitute: "",
  occupation_category: "",
  wet_land_acres: "",
  dry_land_acres: "",
};

export function profileToForm(profile: CitizenProfile): CitizenFormValues {
  return {
    age: String(profile.age),
    gender: profile.gender,
    is_student: String(profile.is_student),
    first_higher_education_course: String(profile.first_higher_education_course),
    school_background: profile.school_background,
    marital_status: profile.marital_status,
    is_orphan: String(profile.is_orphan),
    is_destitute: String(profile.is_destitute),
    occupation_category: profile.occupation_category,
    wet_land_acres: String(profile.wet_land_acres),
    dry_land_acres: String(profile.dry_land_acres),
  };
}

function parseBooleanChoice(value: string): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export function validateCitizenForm(
  values: CitizenFormValues,
  messages: Messages = en,
): {
  errors: FieldErrors;
  profile: CitizenProfile | null;
} {
  const errors: FieldErrors = {};

  if (values.age.trim() === "") {
    errors.age = messages.validationAgeRequired;
  } else {
    const age = Number(values.age);
    if (!Number.isInteger(age) || age < 0 || age > 120) {
      errors.age = messages.validationAgeRange;
    }
  }

  if (!GENDER_OPTIONS.some((option) => option.value === values.gender)) {
    errors.gender = messages.validationGender;
  }

  if (parseBooleanChoice(values.is_student) === null) {
    errors.is_student = messages.validationStudent;
  }

  if (parseBooleanChoice(values.first_higher_education_course) === null) {
    errors.first_higher_education_course = messages.validationFirstCourse;
  }

  if (!SCHOOL_OPTIONS.some((option) => option.value === values.school_background)) {
    errors.school_background = messages.validationSchool;
  }

  if (!MARITAL_OPTIONS.some((option) => option.value === values.marital_status)) {
    errors.marital_status = messages.validationMarital;
  }

  if (parseBooleanChoice(values.is_orphan) === null) {
    errors.is_orphan = messages.validationOrphan;
  }

  if (parseBooleanChoice(values.is_destitute) === null) {
    errors.is_destitute = messages.validationDestitute;
  }

  if (!OCCUPATION_OPTIONS.some((option) => option.value === values.occupation_category)) {
    errors.occupation_category = messages.validationOccupation;
  }

  if (values.wet_land_acres.trim() === "") {
    errors.wet_land_acres = messages.validationWetLand;
  } else if (Number.isNaN(Number(values.wet_land_acres)) || Number(values.wet_land_acres) < 0) {
    errors.wet_land_acres = messages.validationLandNegative;
  }

  if (values.dry_land_acres.trim() === "") {
    errors.dry_land_acres = messages.validationDryLand;
  } else if (Number.isNaN(Number(values.dry_land_acres)) || Number(values.dry_land_acres) < 0) {
    errors.dry_land_acres = messages.validationLandNegative;
  }

  if (Object.keys(errors).length > 0) {
    return { errors, profile: null };
  }

  return {
    errors,
    profile: {
      age: Number(values.age),
      gender: values.gender as CitizenProfile["gender"],
      is_student: parseBooleanChoice(values.is_student) as boolean,
      first_higher_education_course: parseBooleanChoice(
        values.first_higher_education_course,
      ) as boolean,
      school_background: values.school_background as CitizenProfile["school_background"],
      marital_status: values.marital_status as CitizenProfile["marital_status"],
      is_orphan: parseBooleanChoice(values.is_orphan) as boolean,
      is_destitute: parseBooleanChoice(values.is_destitute) as boolean,
      occupation_category: values.occupation_category as CitizenProfile["occupation_category"],
      wet_land_acres: Number(values.wet_land_acres),
      dry_land_acres: Number(values.dry_land_acres),
    },
  };
}
