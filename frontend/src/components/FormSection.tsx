import type { ReactNode } from "react";

interface FormSectionProps {
  title: string;
  children: ReactNode;
}

export function FormSection({ title, children }: FormSectionProps) {
  return (
    <fieldset className="space-y-4 rounded-xl border border-line bg-canvas p-4">
      <legend className="px-1 text-base font-semibold text-ink-900">{title}</legend>
      {children}
    </fieldset>
  );
}
