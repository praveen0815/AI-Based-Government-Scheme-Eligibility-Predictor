import { useI18n } from "../context/LanguageContext";

export function ResearchNotice({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();

  return (
    <aside className="notice-warning" role="note">
      <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-warning">{t.researchBadge}</p>
      {compact ? null : <p className="mt-2 text-[16px] leading-relaxed text-ink-700 sm:text-[17px]">{t.researchNotice}</p>}
    </aside>
  );
}
