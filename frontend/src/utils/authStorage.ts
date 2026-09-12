import type { AuthUser } from "../types/api";

const TOKEN_KEY = "prototypeAuthToken";
const USER_KEY = "prototypeAuthUser";
const ACCOUNT_DELETED_KEY = "prototypeAccountDeleted";

export function readStoredToken(): string | null {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function publicAuthUser(value: AuthUser): AuthUser {
  return {
    user_id: value.user_id,
    full_name: value.full_name,
    email: value.email,
    has_password: value.has_password,
    has_google: value.has_google,
    is_admin: value.is_admin,
    created_at: value.created_at,
  };
}

export function readStoredUser(): AuthUser | null {
  try {
    const raw = window.sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed?.user_id || !parsed.email) return null;
    return publicAuthUser(parsed);
  } catch {
    return null;
  }
}

export function storeAuthSession(token: string, user: AuthUser): void {
  try {
    window.sessionStorage.setItem(TOKEN_KEY, token);
    window.sessionStorage.setItem(USER_KEY, JSON.stringify(publicAuthUser(user)));
  } catch {
    // Session storage is a local demo convenience, not a secure vault.
  }
}

export function clearAuthSession(): void {
  try {
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(USER_KEY);
  } catch {
    // Ignore storage failures in the academic prototype.
  }
}

export function markAccountDeleted(): void {
  try {
    window.sessionStorage.setItem(ACCOUNT_DELETED_KEY, "1");
  } catch {
    // Session storage is a local demo convenience, not a secure vault.
  }
}

export function peekAccountDeleted(): boolean {
  try {
    return window.sessionStorage.getItem(ACCOUNT_DELETED_KEY) === "1";
  } catch {
    return false;
  }
}

export function consumeAccountDeleted(): boolean {
  try {
    const marked = window.sessionStorage.getItem(ACCOUNT_DELETED_KEY) === "1";
    if (marked) {
      window.sessionStorage.removeItem(ACCOUNT_DELETED_KEY);
    }
    return marked;
  } catch {
    return false;
  }
}
