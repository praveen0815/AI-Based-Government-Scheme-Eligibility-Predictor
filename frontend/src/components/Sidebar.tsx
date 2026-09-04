import { NavLink } from "react-router-dom";
import { useI18n } from "../context/LanguageContext";
import { BrandMark } from "./BrandMark";
import {
  BellIcon,
  BrainIcon,
  CapIcon,
  CheckIcon,
  CompareIcon,
  DashboardIcon,
  DocumentIcon,
  EvaluationIcon,
  HistoryIcon,
  InsightsIcon,
  ReadinessIcon,
  SchemesIcon,
  SettingsIcon,
  UploadIcon,
  WalletIcon,
} from "./icons";
import { LanguageSwitcher } from "./LanguageSwitcher";

const itemClass = ({ isActive }: { isActive: boolean }) =>
  [
    "flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[16px] font-medium transition duration-150",
    isActive ? "bg-action text-white shadow-sm" : "text-slate-200 hover:bg-white/10 hover:text-white",
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
        className={`fixed inset-0 z-30 bg-navy-950/50 transition-opacity lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[292px] flex-col bg-navy-900 text-white transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="border-b border-white/10 px-5 py-6">
          <BrandMark inverted />
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
          <nav aria-label={t.mainNav} className="space-y-1">
            <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              {t.mainNav}
            </p>
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
          </nav>

          <nav aria-label={t.navSectionResearch} className="space-y-1 border-t border-white/10 pt-5">
            <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              {t.navSectionResearch}
            </p>
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
          </nav>

          <nav aria-label={t.navSectionAccount} className="space-y-1 border-t border-white/10 pt-5">
            <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              {t.navSectionAccount}
            </p>
            <NavLink to="/uploads" className={itemClass} onClick={onClose}>
              <UploadIcon />
              {t.navUploads}
            </NavLink>
            <NavLink to="/settings" className={itemClass} onClick={onClose}>
              <SettingsIcon />
              {t.navSettings}
            </NavLink>
          </nav>

          <div className="space-y-2 border-t border-white/10 pt-5">
            <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              {t.navSectionPreferences}
            </p>
            <LanguageSwitcher variant="sidebar" />
          </div>
        </div>

        <div className="m-4 rounded-[14px] bg-navy-800 px-4 py-4">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-action/20 text-sky-200">
            <CapIcon />
          </div>
          <p className="text-[13px] font-semibold text-white">{t.researchBadge}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-300">{t.notOfficialService}</p>
        </div>
      </aside>
    </>
  );
}
