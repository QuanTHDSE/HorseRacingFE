export const SESSION_KEY = "horse-racing-session";
export const STATE_KEY = "horse-racing-state";
export const ACCOUNTS_KEY = "horse-racing-accounts";

export function loadJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}
