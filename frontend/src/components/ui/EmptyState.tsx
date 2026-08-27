import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="card-surface p-8 sm:p-10">
      <h2 className="section-title">{title}</h2>
      <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-ink-500">{description}</p>
      {children ? <div className="mt-7 flex flex-wrap gap-3">{children}</div> : null}
    </section>
  );
}
