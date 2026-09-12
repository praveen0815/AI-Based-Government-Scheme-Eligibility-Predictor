import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { ResearchNotice } from "../components/ResearchNotice";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { useI18n } from "../context/LanguageContext";
import { ApiError, deleteNotification, fetchNotifications, markNotificationRead } from "../services/api";
import type { NotificationItem } from "../types/api";
import { formatCheckedAt } from "../utils/displayLabels";
import { notificationCategory, notificationMessage, notificationTitle } from "../utils/notificationCopy";

export function NotificationsPage() {
  const { language, t } = useI18n();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadNotifications() {
    setLoading(true);
    setError(null);
    try {
      const listed = await fetchNotifications();
      setItems(listed.notifications);
      setUnreadCount(listed.unread_count);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.networkError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, [t]);

  async function handleRead(notificationId: string) {
    setBusyId(notificationId);
    setActionError(null);
    try {
      const updated = await markNotificationRead(notificationId);
      setItems((current) =>
        current.map((item) =>
          item.notification_id === notificationId
            ? { ...item, ...updated, count: item.count, is_read: true }
            : item,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : t.networkError);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDismiss(notificationId: string) {
    setBusyId(notificationId);
    setActionError(null);
    try {
      const target = items.find((item) => item.notification_id === notificationId);
      await deleteNotification(notificationId);
      setItems((current) => current.filter((item) => item.notification_id !== notificationId));
      if (target && !target.is_read) {
        setUnreadCount((current) => Math.max(0, current - 1));
      }
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : t.networkError);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl page-stack">
      <PageHeader title={t.notificationsTitle} description={t.notificationsLead} />
      <ResearchNotice compact />

      {loading ? <LoadingState message={t.notificationsLoading} /> : null}
      {error ? <ErrorState message={error} /> : null}
      {actionError ? <ErrorState message={actionError} /> : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState title={t.notificationsEmptyTitle} description={t.notificationsEmptyLead}>
          <Link
            to="/wallet"
            className="inline-flex items-center justify-center rounded-[12px] bg-action px-5 py-3 font-semibold text-white"
          >
            {t.navWallet}
          </Link>
        </EmptyState>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div className="space-y-5">
          <p className="text-[16px] font-semibold text-ink-700">{t.notificationsUnreadCount(unreadCount)}</p>
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.notification_id}>
                <article
                  className={`card-surface space-y-4 p-6 md:p-8 ${item.is_read ? "" : "border-action/40"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="brand">{notificationCategory(item.type, t)}</Badge>
                        <Badge tone={item.is_read ? "muted" : "warning"}>
                          {item.is_read ? t.notificationsStatusRead : t.notificationsStatusUnread}
                        </Badge>
                      </div>
                      <h2 className="section-title">{notificationTitle(item, t)}</h2>
                      <p className="text-[16px] leading-relaxed text-ink-700">
                        {notificationMessage(item, t)}
                      </p>
                      <p className="text-[15px] text-ink-500">{formatCheckedAt(item.created_at, language)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={item.href}
                      className="inline-flex items-center justify-center rounded-[12px] bg-action px-4 py-2.5 text-[16px] font-semibold text-white hover:bg-action-hover"
                    >
                      {t.notificationsOpen}
                    </Link>
                    {!item.is_read ? (
                      <button
                        type="button"
                        disabled={busyId === item.notification_id}
                        onClick={() => void handleRead(item.notification_id)}
                        className="inline-flex items-center justify-center rounded-[12px] border border-line px-4 py-2.5 text-[16px] font-semibold text-ink-900 hover:bg-sage disabled:opacity-60"
                      >
                        {t.notificationsMarkRead}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busyId === item.notification_id}
                      onClick={() => void handleDismiss(item.notification_id)}
                      className="inline-flex items-center justify-center rounded-[12px] border border-line px-4 py-2.5 text-[16px] font-semibold text-ink-900 hover:bg-sage disabled:opacity-60"
                    >
                      {t.notificationsDismiss}
                    </button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
          <p className="text-[16px] leading-relaxed text-ink-500">{t.notificationsDisclaimer}</p>
        </div>
      ) : null}
    </div>
  );
}
