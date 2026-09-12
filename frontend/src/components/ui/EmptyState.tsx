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
    <section className="card-surface px-8 py-12 sm:px-12 sm:py-14">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-sage text-navy-800">
          <span className="text-[24px] font-bold" aria-hidden="true">
            —
          </span>
        </div>
        <h2 className="section-title">{title}</h2>
        <p className="mt-4 body-copy">{description}</p>
        {children ? <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div> : null}
      </div>
    </section>
  );
}
