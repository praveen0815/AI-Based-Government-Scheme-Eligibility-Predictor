const STORAGE_KEY = "prototypeWalletCitizenId";

export function readStoredCitizenId(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeCitizenId(citizenId: string): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, citizenId);
  } catch {
    // Session storage is a local demo convenience, not a secure account.
  }
}

export function clearStoredCitizenId(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures in the academic prototype.
  }
}
