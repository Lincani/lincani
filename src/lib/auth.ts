export type SessionUser = { email: string };

const KEY = "breedlink_session";
const EVENT = "breedlink-auth-change";

// ✅ token/user keys
const TOKEN_KEY = "breedlink_token";
const USER_KEY = "breedlink_user";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    const t = "__bl_test__";
    window.localStorage.setItem(t, "1");
    window.localStorage.removeItem(t);
    return window.localStorage;
  } catch {}

  try {
    const t = "__bl_test__";
    window.sessionStorage.setItem(t, "1");
    window.sessionStorage.removeItem(t);
    return window.sessionStorage;
  } catch {}

  return null;
}

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

/* ===========================
   Existing: UI Session helpers
   =========================== */

export function getSession(): SessionUser | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function setSession(user: SessionUser) {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(KEY, JSON.stringify(user));
  emit();
}

export function clearSession() {
  const storage = getStorage();
  if (!storage) return;

  storage.removeItem(KEY);
  emit();
}

export function onAuthChange(fn: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

/* ===========================
   JWT token/user helpers
   =========================== */

export function getToken(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  return storage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(TOKEN_KEY, token);
  emit();
}

export function clearToken() {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(TOKEN_KEY);
  emit();
}

export function getUser<T = any>(): T | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function setUser(user: any) {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(USER_KEY, JSON.stringify(user));
  emit();
}

export function clearUser() {
  const storage = getStorage();
  if (!storage) return;

  storage.removeItem(USER_KEY);
  emit();
}

// Convenience: set token + user together
export function setAuth(token: string, user: any) {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify(user));
  emit();
}

// Convenience: clear everything auth-related
export function clearAuth() {
  const storage = getStorage();
  if (!storage) return;

  storage.removeItem(KEY);
  storage.removeItem(TOKEN_KEY);
  storage.removeItem(USER_KEY);
  emit();
}

// If you want a single call that clears + redirects
export function logout() {
  clearAuth();
  if (typeof window !== "undefined") window.location.href = "/";
}
