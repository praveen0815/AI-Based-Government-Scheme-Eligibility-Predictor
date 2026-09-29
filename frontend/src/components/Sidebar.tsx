import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCitizenTheme } from "../context/CitizenThemeContext";
import { useI18n } from "../context/LanguageContext";
import { BrandMark } from "./BrandMark";
import {
  CapIcon,
  CheckIcon,
  ClipboardIcon,
  CompareIcon,
  DashboardIcon,
  DocumentIcon,
  ScanIcon,
  ChatIcon,
  EvaluationIcon,
  HistoryIcon,
  InsightsIcon,
  SchemesIcon,
  SettingsIcon,
  SparkIcon,
  UploadIcon,
  UserIcon,
  WalletIcon,
} from "./icons";

const itemClass = ({ isActive }: { isActive: boolean }) =>
  [
    "citizen-sidebar-link flex items-center gap-3 px-3 py-3 text-[16px] font-semibold transition duration-150",
    isActive ? "citizen-sidebar-link-active" : "citizen-sidebar-link-idle",
  ].join(" ");

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { theme } = useCitizenTheme();
  const { pathname, hash } = useLocation();
  const onAccount = pathname === "/settings" && hash !== "#account-security";
  const onSettings = pathname === "/settings" && hash === "#account-security";

  return (
    <>
      <div
        className={`citizen-sidebar-backdrop fixed inset-0 z-30 transition-opacity lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`citizen-sidebar fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col pt-1 transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="citizen-sidebar-brand px-5 py-6">
          <BrandMark inverted={theme === "dark"} />
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
            <NavLink to="/document-scanner" className={itemClass} onClick={onClose}>
              <ScanIcon />
              {t.navDocumentScanner}
            </NavLink>
            <NavLink to="/insights" className={itemClass} onClick={onClose}>
              <InsightsIcon />
              {t.navHighlights}
            </NavLink>
            <NavLink to="/history" className={itemClass} onClick={onClose}>
              <HistoryIcon />
              {t.navHistory}
            </NavLink>
            <NavLink to="/scheme-assistant" className={itemClass} onClick={onClose}>
              <ChatIcon />
              {t.navSchemeAssistant}
            </NavLink>
          </nav>

          {user?.is_admin ? (
            <nav aria-label={t.navAdminPortal} className="citizen-sidebar-group space-y-1.5 pt-6">
              <p className="nav-label px-3 pb-2">{t.adminNav}</p>
              <NavLink to="/admin" className={itemClass} onClick={onClose}>
                <EvaluationIcon />
                {t.navAdminPortal}
              </NavLink>
            </nav>
          ) : null}

          <nav aria-label={t.navSectionResearch} className="citizen-sidebar-group space-y-1.5 pt-6">
            <p className="nav-label px-3 pb-2">{t.navSectionResearch}</p>
            <NavLink to="/schemes" className={itemClass} onClick={onClose}>
              <SchemesIcon />
              {t.navSchemes}
            </NavLink>
            <NavLink to="/evaluation" className={itemClass} onClick={onClose}>
              <EvaluationIcon />
              {t.navEvaluation}
            </NavLink>
          </nav>

          <nav aria-label={t.navSectionAuth} className="citizen-sidebar-group space-y-1.5 pt-6">
            <p className="nav-label px-3 pb-2">{t.navSectionAuth}</p>
            <NavLink
              to="/settings"
              className={() => itemClass({ isActive: onAccount })}
              onClick={onClose}
            >
              <UserIcon />
              {t.navSectionAccount}
            </NavLink>
            <NavLink to="/uploads" className={itemClass} onClick={onClose}>
              <UploadIcon />
              {t.navUploads}
            </NavLink>
            <NavLink
              to="/settings#account-security"
              className={() => itemClass({ isActive: onSettings })}
              onClick={onClose}
            >
              <SettingsIcon />
              {t.navSettings}
            </NavLink>
          </nav>
        </div>

        <div className="citizen-sidebar-note m-4 rounded-[16px] px-4 py-4">
          <div className="citizen-sidebar-note-icon mb-3 flex h-10 w-10 items-center justify-center rounded-full">
            <CapIcon />
          </div>
          <p className="text-[16px] font-semibold">{t.researchBadge}</p>
          <p className="mt-2 text-[15px] leading-relaxed">{t.notOfficialService}</p>
        </div>
      </aside>
    </>
  );
}
