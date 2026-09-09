import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function RootRedirect() {
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const search = searchParams.toString();
  return <Navigate to={search ? `/login?${search}` : "/login"} replace />;
}
