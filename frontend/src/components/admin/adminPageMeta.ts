import type { Messages } from "../../i18n/types";

export function adminPageMeta(pathname: string, t: Messages): { title: string; description: string } {
  if (pathname === "/admin") {
    return { title: t.adminTitle, description: t.adminLead };
  }
  if (pathname.startsWith("/admin/users/")) {
    return { title: t.adminUserDetail, description: t.adminUsersLead };
  }
  if (pathname.startsWith("/admin/users")) {
    return { title: t.adminUsers, description: t.adminUsersLead };
  }
  if (pathname.startsWith("/admin/documents")) {
    return { title: t.adminDocumentVerification, description: t.adminDocumentsLead };
  }
  if (pathname.startsWith("/admin/applications")) {
    return { title: t.navApplications, description: t.adminApplicationsLead };
  }
  if (pathname.startsWith("/admin/schemes")) {
    return { title: t.adminSchemeManagement, description: t.adminSchemeManagementLead };
  }
  if (pathname.startsWith("/admin/eligibility")) {
    return { title: t.adminEligibilityMonitoring, description: t.adminEligibilityLead };
  }
  if (pathname.startsWith("/admin/evaluation")) {
    return { title: t.adminSchemeEvaluation, description: t.evaluationLead };
  }
  if (pathname.startsWith("/admin/system-evaluation")) {
    return { title: t.navSystemEvaluation, description: t.systemEvalLead };
  }
  if (pathname.startsWith("/admin/research-dashboard")) {
    return { title: t.navResearchDashboard, description: t.researchDashLead };
  }
  if (pathname.startsWith("/admin/notifications")) {
    return { title: t.navNotifications, description: t.notificationsLead };
  }
  if (pathname.startsWith("/admin/voice-assistant")) {
    return { title: t.navVoiceAssistant, description: t.voiceLead };
  }
  if (pathname.startsWith("/admin/uploads")) {
    return { title: t.navUploads, description: t.uploadsLead };
  }
  if (pathname.startsWith("/admin/settings")) {
    return { title: t.navSettings, description: t.accountLead };
  }
  return { title: t.adminConsole, description: t.adminEnvironment };
}
