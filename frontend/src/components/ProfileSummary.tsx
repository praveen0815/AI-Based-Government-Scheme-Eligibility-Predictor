import { useI18n } from "../context/LanguageContext";
import type { CitizenProfile } from "../types/api";
import { genderOptions, schoolOptions } from "../utils/fieldOptions";
import { yesNo } from "../utils/displayLabels";
import { Button } from "./ui/Button";

function optionLabel(options: { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function ProfileSummary({
  profile,
  onEdit,
}: {
  profile: CitizenProfile;
  onEdit: () => void;
}) {
  const { t } = useI18n();

  return (
    <section className="card-surface p-6 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="card-title">{t.profileHeading}</h2>
          <p className="mt-3 text-[17px] leading-relaxed text-ink-500">
            {t.profileYears(profile.age)} · {optionLabel(genderOptions(t), profile.gender)} ·{" "}
            {t.studentColon} {yesNo(profile.is_student, t)} ·{" "}
            {optionLabel(schoolOptions(t), profile.school_background)}
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={onEdit}>
          {t.resultsEditProfile}
        </Button>
      </div>
    </section>
  );
}
