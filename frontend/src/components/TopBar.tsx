import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCitizenTheme } from "../context/CitizenThemeContext";
import { useI18n } from "../context/LanguageContext";
import { useRecommendation } from "../context/RecommendationContext";
import { BrandMark } from "./BrandMark";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { MenuIcon, SearchIcon, UserIcon } from "./icons";
import { Button } from "./ui/Button";

export function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { isAuthenticated, user, logout } = useAuth();
  const { clearResult } = useRecommendation();
  const { theme } = useCitizenTheme();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const destinations = useMemo(
    () => [
      { to: "/dashboard", label: t.navDashboard },
      { to: "/wallet", label: t.navWallet },
      { to: "/check", label: t.navCheck },
      { to: "/compare", label: t.navCompare },
      { to: "/eligibility-simulator", label: t.navSimulator },
      { to: "/applications", label: t.navApplications },
      { to: "/documents", label: t.navDocuments },
      { to: "/document-scanner", label: t.navDocumentScanner },
      { to: "/insights", label: t.navHighlights },
      { to: "/history", label: t.navHistory },
      { to: "/scheme-assistant", label: t.navSchemeAssistant },
      { to: "/voice-assistant", label: t.navVoiceAssistant },
      { to: "/schemes", label: t.navSchemes },
      { to: "/evaluation", label: t.navEvaluation },
      { to: "/uploads", label: t.navUploads },
      { to: "/notifications", label: t.navNotifications },
      { to: "/settings", label: t.navSettings },
    ],
    [t],
  );
  const matches = query.trim()
    ? destinations.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()))
    : [];

  function handleLogout() {
    logout();
    clearResult();
    navigate("/login");
  }

  return (
    <header className="citizen-topbar sticky top-0 z-20">
      <div className="flex items-center gap-3 px-4 py-4 md:px-8 lg:px-10">
        <button
          type="button"
          className="citizen-icon-btn lg:hidden"
          aria-label={t.openMenu}
          onClick={onOpenMenu}
        >
          <MenuIcon />
        </button>
        <div className="lg:hidden">
          <BrandMark compact inverted={theme === "dark"} />
        </div>
        {isAuthenticated ? (
          <div className="citizen-search hidden md:block">
            <span className="citizen-search-glyph" aria-hidden="true">
              <SearchIcon />
            </span>
            <label className="sr-only" htmlFor="citizen-page-search">
              {t.citizenSearchLabel}
            </label>
            <input
              id="citizen-page-search"
              className="citizen-search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.citizenSearchPlaceholder}
            />
            {query.trim() ? (
              <div className="citizen-search-results" role="listbox">
                {matches.length > 0 ? (
                  matches.map((item) => (
                    <Link key={item.to} to={item.to} onClick={() => setQuery("")}>
                      {item.label}
                    </Link>
                  ))
                ) : (
                  <p className="citizen-search-empty">{t.citizenSearchNoResults}</p>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="citizen-topbar-tagline hidden min-w-0 flex-1 truncate lg:block">
            {t.productTagline}
          </p>
        )}
        <div className="citizen-topbar-actions ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <ThemeToggle />
          <LanguageSwitcher variant="citizen" />
          {isAuthenticated ? (
            <>
              <NotificationBell className="citizen-bell" />
              <Link to="/settings" className="citizen-profile-chip">
                <span className="citizen-profile-avatar">
                  <UserIcon />
                </span>
                <span className="hidden text-left sm:block">
                  <span className="citizen-profile-name block font-semibold">
                    {user?.full_name || user?.email}
                  </span>
                  <span className="citizen-profile-email block">{user?.email}</span>
                </span>
              </Link>
              <Button type="button" variant="ghost" className="citizen-logout" onClick={handleLogout}>
                {t.navLogout}
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className="citizen-text-link">
                {t.navLogin}
              </Link>
              <Link to="/register" className="chip-link-primary">
                {t.navRegister}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
