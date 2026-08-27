import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="space-y-4">
      {eyebrow ? (
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-accent">{eyebrow}</p>
      ) : null}
      <h1 className="page-title">{title}</h1>
      {description ? <p className="max-w-2xl text-[18px] leading-relaxed text-ink-500">{description}</p> : null}
      {children}
    </header>
  );
}
