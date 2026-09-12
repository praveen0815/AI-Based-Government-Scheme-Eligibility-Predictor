import { Link } from "react-router-dom";
import { useI18n } from "../context/LanguageContext";
import { ShieldIcon } from "./icons";

export function BrandMark({
  compact = false,
  inverted = false,
  to = "/",
}: {
  compact?: boolean;
  inverted?: boolean;
  to?: string;
}) {
  const { t } = useI18n();
  const titleClass = inverted ? "text-white" : "text-ink-900";
  const subtitleClass = inverted ? "text-[#D5DDD8]" : "text-ink-500";

  return (
    <Link to={to} className={`flex min-w-0 items-center gap-3 ${titleClass}`}>
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] ${
          inverted ? "bg-action text-white" : "bg-navy-900 text-white"
        } shadow-sm`}
        aria-hidden="true"
      >
        <ShieldIcon />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-[20px] font-extrabold leading-tight tracking-tight">
          {t.brandName}
        </span>
        <span className={`block text-[15px] leading-snug ${subtitleClass} ${compact ? "hidden lg:block" : ""}`}>
          {t.brandSubtitle}
        </span>
      </span>
    </Link>
  );
}
