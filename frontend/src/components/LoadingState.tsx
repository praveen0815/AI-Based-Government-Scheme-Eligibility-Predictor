export function LoadingState({ message, title }: { message: string; title?: string }) {
  return (
    <div
      className="flex items-start gap-3 rounded-[12px] border border-line bg-surface px-4 py-4 shadow-card"
      role="status"
      aria-live="polite"
    >
      <span
        className="mt-0.5 h-5 w-5 motion-safe:animate-spin rounded-full border-2 border-line border-t-action"
        aria-hidden="true"
      />
      <div>
        {title ? <p className="text-[16px] font-semibold text-ink-900">{title}</p> : null}
        <p className="text-[16px] text-ink-500">{message}</p>
      </div>
    </div>
  );
}
