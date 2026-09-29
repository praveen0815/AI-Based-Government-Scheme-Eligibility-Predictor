import { NavLink } from "react-router-dom";
import { useI18n } from "../../context/LanguageContext";
import {
  BellIcon,
  BrainIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardIcon,
  DashboardIcon,
  DocumentIcon,
  EvaluationIcon,
  InsightsIcon,
  MicIcon,
  SchemesIcon,
  SettingsIcon,
  ShieldIcon,
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
    collapsed ? "admin-sidebar-link-collapsed" : "admin-sidebar-link-expanded",
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
      label: t.adminSectionManagement,
      items: [
        { to: "/admin", end: true, label: t.adminOverviewNav, icon: DashboardIcon },
        { to: "/admin/users", label: t.adminUsers, icon: UserIcon },
        { to: "/admin/documents", label: t.adminDocumentVerification, icon: DocumentIcon },
        { to: "/admin/applications", label: t.navApplications, icon: ClipboardIcon },
        { to: "/admin/schemes", label: t.adminSchemeManagement, icon: SchemesIcon },
      ],
    },
    {
      label: t.adminSectionAnalytics,
      items: [
        { to: "/admin/eligibility", label: t.adminEligibilityMonitoring, icon: CheckIcon },
        { to: "/admin/evaluation", label: t.adminSchemeEvaluation, icon: EvaluationIcon },
        { to: "/admin/system-evaluation", label: t.navSystemEvaluation, icon: BrainIcon },
        { to: "/admin/research-dashboard", label: t.navResearchDashboard, icon: InsightsIcon },
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
        className={`admin-sidebar-backdrop lg:hidden ${open ? "admin-sidebar-backdrop-open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`admin-sidebar z-40 flex flex-col ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className={`admin-brand-wrap ${collapsed ? "admin-brand-wrap-collapsed" : ""}`}>
          {collapsed ? (
            <NavLink
              to="/admin"
              end
              className="admin-brand-mark admin-brand-mark-solo"
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
              <span className="admin-brand-copy">
                <span className="admin-brand-title">{t.brandName}</span>
                <span className="admin-brand-console">{t.adminConsole}</span>
                <span className="admin-brand-tag">{t.brandSubtitle}</span>
              </span>
            </NavLink>
          )}
        </div>

        <nav aria-label={t.adminConsole} className="admin-sidebar-nav">
          {sections.map((section) => (
            <div key={section.label} className="admin-nav-group">
              {collapsed ? <p className="sr-only">{section.label}</p> : <p className="admin-nav-label">{section.label}</p>}
              <div className="admin-nav-items">
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
                    {collapsed ? <span className="sr-only">{item.label}</span> : <span>{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-foot">
          {collapsed ? (
            <p className="admin-system admin-system-collapsed">
              <span className="admin-system-dot" aria-hidden="true" />
              <span className="sr-only">{t.adminSystemOnline}</span>
            </p>
          ) : (
            <p className="admin-system">
              <span className="admin-system-dot" aria-hidden="true" />
              <span>{t.adminSystemOnline}</span>
              <span className="admin-system-version">{t.adminVersion}</span>
            </p>
          )}
          <button
            type="button"
            className="admin-collapse-btn hidden lg:flex"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? t.adminExpandSidebar : t.adminCollapseSidebar}
          >
            <span aria-hidden="true">{collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}</span>
            {collapsed ? null : <span>{t.adminCollapseSidebar}</span>}
          </button>
          {collapsed ? null : <p className="admin-sidebar-disclaimer">{t.notOfficialService}</p>}
        </div>
      </aside>
    </>
  );
}
