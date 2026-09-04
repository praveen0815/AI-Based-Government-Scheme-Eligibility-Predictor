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
    <section className="card-surface px-8 py-10 sm:px-10 sm:py-12">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-navy-900/5 text-navy-800">
          <span className="text-[22px] font-bold" aria-hidden="true">
            —
          </span>
        </div>
        <h2 className="section-title">{title}</h2>
        <p className="mt-3 text-[17px] leading-relaxed text-ink-500 sm:text-[18px]">{description}</p>
        {children ? <div className="mt-7 flex flex-wrap justify-center gap-3">{children}</div> : null}
      </div>
    </section>
  );
}
