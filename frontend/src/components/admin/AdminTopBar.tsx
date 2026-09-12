import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../context/LanguageContext";
import { useRecommendation } from "../../context/RecommendationContext";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { NotificationBell } from "../NotificationBell";
import { MenuIcon, UserIcon } from "../icons";

export function AdminTopBar({
  onOpenMenu,
  onToggleCollapsed,
}: {
  onOpenMenu: () => void;
  onToggleCollapsed: () => void;
}) {
  const { user, logout } = useAuth();
  const { clearResult } = useRecommendation();
  const { t } = useI18n();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    clearResult();
    navigate("/login");
  }

  return (
    <header className="admin-topbar sticky top-0 z-20">
      <div className="admin-topbar-inner">
        <button type="button" className="admin-icon-btn lg:hidden" aria-label={t.openMenu} onClick={onOpenMenu}>
          <MenuIcon />
        </button>
        <button
          type="button"
          className="admin-icon-btn hidden lg:inline-flex"
          aria-label={t.adminCollapseSidebar}
          onClick={onToggleCollapsed}
        >
          ☰
        </button>
        <div className="min-w-0 flex-1">
          <p className="admin-topbar-title truncate text-slate-900">{t.adminConsole}</p>
          <p className="admin-topbar-sub hidden truncate text-slate-500 sm:block">{t.adminEnvironment}</p>
        </div>
        <div className="flex items-center justify-end gap-2">
          <div className="admin-lang">
            <LanguageSwitcher />
          </div>
          <NotificationBell to="/admin/notifications" className="admin-icon-btn relative" />
          <Link to="/admin/settings" className="admin-profile">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-white">
              <UserIcon />
            </span>
            <span className="hidden text-left sm:block">
              <span className="admin-profile-name block text-slate-900">{user?.full_name || user?.email}</span>
              <span className="admin-profile-role block text-slate-500">{t.adminConsoleRole}</span>
            </span>
          </Link>
          <button type="button" className="admin-logout" onClick={handleLogout}>
            {t.navLogout}
          </button>
        </div>
      </div>
    </header>
  );
}
