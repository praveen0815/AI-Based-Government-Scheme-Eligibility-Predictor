import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { signedInHomePath } from "../utils/homePath";

export function RootRedirect() {
  const { isAuthenticated, user } = useAuth();
  const [searchParams] = useSearchParams();

  if (isAuthenticated) {
    return <Navigate to={signedInHomePath(user)} replace />;
  }

  const search = searchParams.toString();
  return <Navigate to={search ? `/login?${search}` : "/login"} replace />;
}
