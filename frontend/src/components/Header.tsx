import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { BrandMark } from "./BrandMark";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Button } from "./ui/Button";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/LanguageContext";
import { useRecommendation } from "../context/RecommendationContext";

const publicNavClass = ({ isActive }: { isActive: boolean }) =>
  [
    "rounded-[10px] px-3 py-2 text-[15px] font-semibold transition duration-150",
    isActive ? "bg-canvas text-brand-900" : "text-ink-500 hover:bg-canvas hover:text-ink-900",
  ].join(" ");

const accountNavClass = ({ isActive }: { isActive: boolean }) =>
  [
    "rounded-[10px] px-3 py-2 text-[15px] font-semibold transition duration-150",
    isActive ? "bg-brand-900/5 text-brand-900" : "text-ink-500 hover:bg-canvas hover:text-ink-900",
  ].join(" ");

export function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const { clearResult } = useRecommendation();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function handleLogout() {
    logout();
    clearResult();
    setOpen(false);
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur-md">
      <div className="relative mx-auto flex max-w-shell items-center gap-3 px-4 py-3.5 md:px-6">
        <BrandMark compact />
        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <LanguageSwitcher />
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-line text-ink-900 transition duration-150 hover:bg-canvas"
            aria-label={open ? t.closeMenu : t.openMenu}
            aria-expanded={open}
            aria-controls="main-nav"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
        <div
          className={`${open ? "flex" : "hidden"} absolute left-0 right-0 top-full z-30 flex-col gap-4 border-b border-line bg-surface px-4 py-5 shadow-lift lg:static lg:ml-auto lg:flex lg:flex-1 lg:flex-row lg:items-center lg:justify-end lg:gap-5 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}
        >
          <nav id="main-nav" aria-label={t.mainNav} className="flex flex-col gap-1 lg:flex-row lg:items-center">
            <NavLink to="/" className={publicNavClass} end onClick={() => setOpen(false)}>
              {t.navHome}
            </NavLink>
            <NavLink to="/check" className={publicNavClass} onClick={() => setOpen(false)}>
              {t.navCheck}
            </NavLink>
            <NavLink to="/schemes" className={publicNavClass} onClick={() => setOpen(false)}>
              {t.navSchemes}
            </NavLink>
            <NavLink to="/evaluation" className={publicNavClass} onClick={() => setOpen(false)}>
              {t.navEvaluation}
            </NavLink>
          </nav>
          <div className="hidden h-6 w-px bg-line lg:block" aria-hidden="true" />
          <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-center">
            <div className="hidden lg:block">
              <LanguageSwitcher />
            </div>
            {isAuthenticated ? (
              <>
                <NavLink to="/dashboard" className={accountNavClass} onClick={() => setOpen(false)}>
                  {t.navDashboard}
                </NavLink>
                <NavLink to="/wallet" className={accountNavClass} onClick={() => setOpen(false)}>
                  {t.navWallet}
                </NavLink>
                <NavLink to="/history" className={accountNavClass} onClick={() => setOpen(false)}>
                  {t.navHistory}
                </NavLink>
                <NavLink to="/documents" className={accountNavClass} onClick={() => setOpen(false)}>
                  {t.navDocuments}
                </NavLink>
                <NavLink to="/insights" className={accountNavClass} onClick={() => setOpen(false)}>
                  {t.navInsights}
                </NavLink>
                <NavLink to="/readiness" className={accountNavClass} onClick={() => setOpen(false)}>
                  {t.navReadiness}
                </NavLink>
                <NavLink to="/uploads" className={accountNavClass} onClick={() => setOpen(false)}>
                  {t.navUploads}
                </NavLink>
                <NavLink to="/account" className={accountNavClass} onClick={() => setOpen(false)}>
                  {t.navAccount}
                </NavLink>
                <span className="truncate px-2 text-[14px] font-medium text-ink-500">
                  {user?.full_name || user?.email}
                </span>
                <Button type="button" variant="ghost" onClick={handleLogout}>
                  {t.navLogout}
                </Button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={publicNavClass} onClick={() => setOpen(false)}>
                  {t.navLogin}
                </NavLink>
                <NavLink
                  to="/register"
                  className="rounded-[12px] bg-action px-4 py-2.5 text-center text-[16px] font-semibold text-white shadow-sm transition duration-150 hover:bg-action-hover"
                  onClick={() => setOpen(false)}
                >
                  {t.navRegister}
                </NavLink>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
