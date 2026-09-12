import { NavLink } from "react-router-dom";
import { useI18n } from "../../context/LanguageContext";
import {
  BellIcon,
  BrainIcon,
  ClipboardIcon,
  DashboardIcon,
  DocumentIcon,
  EvaluationIcon,
  MicIcon,
  SchemesIcon,
  SettingsIcon,
  ShieldIcon,
  TargetIcon,
  UploadIcon,
  UserIcon,
} from "../icons";

type AdminNavItem = {
  to: string;
  label: string;
  end?: boolean;
  icon: typeof DashboardIcon;
};

function itemClass(active: boolean, collapsed: boolean) {
  return [
    "admin-sidebar-link",
    collapsed ? "justify-center px-0" : "gap-3 px-3",
    active ? "admin-sidebar-link-active" : "admin-sidebar-link-idle",
  ].join(" ");
}

export function AdminSidebar({
  open,
  collapsed,
  onClose,
  onToggleCollapsed,
}: {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapsed: () => void;
}) {
  const { t } = useI18n();

  const sections: { label: string; items: AdminNavItem[] }[] = [
    {
      label: t.adminSectionOverview,
      items: [{ to: "/admin", end: true, label: t.adminOverviewNav, icon: DashboardIcon }],
    },
    {
      label: t.adminSectionManagement,
      items: [
        { to: "/admin/users", label: t.adminUsers, icon: UserIcon },
        { to: "/admin/documents", label: t.adminDocumentVerification, icon: DocumentIcon },
        { to: "/admin/applications", label: t.navApplications, icon: ClipboardIcon },
        { to: "/admin/schemes", label: t.adminSchemeManagement, icon: SchemesIcon },
      ],
    },
    {
      label: t.adminSectionAnalytics,
      items: [
        { to: "/admin/eligibility", label: t.adminEligibilityMonitoring, icon: EvaluationIcon },
        { to: "/admin/evaluation", label: t.adminSchemeEvaluation, icon: TargetIcon },
        { to: "/admin/system-evaluation", label: t.navSystemEvaluation, icon: BrainIcon },
        { to: "/admin/research-dashboard", label: t.navResearchDashboard, icon: EvaluationIcon },
      ],
    },
    {
      label: t.adminSectionTools,
      items: [
        { to: "/admin/notifications", label: t.navNotifications, icon: BellIcon },
        { to: "/admin/voice-assistant", label: t.navVoiceAssistant, icon: MicIcon },
      ],
    },
    {
      label: t.adminSectionAccount,
      items: [
        { to: "/admin/uploads", label: t.navUploads, icon: UploadIcon },
        { to: "/admin/settings", label: t.navSettings, icon: SettingsIcon },
      ],
    },
  ];

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-950/45 transition-opacity lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`admin-sidebar z-40 flex flex-col text-white ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className={`border-b border-white/10 ${collapsed ? "px-2 py-4" : "px-4 py-4"}`}>
          {collapsed ? (
            <NavLink
              to="/admin"
              end
              className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-[#1d4ed8] text-white"
              aria-label={t.brandName}
              onClick={onClose}
            >
              <ShieldIcon />
            </NavLink>
          ) : (
            <NavLink to="/admin" className="admin-brand" onClick={onClose}>
              <span className="admin-brand-mark">
                <ShieldIcon />
              </span>
              <span>
                <span className="admin-brand-title">{t.brandName}</span>
                <span className="admin-brand-console">{t.adminConsole}</span>
                <span className="admin-brand-tag">{t.brandSubtitle}</span>
              </span>
            </NavLink>
          )}
        </div>

        <nav aria-label={t.adminConsole} className="flex-1 space-y-4 overflow-y-auto px-2.5 py-4">
          {sections.map((section) => (
            <div key={section.label}>
              {collapsed ? <p className="sr-only">{section.label}</p> : <p className="admin-nav-label px-3 pb-1.5">{section.label}</p>}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    title={item.label}
                    aria-label={item.label}
                    className={({ isActive }) => itemClass(isActive, collapsed)}
                    onClick={onClose}
                  >
                    <item.icon />
                    {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-2.5 border-t border-white/10 p-3">
          {collapsed ? (
            <p className="admin-system justify-center">
              <span className="admin-system-dot" aria-hidden="true" />
              <span className="sr-only">{t.adminSystemOnline}</span>
            </p>
          ) : (
            <p className="admin-system">
              <span className="admin-system-dot" aria-hidden="true" />
              <span>{t.adminSystemOnline}</span>
              <span className="ml-auto text-slate-400">{t.adminVersion}</span>
            </p>
          )}
          <button
            type="button"
            className="hidden w-full items-center justify-center rounded-lg border border-white/10 px-2 py-2 text-slate-300 hover:bg-white/5 hover:text-white lg:flex"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? t.adminExpandSidebar : t.adminCollapseSidebar}
          >
            {collapsed ? "»" : t.adminCollapseSidebar}
          </button>
          {collapsed ? null : <p className="admin-sidebar-disclaimer px-0.5 text-slate-400">{t.notOfficialService}</p>}
        </div>
      </aside>
    </>
  );
}
