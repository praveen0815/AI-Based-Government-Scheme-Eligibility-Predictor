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
        <p className="text-[15px] font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>
      ) : null}
      <h1 className="page-title">{title}</h1>
      {description ? <p className="max-w-3xl body-copy">{description}</p> : null}
      {children}
    </header>
  );
}
