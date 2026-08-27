export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card-surface p-6 md:p-7">
      <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-500">{label}</p>
      <p className="mt-3 text-[32px] font-extrabold tracking-tight text-ink-900 md:text-[36px]">{value}</p>
      {hint ? <p className="mt-2 text-[15px] text-ink-500">{hint}</p> : null}
    </div>
  );
}
