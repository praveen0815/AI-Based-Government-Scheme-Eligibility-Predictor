import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/LanguageContext";
import { useRecommendation } from "../context/RecommendationContext";
import {
  CapIcon,
  CheckIcon,
  DashboardIcon,
  EvaluationIcon,
  DocumentIcon,
  HistoryIcon,
  HomeIcon,
  InsightsIcon,
  ReadinessIcon,
  UploadIcon,
  LoginIcon,
  LogoutIcon,
  RegisterIcon,
  SchemesIcon,
  ShieldIcon,
  UserIcon,
  WalletIcon,
} from "./icons";
import { LanguageSwitcher } from "./LanguageSwitcher";

const itemClass = ({ isActive }: { isActive: boolean }) =>
  [
    "flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[16px] font-medium transition duration-150",
    isActive ? "bg-[#E8F0FE] text-action" : "text-ink-700 hover:bg-canvas",
  ].join(" ");

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { isAuthenticated, user, logout } = useAuth();
  const { clearResult } = useRecommendation();
  const { t } = useI18n();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    clearResult();
    onClose();
    navigate("/");
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-ink-900/20 transition-opacity lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[292px] flex-col border-r border-line bg-white text-ink-900 transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-accent text-white">
            <ShieldIcon />
          </span>
          <div>
            <p className="text-[16px] font-extrabold tracking-[0.06em] text-brand-900">{t.brandName.toUpperCase()}</p>
            <p className="text-[13px] text-ink-500">{t.sidebarTagline}</p>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-4">
          <nav aria-label={t.mainNav} className="space-y-1">
            <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">{t.mainNav}</p>
            <NavLink to="/" className={itemClass} end onClick={onClose}>
              <HomeIcon />
              {t.navHome}
            </NavLink>
            <NavLink to="/check" className={itemClass} onClick={onClose}>
              <CheckIcon />
              {t.navCheck}
            </NavLink>
            <NavLink to="/schemes" className={itemClass} onClick={onClose}>
              <SchemesIcon />
              {t.navSchemes}
            </NavLink>
            <NavLink to="/evaluation" className={itemClass} onClick={onClose}>
              <EvaluationIcon />
              {t.navEvaluation}
            </NavLink>
          </nav>

          <nav aria-label={t.navSectionAccount} className="space-y-1 border-t border-line pt-5">
            <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">
              {t.navSectionAccount}
            </p>
            <NavLink to="/dashboard" className={itemClass} onClick={onClose}>
              <DashboardIcon />
              {t.navDashboard}
            </NavLink>
            <NavLink to="/wallet" className={itemClass} onClick={onClose}>
              <WalletIcon className="text-accent" />
              {t.navWallet}
            </NavLink>
            <NavLink to="/history" className={itemClass} onClick={onClose}>
              <HistoryIcon />
              {t.navHistory}
            </NavLink>
            <NavLink to="/documents" className={itemClass} onClick={onClose}>
              <DocumentIcon />
              {t.navDocuments}
            </NavLink>
            <NavLink to="/insights" className={itemClass} onClick={onClose}>
              <InsightsIcon />
              {t.navInsights}
            </NavLink>
            <NavLink to="/readiness" className={itemClass} onClick={onClose}>
              <ReadinessIcon />
              {t.navReadiness}
            </NavLink>
            <NavLink to="/uploads" className={itemClass} onClick={onClose}>
              <UploadIcon />
              {t.navUploads}
            </NavLink>
            <NavLink to="/account" className={itemClass} onClick={onClose}>
              <UserIcon />
              {t.navAccount}
            </NavLink>
          </nav>

          <div className="space-y-2 border-t border-line pt-5">
            <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">
              {t.navSectionPreferences}
            </p>
            <LanguageSwitcher variant="sidebar" />
          </div>

          <div className="space-y-2 border-t border-line pt-5">
            <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">
              {t.navSectionAuth}
            </p>
            {isAuthenticated ? (
              <>
                <p className="truncate px-3 text-[14px] text-ink-500">{user?.full_name || user?.email}</p>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-[12px] border border-line px-3 py-2.5 text-left text-[16px] font-medium text-ink-700 hover:bg-canvas"
                >
                  <LogoutIcon />
                  {t.navLogout}
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-[12px] border border-action px-3 py-2.5 text-[16px] font-semibold text-action hover:bg-[#E8F0FE]"
                >
                  <LoginIcon />
                  {t.navLogin}
                </NavLink>
                <NavLink
                  to="/register"
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-[12px] border border-accent px-3 py-2.5 text-[16px] font-semibold text-accent hover:bg-teal-50"
                >
                  <RegisterIcon />
                  {t.navRegister}
                </NavLink>
              </>
            )}
          </div>
        </div>

        <div className="m-4 rounded-[14px] bg-[#F4F7FB] px-4 py-4">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#E8F0FE] text-action">
            <CapIcon />
          </div>
          <p className="text-[13px] font-semibold text-ink-900">{t.researchBadge}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-500">{t.notOfficialService}</p>
        </div>
      </aside>
    </>
  );
}
