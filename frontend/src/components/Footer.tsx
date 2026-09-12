import { Link } from "react-router-dom";
import { BrandMark } from "./BrandMark";
import { useI18n } from "../context/LanguageContext";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto grid max-w-shell gap-10 px-4 py-12 md:grid-cols-[1.6fr_auto] md:px-8 lg:px-10">
        <div className="max-w-xl space-y-4">
          <BrandMark />
          <p className="body-copy">{t.productTagline}</p>
          <p className="text-[16px] leading-relaxed text-ink-500">{t.notOfficialService}</p>
        </div>
        <nav aria-label={t.footerNav} className="flex flex-col gap-3 text-[16px] font-semibold sm:flex-row sm:flex-wrap md:flex-col">
          <Link to="/" className="text-ink-700 transition duration-150 hover:text-action">
            {t.navHome}
          </Link>
          <Link to="/check" className="text-ink-700 transition duration-150 hover:text-action">
            {t.navCheck}
          </Link>
          <Link to="/schemes" className="text-ink-700 transition duration-150 hover:text-action">
            {t.navSchemes}
          </Link>
          <Link to="/evaluation" className="text-ink-700 transition duration-150 hover:text-action">
            {t.navEvaluation}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
