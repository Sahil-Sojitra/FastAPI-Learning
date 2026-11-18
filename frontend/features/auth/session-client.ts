import {
  api,
  ApiError,
  type ApiRequest,
  type ApiOptions,
} from "@/lib/http-client";
import { refreshSession, revokeSession } from "./auth-api";
import { expiresAt, type SessionCredentials } from "./session-storage";

export type SessionClient = {
  id: string;
  request: ApiRequest;
  signOut: () => Promise<void>;
};

export function createSessionClient(
  initial: SessionCredentials,
  onRefresh: (credentials: SessionCredentials) => void,
  onExpired: () => void,
): SessionClient {
  const id = initial.sessionId;
  let current = initial;
  let closed = false;
  let pending: Promise<SessionCredentials> | null = null;

  async function withLock<T>(operation: () => Promise<T>): Promise<T> {
    // A duplicated tab can share this cookie. Only that session's rotations are serialized.
    return navigator.locks
      ? await navigator.locks.request(`taskboard-session:${id}`, operation)
      : operation();
  }

  function checkOpen(signal?: AbortSignal) {
    signal?.throwIfAborted();
    if (closed) throw new DOMException("Session ended", "AbortError");
  }

  function renew(observed: SessionCredentials) {
    checkOpen();
    if (current !== observed) return Promise.resolve(current);
    if (!pending) {
      pending = withLock(() => {
        checkOpen();
        return refreshSession(id);
      })
        .then((next) => {
          checkOpen();
          if (next.sessionId !== id)
            throw new ApiError(401, "Invalid refresh session");
          current = next;
          onRefresh(next);
          return next;
        })
        .catch((error) => {
          if (!closed && error instanceof ApiError && error.status === 401) {
            closed = true;
            onExpired();
          }
          throw error;
        })
        .finally(() => {
          pending = null;
        });
    }
    return pending;
  }

  const request: ApiRequest = async <T>(
    path: string,
    options: ApiOptions = {},
  ): Promise<T> => {
    const attempt = (credentials: SessionCredentials) => {
      checkOpen(options.signal ?? undefined);
      return api<T>(path, options, credentials.accessToken);
    };

    checkOpen(options.signal ?? undefined);
    const observed = current;
    const expiry = expiresAt(observed.accessToken);
    if (expiry !== null && expiry <= Date.now())
      return attempt(await renew(observed));

    try {
      return await attempt(observed);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      checkOpen(options.signal ?? undefined);
      // Authentication rejects the request before its handler runs, so one replay is safe.
      return attempt(await renew(observed));
    }
  };

  async function signOut() {
    closed = true;
    // Let any rotated cookie arrive before asking the server to revoke it.
    if (pending) await pending.catch(() => undefined);
    await withLock(() => revokeSession(id));
  }

  return { id, request, signOut };
}
