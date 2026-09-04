import type { FormEvent, ReactNode } from "react";
import { useI18n } from "../context/LanguageContext";
import {
  genderOptions,
  maritalOptions,
  occupationOptions,
  schoolOptions,
} from "../utils/fieldOptions";
import {
  type CitizenFormValues,
  type FieldErrors,
} from "../utils/validateCitizen";
import { BooleanField } from "./BooleanField";
import { FormField } from "./FormField";
import { SelectField } from "./SelectField";
import { Button } from "./ui/Button";

interface CitizenFormProps {
  values: CitizenFormValues;
  errors: FieldErrors;
  loading: boolean;
  submitLabel: string;
  children?: ReactNode;
  onChange: <K extends keyof CitizenFormValues>(field: K, value: CitizenFormValues[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onErrors: (errors: FieldErrors) => void;
  onReset?: () => void;
}

export function CitizenForm({
  values,
  errors,
  loading,
  submitLabel,
  children,
  onChange,
  onSubmit,
  onReset,
}: CitizenFormProps) {
  const { t } = useI18n();
  const sections = [
    { title: t.sectionPersonal, short: t.sectionPersonalShort, fields: ["age", "gender"] as const },
    {
      title: t.sectionEducation,
      short: t.sectionEducationShort,
      fields: ["is_student", "first_higher_education_course", "school_background"] as const,
    },
    {
      title: t.sectionFamily,
      short: t.sectionFamilyShort,
      fields: ["marital_status", "is_orphan", "is_destitute"] as const,
    },
    {
      title: t.sectionOccupation,
      short: t.sectionOccupationShort,
      fields: ["occupation_category", "wet_land_acres", "dry_land_acres"] as const,
    },
  ];
  const completed = sections.filter((section) =>
    section.fields.every((field) => String(values[field]).trim() !== ""),
  ).length;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <div className="card-surface p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[16px] font-semibold text-ink-900">
            {t.formProgress(completed, sections.length)}
          </p>
          <p className="text-[15px] text-ink-500">{t.formProgressHint}</p>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${(completed / sections.length) * 100}%` }}
          />
        </div>
        <ol className="mt-5 grid gap-2 sm:grid-cols-4">
          {sections.map((section, index) => (
            <li
              key={section.title}
              className={`rounded-[12px] px-3 py-2.5 text-[14px] font-semibold ${
                completed > index ? "bg-brand-900 text-white" : "bg-canvas text-ink-500"
              }`}
            >
              {String(index + 1).padStart(2, "0")} {section.short}
            </li>
          ))}
        </ol>
      </div>

      <section className="card-surface p-7 sm:p-9" aria-labelledby="personal-heading">
        <p className="text-[15px] font-bold text-accent">01 · {t.sectionPersonalShort}</p>
        <h2 id="personal-heading" className="section-title mt-2">
          {t.sectionPersonal}
        </h2>
        <p className="mt-2 text-[17px] text-ink-500">{t.sectionPersonalHint}</p>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <FormField id="age" label={t.fieldAge} error={errors.age} required hint={t.fieldAgeHint}>
            <input
              id="age"
              name="age"
              type="number"
              inputMode="numeric"
              min={0}
              max={120}
              required
              aria-required="true"
              value={values.age}
              onChange={(event) => onChange("age", event.target.value)}
              aria-invalid={Boolean(errors.age)}
              className="field-input"
            />
          </FormField>
          <SelectField
            id="gender"
            label={t.fieldGender}
            hint={t.fieldGenderHint}
            value={values.gender}
            error={errors.gender}
            options={genderOptions(t)}
            placeholder={t.fieldGenderPlaceholder}
            required
            onChange={(value) => onChange("gender", value)}
          />
        </div>
      </section>

      <section className="card-surface p-7 sm:p-9" aria-labelledby="education-heading">
        <p className="text-[15px] font-bold text-accent">02</p>
        <h2 id="education-heading" className="section-title mt-2">
          {t.sectionEducation}
        </h2>
        <p className="mt-2 text-[17px] text-ink-500">{t.sectionEducationHint}</p>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <BooleanField
            id="is_student"
            label={t.fieldStudent}
            value={values.is_student}
            error={errors.is_student}
            onChange={(value) => onChange("is_student", value)}
          />
          <BooleanField
            id="first_higher_education_course"
            label={t.fieldFirstCourse}
            value={values.first_higher_education_course}
            error={errors.first_higher_education_course}
            onChange={(value) => onChange("first_higher_education_course", value)}
          />
          <div className="md:col-span-2">
            <SelectField
              id="school_background"
              label={t.fieldSchool}
              hint={t.fieldSchoolHint}
              value={values.school_background}
              error={errors.school_background}
              options={schoolOptions(t)}
              placeholder={t.fieldSchoolPlaceholder}
              required
              onChange={(value) => onChange("school_background", value)}
            />
          </div>
        </div>
      </section>

      <section className="card-surface p-7 sm:p-9" aria-labelledby="family-heading">
        <p className="text-[15px] font-bold text-accent">03</p>
        <h2 id="family-heading" className="section-title mt-2">
          {t.sectionFamily}
        </h2>
        <p className="mt-2 text-[17px] text-ink-500">{t.sectionFamilyHint}</p>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <SelectField
            id="marital_status"
            label={t.fieldMarital}
            value={values.marital_status}
            error={errors.marital_status}
            options={maritalOptions(t)}
            placeholder={t.fieldMaritalPlaceholder}
            required
            onChange={(value) => onChange("marital_status", value)}
          />
          <BooleanField
            id="is_orphan"
            label={t.fieldOrphan}
            value={values.is_orphan}
            error={errors.is_orphan}
            onChange={(value) => onChange("is_orphan", value)}
          />
          <div className="md:col-span-2">
            <BooleanField
              id="is_destitute"
              label={t.fieldDestitute}
              hint={t.fieldDestituteHint}
              value={values.is_destitute}
              error={errors.is_destitute}
              onChange={(value) => onChange("is_destitute", value)}
            />
          </div>
        </div>
      </section>

      <section className="card-surface p-7 sm:p-9" aria-labelledby="occupation-heading">
        <p className="text-[15px] font-bold text-accent">04</p>
        <h2 id="occupation-heading" className="section-title mt-2">
          {t.sectionOccupation}
        </h2>
        <p className="mt-2 text-[17px] text-ink-500">{t.sectionOccupationHint}</p>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <SelectField
              id="occupation_category"
              label={t.fieldOccupation}
              value={values.occupation_category}
              error={errors.occupation_category}
              options={occupationOptions(t)}
              placeholder={t.fieldOccupationPlaceholder}
              required
              onChange={(value) => onChange("occupation_category", value)}
            />
          </div>
          <FormField
            id="wet_land_acres"
            label={t.fieldWetLand}
            hint={t.fieldWetLandHint}
            error={errors.wet_land_acres}
            required
          >
            <input
              id="wet_land_acres"
              name="wet_land_acres"
              type="number"
              min={0}
              step="0.01"
              required
              aria-required="true"
              value={values.wet_land_acres}
              onChange={(event) => onChange("wet_land_acres", event.target.value)}
              aria-invalid={Boolean(errors.wet_land_acres)}
              className="field-input"
            />
          </FormField>
          <FormField
            id="dry_land_acres"
            label={t.fieldDryLand}
            hint={t.fieldDryLandHint}
            error={errors.dry_land_acres}
            required
          >
            <input
              id="dry_land_acres"
              name="dry_land_acres"
              type="number"
              min={0}
              step="0.01"
              required
              aria-required="true"
              value={values.dry_land_acres}
              onChange={(event) => onChange("dry_land_acres", event.target.value)}
              aria-invalid={Boolean(errors.dry_land_acres)}
              className="field-input"
            />
          </FormField>
        </div>
      </section>

      {children}

      <div className="card-surface flex flex-col-reverse gap-3 p-5 sm:flex-row sm:justify-end sm:p-6">
        {onReset ? (
          <Button type="button" variant="secondary" onClick={onReset}>
            {t.reset}
          </Button>
        ) : null}
        <Button type="submit" disabled={loading} className="sm:min-w-56">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
