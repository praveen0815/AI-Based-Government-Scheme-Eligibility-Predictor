import { useI18n } from "../context/LanguageContext";
import type { ProfileCompleteness } from "../types/api";
import { profileFieldLabel } from "../utils/displayLabels";
import { Button } from "./ui/Button";

export function ProfileCompletenessCard({
  completeness,
  onCompleteProfile,
}: {
  completeness: ProfileCompleteness;
  onCompleteProfile: () => void;
}) {
  const { t } = useI18n();
  const isComplete = completeness.incomplete_fields.length === 0;
  const percent = Math.min(100, Math.max(0, completeness.percentage));

  return (
    <section className="card-surface p-7 md:p-8" aria-labelledby="completeness-title">
      <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-accent">{t.completenessTitle}</p>
      <h2 id="completeness-title" className="section-title mt-3">
        {t.completenessPercent(percent)}
      </h2>
      <p className="mt-2 text-[17px] text-ink-500">
        {t.completenessFields(completeness.completed_fields, completeness.total_fields)}
      </p>
      <div
        className="mt-5 h-3 overflow-hidden rounded-full bg-canvas"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={t.completenessAria}
      >
        <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${percent}%` }} />
      </div>
      {isComplete ? (
        <p className="mt-5 text-[17px] text-ink-500">{t.completenessDone}</p>
      ) : (
        <>
          <p className="mt-5 text-[17px] text-ink-500">{t.completenessHint}</p>
          <div className="mt-5">
            <p className="text-[16px] font-semibold text-ink-900">{t.completenessMissing}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[16px] text-ink-500">
              {completeness.incomplete_fields.map((field) => (
                <li key={field}>{profileFieldLabel(field, t)}</li>
              ))}
            </ul>
          </div>
          <div className="mt-6">
            <Button type="button" onClick={onCompleteProfile}>
              {t.completeProfile}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
