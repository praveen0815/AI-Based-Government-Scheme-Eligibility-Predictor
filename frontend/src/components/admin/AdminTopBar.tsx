import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../context/LanguageContext";
import { useRecommendation } from "../../context/RecommendationContext";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { NotificationBell } from "../NotificationBell";
import { MenuIcon, MicIcon, SearchIcon, UserIcon } from "../icons";
import { AdminThemeToggle } from "./AdminThemeToggle";
import { adminBreadcrumbs } from "./adminPageMeta";
import { adminSearchDestinations } from "./adminNav";

export function AdminTopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user, logout } = useAuth();
  const { clearResult } = useRecommendation();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [query, setQuery] = useState("");
  const crumbs = adminBreadcrumbs(pathname, t);

  const destinations = useMemo(() => adminSearchDestinations(t), [t]);
  const matches = query.trim()
    ? destinations.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()))
    : [];

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
        <nav className="admin-breadcrumbs" aria-label={t.adminBreadcrumbLabel}>
          <ol>
            {crumbs.map((crumb, index) => {
              const current = index === crumbs.length - 1;
              return (
                <li key={`${crumb.label}-${index}`}>
                  {index > 0 ? <span aria-hidden="true">/</span> : null}
                  {crumb.to && !current ? (
                    <Link to={crumb.to}>{crumb.label}</Link>
                  ) : (
                    <span aria-current={current ? "page" : undefined}>{crumb.label}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
        <div className="admin-search hidden md:block">
          <span className="admin-search-glyph" aria-hidden="true">
            <SearchIcon />
          </span>
          <label className="sr-only" htmlFor="admin-page-search">
            {t.adminSearchLabel}
          </label>
          <input
            id="admin-page-search"
            className="admin-input admin-search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setQuery("");
            }}
            placeholder={t.adminSearchPlaceholder}
          />
          {query.trim() ? (
            <div className="admin-search-results" role="listbox">
              {matches.length > 0 ? (
                matches.map((item) => (
                  <Link key={item.to} to={item.to} onClick={() => setQuery("")}>
                    {item.label}
                  </Link>
                ))
              ) : (
                <p className="admin-search-empty">{t.adminSearchNoResults}</p>
              )}
            </div>
          ) : null}
        </div>
        <div className="admin-topbar-actions">
          <div className="admin-lang">
            <LanguageSwitcher />
          </div>
          <NotificationBell to="/admin/notifications" className="admin-icon-btn relative" />
          <AdminThemeToggle />
          <Link to="/admin/voice-assistant" className="admin-voice-btn">
            <MicIcon />
            {t.navVoiceAssistant}
          </Link>
          <Link to="/admin/settings" className="admin-profile">
            <span className="hidden text-right lg:block">
              <span className="admin-profile-name block">{user?.full_name || user?.email}</span>
              <span className="admin-profile-role block">{t.adminConsoleRole}</span>
            </span>
            <span className="admin-profile-avatar">
              <UserIcon />
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
