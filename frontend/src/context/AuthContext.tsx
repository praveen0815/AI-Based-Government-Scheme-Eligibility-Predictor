import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchCurrentUser, setAccessToken, setUnauthorizedHandler } from "../services/api";
import type { AuthUser } from "../types/api";
import {
  clearAuthSession,
  readStoredToken,
  readStoredUser,
  storeAuthSession,
} from "../utils/authStorage";
import { clearStoredCitizenId } from "../utils/walletStorage";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: AuthUser) => void;
  updateUser: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({
  children,
  initialUser = null,
  initialToken = null,
}: {
  children: ReactNode;
  initialUser?: AuthUser | null;
  initialToken?: string | null;
}) {
  const [user, setUser] = useState<AuthUser | null>(initialUser ?? readStoredUser());
  const [token, setToken] = useState<string | null>(initialToken ?? readStoredToken());

  function applySession(nextToken: string | null, nextUser: AuthUser | null) {
    setToken(nextToken);
    setUser(nextUser);
    setAccessToken(nextToken);
    if (nextToken && nextUser) {
      storeAuthSession(nextToken, nextUser);
    } else {
      clearAuthSession();
      clearStoredCitizenId();
    }
  }

  useEffect(() => {
    setAccessToken(token);
    setUnauthorizedHandler(() => applySession(null, null));
    return () => setUnauthorizedHandler(null);
    // Register the 401 handler once per token change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token || initialUser) return;
    void fetchCurrentUser().catch(() => applySession(null, null));
    // Validate a restored session once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      login: (nextToken, nextUser) => applySession(nextToken, nextUser),
      updateUser: (nextUser) => {
        if (!token) return;
        applySession(token, nextUser);
      },
      logout: () => applySession(null, null),
    }),
    [user, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook lives with the provider; this is the standard React context pattern.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
