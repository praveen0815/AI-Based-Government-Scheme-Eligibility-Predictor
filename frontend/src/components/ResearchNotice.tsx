import { useI18n } from "../context/LanguageContext";

export function ResearchNotice({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();

  return (
    <aside className="rounded-[14px] border border-line bg-surface px-5 py-4 shadow-card" role="note">
      <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-accent">{t.researchBadge}</p>
      {compact ? null : <p className="mt-2 text-[16px] leading-relaxed text-ink-500">{t.researchNotice}</p>}
    </aside>
  );
}
