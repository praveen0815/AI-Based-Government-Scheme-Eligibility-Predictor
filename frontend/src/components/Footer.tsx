import { Link } from "react-router-dom";
import { BrandMark } from "./BrandMark";
import { useI18n } from "../context/LanguageContext";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto grid max-w-shell gap-10 px-4 py-14 md:grid-cols-[1.5fr_auto] md:px-6">
        <div className="max-w-xl space-y-4">
          <BrandMark />
          <p className="text-[17px] leading-relaxed text-ink-500">{t.productTagline}</p>
          <p className="text-[15px] leading-relaxed text-ink-500">{t.researchNotice}</p>
        </div>
        <nav aria-label={t.footerNav} className="flex flex-col gap-3 text-[16px] sm:flex-row sm:flex-wrap md:flex-col">
          <Link to="/" className="font-semibold text-ink-700 transition duration-150 hover:text-action">
            {t.navHome}
          </Link>
          <Link to="/check" className="font-semibold text-ink-700 transition duration-150 hover:text-action">
            {t.navCheck}
          </Link>
          <Link to="/schemes" className="font-semibold text-ink-700 transition duration-150 hover:text-action">
            {t.navSchemes}
          </Link>
          <Link to="/evaluation" className="font-semibold text-ink-700 transition duration-150 hover:text-action">
            {t.navEvaluation}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
