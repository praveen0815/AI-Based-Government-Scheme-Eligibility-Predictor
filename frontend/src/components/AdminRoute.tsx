import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { ReactNode } from "react";
import { EmptyState } from "./ui/EmptyState";
import { useI18n } from "../context/LanguageContext";
import { Link } from "react-router-dom";

export function AdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const { t } = useI18n();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!user?.is_admin) {
    return (
      <EmptyState title={t.adminForbiddenTitle} description={t.adminForbiddenLead}>
        <Link to="/dashboard" className="btn-text inline-flex rounded-[12px] bg-action px-5 py-3 text-white">
          {t.navDashboard}
        </Link>
      </EmptyState>
    );
  }
  return children;
}
