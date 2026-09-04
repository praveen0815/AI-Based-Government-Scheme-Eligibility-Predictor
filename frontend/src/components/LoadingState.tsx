export function LoadingState({ message, title }: { message: string; title?: string }) {
  return (
    <div
      className="flex items-start gap-4 rounded-[16px] border border-line bg-surface px-5 py-5 shadow-card"
      role="status"
      aria-live="polite"
    >
      <span
        className="mt-0.5 h-6 w-6 motion-safe:animate-spin rounded-full border-2 border-line border-t-action"
        aria-hidden="true"
      />
      <div>
        {title ? <p className="font-display text-[18px] font-semibold text-ink-900">{title}</p> : null}
        <p className="text-[16px] leading-relaxed text-ink-500 sm:text-[17px]">{message}</p>
      </div>
    </div>
  );
}
