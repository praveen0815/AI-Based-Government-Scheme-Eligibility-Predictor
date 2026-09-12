import { useState, type ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopBar } from "./AdminTopBar";

const COLLAPSE_KEY = "admin-sidebar-collapsed";

export function AdminShell({ children }: { children: ReactNode }) {
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
    <div className={`admin-console ${collapsed ? "admin-console-collapsed" : ""}`}>
      <AdminSidebar
        open={mobileOpen}
        collapsed={collapsed}
        onClose={() => setMobileOpen(false)}
        onToggleCollapsed={toggleCollapsed}
      />
      <div className="admin-workspace">
        <AdminTopBar onOpenMenu={() => setMobileOpen(true)} onToggleCollapsed={toggleCollapsed} />
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
