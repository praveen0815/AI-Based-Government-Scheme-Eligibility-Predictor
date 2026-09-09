import { NavLink } from "react-router-dom";
import { useI18n } from "../context/LanguageContext";
import { BrandMark } from "./BrandMark";
import {
  BellIcon,
  BrainIcon,
  CapIcon,
  CheckIcon,
  ClipboardIcon,
  CompareIcon,
  DashboardIcon,
  DocumentIcon,
  EvaluationIcon,
  HistoryIcon,
  InsightsIcon,
  MicIcon,
  ReadinessIcon,
  SchemesIcon,
  SettingsIcon,
  SparkIcon,
  UploadIcon,
  WalletIcon,
} from "./icons";
import { LanguageSwitcher } from "./LanguageSwitcher";

const itemClass = ({ isActive }: { isActive: boolean }) =>
  [
    "flex items-center gap-3 rounded-[12px] border-l-[3px] px-3 py-3 text-[16px] font-semibold transition duration-150",
    isActive
      ? "border-l-accent bg-white/12 text-white shadow-sm"
      : "border-l-transparent text-[#D5DDD8] hover:bg-white/8 hover:text-white",
  ].join(" ");

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-navy-950/55 transition-opacity lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[300px] flex-col bg-navy-900 pt-1 text-white transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="border-b border-white/10 px-5 py-6">
          <BrandMark inverted />
        </div>

        <div className="flex-1 space-y-7 overflow-y-auto px-4 py-6">
          <nav aria-label={t.mainNav} className="space-y-1.5">
            <p className="nav-label px-3 pb-2">{t.mainNav}</p>
            <NavLink to="/dashboard" className={itemClass} onClick={onClose}>
              <DashboardIcon />
              {t.navDashboard}
            </NavLink>
            <NavLink to="/wallet" className={itemClass} onClick={onClose}>
              <WalletIcon />
              {t.navWallet}
            </NavLink>
            <NavLink to="/check" className={itemClass} onClick={onClose}>
              <CheckIcon />
              {t.navCheck}
            </NavLink>
            <NavLink to="/history" className={itemClass} onClick={onClose}>
              <HistoryIcon />
              {t.navHistory}
            </NavLink>
            <NavLink to="/compare" className={itemClass} onClick={onClose}>
              <CompareIcon />
              {t.navCompare}
            </NavLink>
            <NavLink to="/eligibility-simulator" className={itemClass} onClick={onClose}>
              <SparkIcon />
              {t.navSimulator}
            </NavLink>
            <NavLink to="/applications" className={itemClass} onClick={onClose}>
              <ClipboardIcon />
              {t.navApplications}
            </NavLink>
            <NavLink to="/documents" className={itemClass} onClick={onClose}>
              <DocumentIcon />
              {t.navDocuments}
            </NavLink>
            <NavLink to="/readiness" className={itemClass} onClick={onClose}>
              <ReadinessIcon />
              {t.navReadiness}
            </NavLink>
            <NavLink to="/insights" className={itemClass} onClick={onClose}>
              <InsightsIcon />
              {t.navInsights}
            </NavLink>
            <NavLink to="/notifications" className={itemClass} onClick={onClose}>
              <BellIcon />
              {t.navNotifications}
            </NavLink>
            <NavLink to="/voice-assistant" className={itemClass} onClick={onClose}>
              <MicIcon />
              {t.navVoiceAssistant}
            </NavLink>
          </nav>

          <nav aria-label={t.navSectionResearch} className="space-y-1.5 border-t border-white/10 pt-6">
            <p className="nav-label px-3 pb-2">{t.navSectionResearch}</p>
            <NavLink to="/schemes" className={itemClass} onClick={onClose}>
              <SchemesIcon />
              {t.navSchemes}
            </NavLink>
            <NavLink to="/evaluation" className={itemClass} onClick={onClose}>
              <EvaluationIcon />
              {t.navEvaluation}
            </NavLink>
            <NavLink to="/system-evaluation" className={itemClass} onClick={onClose}>
              <BrainIcon />
              {t.navSystemEvaluation}
            </NavLink>
            <NavLink to="/research-dashboard" className={itemClass} onClick={onClose}>
              <EvaluationIcon />
              {t.navResearchDashboard}
            </NavLink>
          </nav>

          <nav aria-label={t.navSectionAccount} className="space-y-1.5 border-t border-white/10 pt-6">
            <p className="nav-label px-3 pb-2">{t.navSectionAccount}</p>
            <NavLink to="/uploads" className={itemClass} onClick={onClose}>
              <UploadIcon />
              {t.navUploads}
            </NavLink>
            <NavLink to="/settings" className={itemClass} onClick={onClose}>
              <SettingsIcon />
              {t.navSettings}
            </NavLink>
          </nav>

          <div className="space-y-3 border-t border-white/10 pt-6">
            <p className="nav-label px-3">{t.navSectionPreferences}</p>
            <LanguageSwitcher variant="sidebar" />
          </div>
        </div>

        <div className="m-4 rounded-[16px] border border-white/10 bg-navy-800 px-4 py-4">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-action/20 text-[#E4D4A8]">
            <CapIcon />
          </div>
          <p className="text-[16px] font-semibold text-white">{t.researchBadge}</p>
          <p className="mt-2 text-[15px] leading-relaxed text-[#D5DDD8]">{t.notOfficialService}</p>
        </div>
      </aside>
    </>
  );
}
