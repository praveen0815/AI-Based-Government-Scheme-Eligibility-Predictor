import { Link } from "react-router-dom";
import { useI18n } from "../context/LanguageContext";

export function NotFoundPage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-xl space-y-5 py-10 text-center">
      <div className="card-surface px-8 py-12">
        <h1 className="page-title">{t.notFoundTitle}</h1>
        <p className="mt-4 text-[18px] leading-relaxed text-ink-500">{t.notFoundLead}</p>
        <Link
          to="/"
          className="mt-6 btn-text inline-flex items-center justify-center rounded-[12px] bg-action px-6 py-3 text-white transition duration-150 hover:bg-action-hover"
        >
          {t.goHome}
        </Link>
      </div>
    </div>
  );
}
