import type { ReactNode } from "react";

type Tone = "brand" | "success" | "warning" | "muted";

const tones: Record<Tone, string> = {
  brand: "bg-navy-900/5 text-navy-800",
  success: "bg-emerald-50 text-success",
  warning: "bg-amber-50 text-warning",
  muted: "bg-slate-100 text-ink-500",
};

export function Badge({ tone = "brand", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[13px] font-semibold tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  );
}
