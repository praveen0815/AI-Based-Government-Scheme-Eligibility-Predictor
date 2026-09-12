import type { ReactNode } from "react";

type Tone = "brand" | "success" | "warning" | "muted" | "danger";

const tones: Record<Tone, string> = {
  brand: "bg-sage text-navy-800",
  success: "bg-emerald-50 text-success",
  warning: "bg-amber-50 text-warning",
  muted: "bg-[#EEF1ED] text-ink-700",
  danger: "bg-red-50 text-red-800",
};

export function Badge({ tone = "brand", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex rounded-full px-3.5 py-1.5 text-[15px] font-semibold tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  );
}
