export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card-surface p-6 md:p-7">
      <p className="text-[15px] font-semibold uppercase tracking-[0.08em] text-ink-500">{label}</p>
      <p className="mt-3 font-display text-[34px] font-extrabold tracking-tight text-ink-900 md:text-[38px]">{value}</p>
      {hint ? <p className="mt-3 text-[16px] leading-relaxed text-ink-500">{hint}</p> : null}
    </div>
  );
}
