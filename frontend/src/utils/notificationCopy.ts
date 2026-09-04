import type { Messages } from "../i18n/types";
import type { NotificationItem, NotificationType } from "../types/api";

export function notificationCategory(type: NotificationType, t: Messages): string {
  if (type === "profile_incomplete") return t.notificationsCategoryProfile;
  if (type === "document_attention") return t.notificationsCategoryDocuments;
  if (type === "readiness_in_progress") return t.notificationsCategoryReadiness;
  return t.notificationsCategoryRecommendation;
}

export function notificationTitle(item: NotificationItem, t: Messages): string {
  if (item.type === "profile_incomplete") return t.notificationsProfileTitle;
  if (item.type === "document_attention") return t.notificationsDocumentTitle;
  if (item.type === "readiness_in_progress") return t.notificationsReadinessTitle;
  return t.notificationsRecommendationTitle;
}

export function notificationMessage(item: NotificationItem, t: Messages): string {
  if (item.type === "profile_incomplete") {
    if (item.count != null) return t.notificationsProfileIncomplete(item.count);
    return /wallet is needed|socio-economic wallet/i.test(item.message)
      ? t.notificationsProfileMissing
      : item.message || t.notificationsProfileMissing;
  }
  if (item.type === "document_attention") {
    return item.count != null ? t.notificationsDocumentMessage(item.count) : item.message;
  }
  if (item.type === "readiness_in_progress") {
    return item.count != null ? t.notificationsReadinessMessage(item.count) : item.message;
  }
  return item.count != null ? t.notificationsRecommendationMessage(item.count) : item.message;
}
