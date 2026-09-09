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
            className={`rounded-full px-4 py-2 text-[15px] font-semibold ${
              active
                ? "bg-navy-900 text-white"
                : done
                  ? "bg-sage text-navy-800"
                  : "bg-[#EEF1ED] text-ink-500"
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
