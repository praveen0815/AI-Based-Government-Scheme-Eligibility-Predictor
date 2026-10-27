import { useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AdminThemeProvider, useAdminTheme } from "../../context/AdminThemeContext";
import { AssistantWidgetHost } from "../assistant/AssistantWidget";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopBar } from "./AdminTopBar";

const COLLAPSE_KEY = "admin-sidebar-collapsed";

function AdminShellFrame({ children }: { children: ReactNode }) {
  const { theme } = useAdminTheme();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.sessionStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.sessionStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore quota / private mode */
      }
      return next;
    });
  }

  return (
    <div className={`admin-console ${collapsed ? "admin-console-collapsed" : ""}`} data-admin-theme={theme}>
      <AssistantWidgetHost variant="admin">
        <AdminSidebar
          open={mobileOpen}
          collapsed={collapsed}
          onClose={() => setMobileOpen(false)}
          onToggleCollapsed={toggleCollapsed}
        />
        <div className="admin-workspace">
          <AdminTopBar onOpenMenu={() => setMobileOpen(true)} />
          <main className="admin-main">
            <div key={pathname} className="admin-page-enter">
              {children}
            </div>
          </main>
        </div>
      </AssistantWidgetHost>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <AdminThemeProvider>
      <AdminShellFrame>{children}</AdminShellFrame>
    </AdminThemeProvider>
  );
}
