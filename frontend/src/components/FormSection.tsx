import type { ReactNode } from "react";

interface FormSectionProps {
  title: string;
  children: ReactNode;
}

export function FormSection({ title, children }: FormSectionProps) {
  return (
    <fieldset className="space-y-5 rounded-[16px] border border-line bg-sage p-5">
      <legend className="px-1 text-[18px] font-semibold text-ink-900">{title}</legend>
      {children}
    </fieldset>
  );
}
