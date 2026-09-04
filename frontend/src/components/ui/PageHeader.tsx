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
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>
      ) : null}
      <h1 className="page-title">{title}</h1>
      {description ? <p className="max-w-3xl text-[17px] leading-relaxed text-ink-500 sm:text-[18px]">{description}</p> : null}
      {children}
    </header>
  );
}
