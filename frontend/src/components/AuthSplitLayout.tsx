import type { ReactNode } from "react";
import { useI18n } from "../context/LanguageContext";
import { GovernmentEmblem } from "./GovernmentEmblem";

export function MailGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.2" stroke="#8A97AB" strokeWidth="1.7" />
      <path d="m5 8 7 5 7-5" stroke="#8A97AB" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LockGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2.2" stroke="#8A97AB" strokeWidth="1.7" />
      <path d="M8 10V8a4 4 0 0 1 8 0v2" stroke="#8A97AB" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function EyeGlyph({ off = false }: { off?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.8 12S6.5 5.8 12 5.8 21.2 12 21.2 12 17.5 18.2 12 18.2 2.8 12 2.8 12Z"
        stroke="#8A97AB"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="12" r="2.6" stroke="#8A97AB" strokeWidth="1.7" />
      {off ? <path d="M5 19 19 5" stroke="#8A97AB" strokeWidth="1.7" strokeLinecap="round" /> : null}
    </svg>
  );
}

export function UserGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" stroke="#8A97AB" strokeWidth="1.7" />
      <path d="M5 19a7 7 0 0 1 14 0" stroke="#8A97AB" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function PhoneGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8.2 3.8h7.6A2.2 2.2 0 0 1 18 6v12a2.2 2.2 0 0 1-2.2 2.2H8.2A2.2 2.2 0 0 1 6 18V6A2.2 2.2 0 0 1 8.2 3.8Z"
        stroke="#8A97AB"
        strokeWidth="1.7"
      />
      <path d="M10 5.6h4M12 17.6h.01" stroke="#8A97AB" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function FeatureIcon({ tone, children }: { tone: "teal" | "violet" | "amber" | "blue"; children: ReactNode }) {
  const tones = {
    teal: "bg-[#E6F7F3] text-[#0F9D8A]",
    violet: "bg-[#EEE8FF] text-[#6D4CFF]",
    amber: "bg-[#FFF3E0] text-[#F59E0B]",
    blue: "bg-[#E8F1FF] text-[#2F6BFF]",
  };
  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tones[tone]}`}>{children}</span>
  );
}

function AuthBrand() {
  const { t } = useI18n();
  return (
    <div className="login-brand">
      <GovernmentEmblem className="h-11 w-11" />
      <div>
        <p className="login-brand-title">{t.loginBrandName}</p>
        <p className="login-brand-sub">{t.loginBrandSubtitle}</p>
      </div>
    </div>
  );
}

function AuthHero() {
  const { t } = useI18n();
  const features = [
    {
      tone: "teal" as const,
      title: t.loginFeatureRecommendTitle,
      text: t.loginFeatureRecommendText,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="16" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4.5 18a4.5 4.5 0 0 1 9 0M13.2 18a3.8 3.8 0 0 1 6.3-2.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      tone: "violet" as const,
      title: t.loginFeatureExplainTitle,
      text: t.loginFeatureExplainText,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3 5 6v6c0 4.2 2.8 7.2 7 9 4.2-1.8 7-4.8 7-9V6l-7-3Z" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      ),
    },
    {
      tone: "amber" as const,
      title: t.loginFeatureTrackTitle,
      text: t.loginFeatureTrackText,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 3h8l5 5v13H7V3Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M15 3v6h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      tone: "blue" as const,
      title: t.loginFeatureVoiceTitle,
      text: t.loginFeatureVoiceText,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="9" y="4" width="6" height="10" rx="3" stroke="currentColor" strokeWidth="1.8" />
          <path d="M6 12a6 6 0 0 0 12 0M12 18v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <section className="login-hero" aria-label={t.loginHeroTitle}>
      <img className="login-hero-art" src="/login-civic-hero.png" alt="" />
      <div className="login-hero-copy">
        <p className="login-hero-eyebrow">{t.loginHeroEyebrow}</p>
        <h2 className="login-hero-title">{t.loginHeroTitle}</h2>
        <p className="login-hero-lead">{t.loginHeroLead}</p>
        <ul className="login-features">
          {features.map((feature) => (
            <li key={feature.title}>
              <FeatureIcon tone={feature.tone}>{feature.icon}</FeatureIcon>
              <div>
                <p className="login-feature-title">{feature.title}</p>
                <p className="login-feature-text">{feature.text}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="login-hero-footer">{t.loginHeroFooter}</p>
      </div>
    </section>
  );
}

export function AuthSplitLayout({
  cardLabel,
  tall = false,
  children,
}: {
  cardLabel: string;
  tall?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="login-stage">
      <div className={`login-canvas${tall ? " login-canvas-tall" : ""}`}>
        <section className={`login-card${tall ? " login-card-tall" : ""}`} aria-label={cardLabel}>
          <AuthBrand />
          {children}
        </section>
        <AuthHero />
      </div>
    </div>
  );
}
