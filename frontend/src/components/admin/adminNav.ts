import type { ComponentType, SVGProps } from "react";
import type { Messages } from "../../i18n/types";
import {
  BrainIcon,
  ClipboardIcon,
  DashboardIcon,
  DocumentIcon,
  EvaluationIcon,
  InsightsIcon,
  SchemesIcon,
  SettingsIcon,
  UserIcon,
} from "../icons";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export type AdminNavItem = {
  to: string;
  label: string;
  end?: boolean;
  alsoActive?: string[];
  icon: IconComponent;
};

export type AdminDestination = {
  to: string;
  label: string;
};

/** Primary administration navigation. Extra tools stay reachable from search and their pages. */
export function adminPrimaryNav(t: Messages): AdminNavItem[] {
  return [
    { to: "/admin", end: true, label: t.navDashboard, icon: DashboardIcon },
    { to: "/admin/users", label: t.adminUsers, icon: UserIcon },
    { to: "/admin/applications", label: t.navApplications, icon: ClipboardIcon },
    { to: "/admin/documents", label: t.adminDocuments, icon: DocumentIcon },
    { to: "/admin/schemes", label: t.adminNavSchemes, icon: SchemesIcon },
    {
      to: "/admin/eligibility",
      label: t.adminNavEligibilityModel,
      alsoActive: ["/admin/evaluation"],
      icon: EvaluationIcon,
    },
    { to: "/admin/research-dashboard", label: t.adminNavAnalytics, icon: InsightsIcon },
    { to: "/admin/system-evaluation", label: t.adminNavMonitoring, icon: BrainIcon },
    { to: "/admin/settings", label: t.navSettings, icon: SettingsIcon },
  ];
}

export function adminSearchDestinations(t: Messages): AdminDestination[] {
  const primary = adminPrimaryNav(t).map(({ to, label }) => ({ to, label }));
  return [
    ...primary,
    { to: "/admin/evaluation", label: t.adminSchemeEvaluation },
    { to: "/admin/notifications", label: t.navNotifications },
    { to: "/admin/voice-assistant", label: t.navVoiceAssistant },
    { to: "/admin/uploads", label: t.navUploads },
  ];
}
