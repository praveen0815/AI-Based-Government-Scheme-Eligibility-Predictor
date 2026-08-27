import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BrainIcon,
  BulbIcon,
  CheckIcon,
  ClipboardIcon,
  DocumentIcon,
  HistoryIcon,
  SchemesIcon,
  SparkIcon,
  TargetIcon,
  UserIcon,
} from "../components/icons";
import { useI18n } from "../context/LanguageContext";
import { consumeAccountDeleted } from "../utils/authStorage";

function CivicHero() {
  return (
    <svg viewBox="0 0 360 220" className="h-auto w-full max-w-md" role="img" aria-hidden="true">
      <rect x="0" y="0" width="360" height="220" rx="16" fill="#EEF3FB" />
      <circle cx="300" cy="42" r="18" fill="#F8E3A3" />
      <rect x="118" y="72" width="124" height="88" rx="6" fill="#FFFFFF" stroke="#D7DEEA" />
      <rect x="148" y="92" width="28" height="36" rx="3" fill="#315CF6" opacity="0.18" />
      <rect x="186" y="92" width="28" height="36" rx="3" fill="#315CF6" opacity="0.18" />
      <path d="M118 72h124l-18-22H136L118 72Z" fill="#172554" />
      <circle cx="180" cy="58" r="8" fill="#FF9933" />
      <rect x="176" y="38" width="8" height="20" fill="#138808" />
      <circle cx="70" cy="168" r="18" fill="#C7D2FE" />
      <circle cx="98" cy="164" r="16" fill="#FDE68A" />
      <circle cx="126" cy="170" r="14" fill="#BBF7D0" />
      <rect x="52" y="184" width="92" height="18" rx="9" fill="#172554" opacity="0.12" />
    </svg>
  );
}

export function HomePage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const [accountDeleted] = useState(
    () => searchParams.get("accountDeleted") === "1" || consumeAccountDeleted(),
  );

  return (
    <div className="space-y-10">
      {accountDeleted ? (
        <p className="rounded-[12px] border border-line bg-teal-50 px-4 py-3 font-medium text-accent" role="status">
          {t.accountDeleted}
        </p>
      ) : null}
      <section className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <h1 className="page-title">{t.homeTitle}</h1>
          <p className="text-[22px] font-semibold text-ink-900 md:text-[24px]">{t.homeLead}</p>
          <p className="max-w-2xl text-[17px] leading-relaxed text-ink-500">{t.homeCheckLead}</p>
        </div>
        <CivicHero />
      </section>

      <section className="card-surface grid gap-8 p-6 md:grid-cols-[1.2fr_0.8fr] md:p-8">
        <div className="space-y-4">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-action/10 text-action">
            <ClipboardIcon />
          </span>
          <h2 className="section-title">{t.homeCheckTitle}</h2>
          <p className="text-[17px] leading-relaxed text-ink-500">{t.homeCheckLead}</p>
          <Link
            to="/check"
            className="btn-text inline-flex items-center justify-center rounded-[12px] bg-action px-6 py-3.5 text-white shadow-sm transition duration-150 hover:bg-action-hover"
          >
            {t.homeStartCheck}
          </Link>
        </div>
        <ul className="space-y-4">
          <li className="flex gap-3">
            <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-emerald-50 text-accent">
              <CheckIcon />
            </span>
            <div>
              <p className="text-[18px] font-semibold text-ink-900">{t.homeSecure}</p>
              <p className="text-[16px] text-ink-500">{t.homeSecureText}</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-violet-50 text-violet-600">
              <SparkIcon />
            </span>
            <div>
              <p className="text-[18px] font-semibold text-ink-900">{t.homeAiPowered}</p>
              <p className="text-[16px] text-ink-500">{t.homeAiPoweredText}</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-amber-50 text-warning">
              <BulbIcon />
            </span>
            <div>
              <p className="text-[18px] font-semibold text-ink-900">{t.homeExplainablePoint}</p>
              <p className="text-[16px] text-ink-500">{t.homeExplainablePointText}</p>
            </div>
          </li>
        </ul>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <article className="card-surface p-6">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-emerald-50 text-accent">
            <UserIcon />
          </span>
          <h3 className="card-title mt-4">{t.completenessTitle}</h3>
          <p className="mt-2 text-[16px] text-ink-500">{t.homeCompletePrompt}</p>
          <Link to="/wallet" className="mt-4 inline-block text-[16px] font-semibold text-action">
            {t.homeCompletePrompt}
          </Link>
        </article>
        <article className="card-surface p-6">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-violet-50 text-violet-600">
            <SchemesIcon />
          </span>
          <h3 className="card-title mt-4">{t.homeTotalSchemes}</h3>
          <p className="mt-2 text-[16px] text-ink-500">{t.homeCoreAvailable}</p>
          <Link to="/schemes" className="mt-4 inline-block text-[16px] font-semibold text-action">
            {t.homeExplore}
          </Link>
        </article>
        <article className="card-surface p-6">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-blue-50 text-action">
            <HistoryIcon />
          </span>
          <h3 className="card-title mt-4">{t.homeRecentHistory}</h3>
          <p className="mt-2 text-[16px] text-ink-500">{t.homeRecentChecks}</p>
          <Link to="/history" className="mt-4 inline-block text-[16px] font-semibold text-action">
            {t.homeViewHistory}
          </Link>
        </article>
      </section>

      <section aria-labelledby="how-it-works" className="space-y-6">
        <h2 id="how-it-works" className="section-title">
          {t.howItWorks}
        </h2>
        <ol className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["01", t.howStep1Title, t.howStep1Text, <UserIcon key="1" />],
            ["02", t.howStep2Title, t.howStep2Text, <BrainIcon key="2" />],
            ["03", t.howStep3Title, t.howStep3Text, <TargetIcon key="3" />],
            ["04", t.howStep4Title, t.howStep4Text, <DocumentIcon key="4" />],
          ].map(([step, title, text, icon]) => (
            <li key={String(step)} className="card-surface p-6">
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-bold text-action">{step}</p>
                <span className="text-ink-500">{icon}</span>
              </div>
              <h3 className="card-title mt-4">{title}</h3>
              <p className="mt-2 text-[16px] leading-relaxed text-ink-500">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <aside className="rounded-[14px] border border-amber-200 bg-amber-50 px-5 py-4 text-[16px] leading-relaxed text-ink-700" role="note">
        <p className="font-semibold text-warning">{t.researchDisclaimerHeading}</p>
        <p className="mt-1">{t.homeDisclaimer}</p>
      </aside>
    </div>
  );
}
