export function StepIndicator({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Form progress">
      {steps.map((step, index) => {
        const active = index === current;
        const done = index < current;
        return (
          <li
            key={step}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              active
                ? "bg-brand-900 text-white"
                : done
                  ? "bg-blue-50 text-brand-800"
                  : "bg-slate-100 text-ink-500"
            }`}
            aria-current={active ? "step" : undefined}
          >
            {String(index + 1).padStart(2, "0")} {step}
          </li>
        );
      })}
    </ol>
  );
}
