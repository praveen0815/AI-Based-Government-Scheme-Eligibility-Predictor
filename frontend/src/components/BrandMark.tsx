import { Link } from "react-router-dom";
import { useI18n } from "../context/LanguageContext";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();

  return (
    <Link to="/" className="flex min-w-0 items-center gap-3 text-ink-900">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-brand-900 text-[17px] font-bold text-white shadow-sm"
        aria-hidden="true"
      >
        SW
      </span>
      <span className="min-w-0">
        <span className="block text-[18px] font-bold leading-tight tracking-tight">{t.brandName}</span>
        <span className={`block text-[13px] text-ink-500 ${compact ? "hidden lg:block" : ""}`}>
          {t.brandSubtitle}
        </span>
        {compact ? null : (
          <span className="mt-0.5 block text-[12px] font-medium uppercase tracking-[0.08em] text-accent">
            {t.researchBadge}
          </span>
        )}
      </span>
    </Link>
  );
}
