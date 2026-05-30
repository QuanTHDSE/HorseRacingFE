export const SESSION_KEY = "horse-racing-session";
export const STATE_KEY = "horse-racing-state";
export const ACCOUNTS_KEY = "horse-racing-accounts";
export const TOKEN_KEY = "horse-racing-token";

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson<T>(key: string, value: T): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}
