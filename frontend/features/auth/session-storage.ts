export type SessionCredentials = { accessToken: string; sessionId: string };

const sessionKey = "taskboard.session";
const legacyKey = "taskboard.access-token";

export function readSavedSession(): SessionCredentials | null {
  try {
    const stored = sessionStorage.getItem(sessionKey);
    if (!stored) return null;
    const value = JSON.parse(stored);
    if (
      typeof value?.accessToken === "string" &&
      typeof value?.sessionId === "string"
    )
      return { accessToken: value.accessToken, sessionId: value.sessionId };
  } catch {
    // Sign-in still works when the browser blocks storage.
  }
  return null;
}

export function saveSession(credentials: SessionCredentials | null) {
  try {
    if (credentials)
      sessionStorage.setItem(sessionKey, JSON.stringify(credentials));
    else sessionStorage.removeItem(sessionKey);
  } catch {
    // The in-memory session still works in this tab.
  }
}

export function clearLegacySession() {
  try {
    const hadSession = sessionStorage.getItem(legacyKey) !== null;
    sessionStorage.removeItem(legacyKey);
    return hadSession;
  } catch {
    return false;
  }
}

export function expiresAt(token: string) {
  try {
    const encoded = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const { exp } = JSON.parse(atob(encoded));
    return typeof exp === "number" && Number.isFinite(exp) ? exp * 1000 : null;
  } catch {
    return null;
  }
}
