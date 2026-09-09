import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useI18n } from "../context/LanguageContext";
import { fetchNotifications } from "../services/api";
import { BellIcon } from "./icons";

export function NotificationBell() {
  const { t } = useI18n();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadUnread() {
      try {
        const listed = await fetchNotifications();
        if (!cancelled) setUnreadCount(listed.unread_count);
      } catch {
        if (!cancelled) setUnreadCount(0);
      }
    }
    void loadUnread();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, t]);

  return (
    <Link
      to="/notifications"
      className="relative inline-flex h-12 w-12 items-center justify-center rounded-[12px] border border-line text-ink-900 transition duration-150 hover:bg-sage"
      aria-label={t.notificationsBellLabel(unreadCount)}
    >
      <BellIcon />
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-w-6 items-center justify-center rounded-full bg-action px-1.5 py-0.5 text-[12px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
