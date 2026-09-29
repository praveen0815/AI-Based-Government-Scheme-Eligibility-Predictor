import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AdminShell } from "./admin/AdminShell";
import { AppShell } from "./AppShell";
<<<<<<< HEAD
import { AuthShell } from "./AuthShell";

function isAuthEntry(pathname: string): boolean {
  return pathname === "/login" || pathname === "/register";
}
=======
>>>>>>> origin/main

export function PortalLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { isAuthenticated, user } = useAuth();
  const useAdminChrome = pathname.startsWith("/admin") && isAuthenticated && Boolean(user?.is_admin);

<<<<<<< HEAD
  if (!isAuthenticated || isAuthEntry(pathname)) {
    return <AuthShell>{children}</AuthShell>;
  }
=======
>>>>>>> origin/main
  if (useAdminChrome) {
    return <AdminShell>{children}</AdminShell>;
  }
  return <AppShell>{children}</AppShell>;
}
