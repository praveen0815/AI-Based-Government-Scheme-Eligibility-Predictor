import { useState, type ReactNode } from "react";
import { AdminThemeProvider, useAdminTheme } from "../../context/AdminThemeContext";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopBar } from "./AdminTopBar";

const COLLAPSE_KEY = "admin-sidebar-collapsed";

function AdminShellFrame({ children }: { children: ReactNode }) {
  const { theme } = useAdminTheme();
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
      <AdminSidebar
        open={mobileOpen}
        collapsed={collapsed}
        onClose={() => setMobileOpen(false)}
        onToggleCollapsed={toggleCollapsed}
      />
      <div className="admin-workspace">
        <AdminTopBar onOpenMenu={() => setMobileOpen(true)} />
        <main className="admin-main">
          <div className="admin-page-enter">{children}</div>
        </main>
      </div>
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
