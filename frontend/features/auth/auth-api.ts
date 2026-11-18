import { api, type ApiRequest } from "@/lib/http-client";
import type { SessionCredentials } from "./session-storage";

export type User = { id: number; email: string };
type Credentials = { email: string; password: string };
type TokenResponse = { access_token: string; session_id: string };

function toSession(result: TokenResponse): SessionCredentials {
  return { accessToken: result.access_token, sessionId: result.session_id };
}

export function registerAccount(credentials: Credentials) {
  return api<User>("/auth/register", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export async function signIn(credentials: Credentials) {
  return toSession(
    await api<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
      credentials: "same-origin",
    }),
  );
}

export async function refreshSession(sessionId: string) {
  return toSession(
    await api<TokenResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId }),
      credentials: "same-origin",
    }),
  );
}

export function revokeSession(sessionId: string) {
  return api<void>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId }),
    credentials: "same-origin",
  });
}

export function getCurrentUser(request: ApiRequest) {
  return request<User>("/auth/me");
}
