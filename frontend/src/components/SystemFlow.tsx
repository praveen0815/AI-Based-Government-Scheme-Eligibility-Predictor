import { useI18n } from "../context/LanguageContext";

export function SystemFlow() {
  const { t } = useI18n();
  const steps = [
    t.flowOfficialInfo,
    t.flowSchemeDataset,
    t.flowRules,
    t.flowSynthetic,
    t.flowTraining,
    t.flowTree,
    t.flowHybrid,
    t.flowApi,
    t.flowPortal,
    t.flowRecommendations,
  ];

  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {steps.map((step, index) => (
        <li key={step} className="card-surface p-5">
          <p className="text-[15px] font-bold uppercase tracking-wide text-accent">{t.stepN(index + 1)}</p>
          <p className="mt-3 text-[17px] font-semibold text-ink-900">{step}</p>
        </li>
      ))}
    </ol>
  );
}
