import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/LanguageContext";
import { useRecommendation } from "../context/RecommendationContext";
import { BrandMark } from "./BrandMark";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NotificationBell } from "./NotificationBell";
import { MenuIcon, UserIcon } from "./icons";
import { Button } from "./ui/Button";

export function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { isAuthenticated, user, logout } = useAuth();
  const { clearResult } = useRecommendation();
  const { t } = useI18n();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    clearResult();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 py-3 md:px-8">
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-line text-ink-900 transition duration-150 hover:bg-canvas lg:hidden"
          aria-label={t.openMenu}
          onClick={onOpenMenu}
        >
          <MenuIcon />
        </button>
        <div className="lg:hidden">
          <BrandMark compact />
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <LanguageSwitcher />
          {isAuthenticated ? (
            <>
              <NotificationBell />
              <Link
                to="/settings"
                className="flex items-center gap-3 rounded-[14px] border border-line px-3 py-1.5 transition duration-150 hover:bg-canvas"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-white">
                  <UserIcon />
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-[15px] font-semibold text-ink-900">
                    {user?.full_name || user?.email}
                  </span>
                  <span className="block text-[13px] text-ink-500">{user?.email}</span>
                </span>
              </Link>
              <Button type="button" variant="ghost" onClick={handleLogout}>
                {t.navLogout}
              </Button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-[12px] px-4 py-2.5 text-[16px] font-semibold text-ink-700 transition duration-150 hover:bg-canvas hover:text-ink-900"
              >
                {t.navLogin}
              </Link>
              <Link
                to="/register"
                className="rounded-[12px] bg-navy-900 px-4 py-2.5 text-center text-[16px] font-semibold text-white shadow-sm transition duration-150 hover:bg-navy-800"
              >
                {t.navRegister}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
