import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/LanguageContext";
import { BellIcon, MenuIcon, UserIcon } from "./icons";

export function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { isAuthenticated, user } = useAuth();
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface px-4 py-3 md:px-8">
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-line text-ink-900 hover:bg-canvas lg:hidden"
        aria-label={t.openMenu}
        onClick={onOpenMenu}
      >
        <MenuIcon />
      </button>
      <div className="ml-auto flex items-center gap-3">
        <span
          className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-line text-ink-500"
          aria-label={t.notifications}
        >
          <BellIcon />
        </span>
        <div className="flex items-center gap-3 rounded-[14px] border border-line px-3 py-1.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-ink-500">
            <UserIcon />
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-[15px] font-semibold text-ink-900">
              {isAuthenticated ? user?.full_name || user?.email : t.guestUser}
            </span>
            <span className="block text-[13px] text-ink-500">
              {isAuthenticated ? user?.email : t.notSignedIn}
            </span>
          </span>
        </div>
      </div>
    </header>
  );
}
