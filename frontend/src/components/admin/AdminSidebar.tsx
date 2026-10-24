import { NavLink, useLocation } from "react-router-dom";
import { useI18n } from "../../context/LanguageContext";
import { GovernmentEmblem } from "../GovernmentEmblem";
import { ChevronLeftIcon, ChevronRightIcon } from "../icons";
import { adminPrimaryNav } from "./adminNav";

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
  const { pathname } = useLocation();
  const items = adminPrimaryNav(t);
  const sections = [
    { label: t.adminSectionManagement, items: items.filter((item) => item.to !== "/admin/settings") },
    { label: t.adminSectionAccount, items: items.filter((item) => item.to === "/admin/settings") },
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
              className="admin-brand-mark admin-brand-mark-emblem admin-brand-mark-solo"
              aria-label={t.brandName}
              onClick={onClose}
            >
              <GovernmentEmblem className="admin-emblem" />
            </NavLink>
          ) : (
            <NavLink to="/admin" end className="admin-brand" onClick={onClose}>
              <span className="admin-brand-mark admin-brand-mark-emblem">
                <GovernmentEmblem className="admin-emblem" />
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
                    className={({ isActive }) =>
                      itemClass(
                        isActive || (item.alsoActive ?? []).some((path) => pathname.startsWith(path)),
                        collapsed,
                      )
                    }
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
              <span className="sr-only">{t.adminEnvironment}</span>
              <span className="admin-system-version">{t.adminVersion}</span>
            </p>
          ) : (
            <p className="admin-system">
              <span>{t.adminEnvironment}</span>
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
