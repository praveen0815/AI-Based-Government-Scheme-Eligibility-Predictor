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
    <svg viewBox="0 0 460 300" className="h-auto w-full max-w-lg" role="img" aria-hidden="true">
      <rect x="0" y="0" width="460" height="300" rx="28" fill="#0F4D3A" />
      <rect x="28" y="28" width="404" height="52" rx="16" fill="#0A2E24" />
      <circle cx="58" cy="54" r="10" fill="#C49A4A" />
      <rect x="80" y="44" width="120" height="10" rx="5" fill="#DDE3DE" />
      <rect x="80" y="60" width="72" height="8" rx="4" fill="#66736D" />
      <rect x="48" y="104" width="118" height="156" rx="18" fill="#FFFFFF" />
      <rect x="68" y="124" width="78" height="10" rx="5" fill="#0F4D3A" />
      <rect x="68" y="148" width="78" height="8" rx="4" fill="#DDE3DE" />
      <rect x="68" y="168" width="54" height="8" rx="4" fill="#DDE3DE" />
      <rect x="68" y="208" width="78" height="28" rx="8" fill="#176B52" />
      <rect x="182" y="104" width="230" height="72" rx="18" fill="#FFFFFF" />
      <rect x="202" y="124" width="88" height="10" rx="5" fill="#C49A4A" />
      <rect x="202" y="146" width="150" height="8" rx="4" fill="#DDE3DE" />
      <rect x="182" y="192" width="110" height="68" rx="16" fill="#FFFFFF" />
      <rect x="314" y="192" width="98" height="68" rx="16" fill="#FFFFFF" />
      <circle cx="400" cy="56" r="16" fill="#E8D5A3" />
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
    <div className="page-stack">
      {accountDeleted ? (
        <p className="notice-success" role="status">
          {t.accountDeleted}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-[28px] bg-navy-900 px-6 py-12 text-white shadow-lift sm:px-10 sm:py-14 lg:px-14">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-7">
            <p className="inline-flex rounded-full bg-white/10 px-4 py-1.5 text-[15px] font-semibold uppercase tracking-[0.14em] text-[#E4D4A8]">
              {t.homePrototype}
            </p>
            <h1 className="hero-title">{t.homeTitle}</h1>
            <p className="max-w-2xl font-display text-[22px] font-semibold leading-snug text-[#F7F6F1] md:text-[26px]">
              {t.homeLead}
            </p>
            <p className="max-w-2xl text-[17px] leading-relaxed text-[#D8E0DB] sm:text-[18px]">{t.homeCheckLead}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              {isAuthenticated ? (
                <Link to="/dashboard" className="chip-link-primary min-h-12 px-7 py-4">
                  {t.homeGoToDashboard}
                </Link>
              ) : (
                <Link to="/check" className="chip-link-primary min-h-12 px-7 py-4">
                  {t.homeStartCheck}
                </Link>
              )}
              <Link
                to={isAuthenticated ? "/check" : "/wallet"}
                className="btn-text inline-flex min-h-12 items-center justify-center rounded-[12px] border border-white/20 bg-white/5 px-7 py-4 text-white transition duration-150 hover:bg-white/10"
              >
                {isAuthenticated ? t.homeStartCheck : t.homeWallet}
              </Link>
            </div>
          </div>
          <CivicHero />
        </div>
      </section>

      <section className="card-surface grid gap-8 p-7 md:grid-cols-[1.2fr_0.8fr] md:p-10">
        <div className="space-y-5">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-[16px] bg-action/10 text-action">
            <ClipboardIcon />
          </span>
          <h2 className="section-title">{t.homeCheckTitle}</h2>
          <p className="body-copy">{t.homeCheckLead}</p>
          <Link to="/check" className="chip-link-primary bg-navy-900 hover:bg-navy-800">
            {t.homeStartCheck}
          </Link>
        </div>
        <ul className="space-y-5">
          <li className="flex gap-4">
            <span className="mt-0.5 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-emerald-50 text-accent">
              <CheckIcon />
            </span>
            <div>
              <p className="text-[20px] font-semibold text-ink-900">{t.homeSecure}</p>
              <p className="mt-1 text-[16px] leading-relaxed text-ink-500 sm:text-[17px]">{t.homeSecureText}</p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="mt-0.5 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-sage text-action">
              <SparkIcon />
            </span>
            <div>
              <p className="text-[20px] font-semibold text-ink-900">{t.homeAiPowered}</p>
              <p className="mt-1 text-[16px] leading-relaxed text-ink-500 sm:text-[17px]">{t.homeAiPoweredText}</p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="mt-0.5 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-amber-50 text-warning">
              <BulbIcon />
            </span>
            <div>
              <p className="text-[20px] font-semibold text-ink-900">{t.homeExplainablePoint}</p>
              <p className="mt-1 text-[16px] leading-relaxed text-ink-500 sm:text-[17px]">{t.homeExplainablePointText}</p>
            </div>
          </li>
        </ul>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <article className="card-surface p-7">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-emerald-50 text-accent">
            <UserIcon />
          </span>
          <h3 className="card-title mt-5">{t.completenessTitle}</h3>
          <p className="mt-3 text-[16px] leading-relaxed text-ink-500 sm:text-[17px]">{t.homeCompletePrompt}</p>
          <Link to="/wallet" className="soft-link mt-5 inline-block">
            {t.homeCompletePrompt}
          </Link>
        </article>
        <article className="card-surface p-7">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-sage text-action">
            <SchemesIcon />
          </span>
          <h3 className="card-title mt-5">{t.homeTotalSchemes}</h3>
          <p className="mt-3 text-[16px] leading-relaxed text-ink-500 sm:text-[17px]">{t.homeCoreAvailable}</p>
          <Link to="/schemes" className="soft-link mt-5 inline-block">
            {t.homeExplore}
          </Link>
        </article>
        <article className="card-surface p-7">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-sage text-navy-800">
            <HistoryIcon />
          </span>
          <h3 className="card-title mt-5">{t.homeRecentHistory}</h3>
          <p className="mt-3 text-[16px] leading-relaxed text-ink-500 sm:text-[17px]">{t.homeRecentChecks}</p>
          <Link to="/history" className="soft-link mt-5 inline-block">
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
            <li key={String(step)} className="card-surface p-7">
              <div className="flex items-center justify-between">
                <p className="text-[16px] font-bold text-action">{step}</p>
                <span className="text-navy-700">{icon}</span>
              </div>
              <h3 className="card-title mt-5">{title}</h3>
              <p className="mt-3 text-[16px] leading-relaxed text-ink-500 sm:text-[17px]">{text}</p>
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
