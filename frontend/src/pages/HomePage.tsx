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
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/LanguageContext";
import { consumeAccountDeleted } from "../utils/authStorage";

function CivicHero() {
  return (
    <svg viewBox="0 0 420 280" className="h-auto w-full max-w-lg" role="img" aria-hidden="true">
      <rect x="0" y="0" width="420" height="280" rx="24" fill="#12243F" />
      <circle cx="352" cy="48" r="22" fill="#F8E3A3" opacity="0.9" />
      <rect x="86" y="78" width="248" height="128" rx="16" fill="#FFFFFF" />
      <rect x="114" y="108" width="52" height="64" rx="8" fill="#315CF6" opacity="0.18" />
      <rect x="184" y="108" width="52" height="64" rx="8" fill="#0F9F8F" opacity="0.2" />
      <rect x="254" y="108" width="52" height="64" rx="8" fill="#315CF6" opacity="0.12" />
      <rect x="114" y="186" width="192" height="8" rx="4" fill="#E2E8F0" />
      <circle cx="78" cy="228" r="16" fill="#C7D2FE" />
      <circle cx="112" cy="226" r="14" fill="#FDE68A" />
      <circle cx="144" cy="230" r="12" fill="#BBF7D0" />
    </svg>
  );
}

export function HomePage() {
  const { isAuthenticated } = useAuth();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const [accountDeleted] = useState(
    () => searchParams.get("accountDeleted") === "1" || consumeAccountDeleted(),
  );

  return (
    <div className="space-y-10">
      {accountDeleted ? (
        <p className="notice-success" role="status">
          {t.accountDeleted}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-[24px] bg-navy-900 px-6 py-10 text-white shadow-lift sm:px-10 sm:py-12 lg:px-14">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <p className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold uppercase tracking-[0.14em] text-sky-200">
              {t.homePrototype}
            </p>
            <h1 className="hero-title">{t.homeTitle}</h1>
            <p className="max-w-2xl font-display text-[22px] font-semibold leading-snug text-slate-100 md:text-[24px]">
              {t.homeLead}
            </p>
            <p className="max-w-2xl text-[17px] leading-relaxed text-slate-300 sm:text-[18px]">{t.homeCheckLead}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="btn-text inline-flex items-center justify-center rounded-[12px] bg-action px-6 py-3.5 text-white shadow-sm transition duration-150 hover:bg-action-hover"
                >
                  {t.homeGoToDashboard}
                </Link>
              ) : (
                <Link
                  to="/check"
                  className="btn-text inline-flex items-center justify-center rounded-[12px] bg-action px-6 py-3.5 text-white shadow-sm transition duration-150 hover:bg-action-hover"
                >
                  {t.homeStartCheck}
                </Link>
              )}
              <Link
                to={isAuthenticated ? "/check" : "/wallet"}
                className="btn-text inline-flex items-center justify-center rounded-[12px] border border-white/20 bg-white/5 px-6 py-3.5 text-white transition duration-150 hover:bg-white/10"
              >
                {isAuthenticated ? t.homeStartCheck : t.homeWallet}
              </Link>
            </div>
          </div>
          <CivicHero />
        </div>
      </section>

      <section className="card-surface grid gap-8 p-6 md:grid-cols-[1.2fr_0.8fr] md:p-8">
        <div className="space-y-4">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-action/10 text-action">
            <ClipboardIcon />
          </span>
          <h2 className="section-title">{t.homeCheckTitle}</h2>
          <p className="text-[17px] leading-relaxed text-ink-500 sm:text-[18px]">{t.homeCheckLead}</p>
          <Link
            to="/check"
            className="btn-text inline-flex items-center justify-center rounded-[12px] bg-navy-900 px-6 py-3.5 text-white shadow-sm transition duration-150 hover:bg-navy-800"
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
              <p className="text-[16px] text-ink-500 sm:text-[17px]">{t.homeSecureText}</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-indigo-50 text-action">
              <SparkIcon />
            </span>
            <div>
              <p className="text-[18px] font-semibold text-ink-900">{t.homeAiPowered}</p>
              <p className="text-[16px] text-ink-500 sm:text-[17px]">{t.homeAiPoweredText}</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-amber-50 text-warning">
              <BulbIcon />
            </span>
            <div>
              <p className="text-[18px] font-semibold text-ink-900">{t.homeExplainablePoint}</p>
              <p className="text-[16px] text-ink-500 sm:text-[17px]">{t.homeExplainablePointText}</p>
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
          <p className="mt-2 text-[16px] text-ink-500 sm:text-[17px]">{t.homeCompletePrompt}</p>
          <Link to="/wallet" className="mt-4 inline-block text-[16px] font-semibold text-action">
            {t.homeCompletePrompt}
          </Link>
        </article>
        <article className="card-surface p-6">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-indigo-50 text-action">
            <SchemesIcon />
          </span>
          <h3 className="card-title mt-4">{t.homeTotalSchemes}</h3>
          <p className="mt-2 text-[16px] text-ink-500 sm:text-[17px]">{t.homeCoreAvailable}</p>
          <Link to="/schemes" className="mt-4 inline-block text-[16px] font-semibold text-action">
            {t.homeExplore}
          </Link>
        </article>
        <article className="card-surface p-6">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-sky-50 text-navy-800">
            <HistoryIcon />
          </span>
          <h3 className="card-title mt-4">{t.homeRecentHistory}</h3>
          <p className="mt-2 text-[16px] text-ink-500 sm:text-[17px]">{t.homeRecentChecks}</p>
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
                <span className="text-navy-700">{icon}</span>
              </div>
              <h3 className="card-title mt-4">{title}</h3>
              <p className="mt-2 text-[16px] leading-relaxed text-ink-500 sm:text-[17px]">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <aside className="notice-warning" role="note">
        <p className="font-semibold text-warning">{t.researchDisclaimerHeading}</p>
        <p className="mt-1">{t.homeDisclaimer}</p>
      </aside>
    </div>
  );
}
