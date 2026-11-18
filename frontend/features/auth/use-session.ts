"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSessionClient, type SessionClient } from "./session-client";
import {
  clearLegacySession,
  readSavedSession,
  saveSession,
  type SessionCredentials,
} from "./session-storage";

export function useSession() {
  const [session, setSession] = useState<SessionClient | null | undefined>(
    undefined,
  );
  const active = useRef<SessionClient | null>(null);
  const [notice, setNotice] = useState("");

  const startSession = useCallback((credentials: SessionCredentials) => {
    const client = createSessionClient(
      credentials,
      (next) => {
        if (active.current === client) saveSession(next);
      },
      () => {
        if (active.current !== client) return;
        active.current = null;
        saveSession(null);
        setNotice("Your session ended. Sign in to continue.");
        setSession(null);
      },
    );
    active.current = client;
    saveSession(credentials);
    setNotice("");
    setSession(client);
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const saved = readSavedSession();
      const hadLegacySession = clearLegacySession();
      if (saved) startSession(saved);
      else {
        if (hadLegacySession)
          setNotice("Sign in again once to enable automatic session renewal.");
        setSession(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [startSession]);

  const endSession = useCallback(() => {
    const client = active.current;
    if (!client) return;
    active.current = null;
    saveSession(null);
    setNotice("You’re signed out.");
    setSession(null);
    void client.signOut().catch(() => {
      if (!active.current)
        setNotice(
          "Signed out on this tab. The server couldn’t confirm sign-out.",
        );
    });
  }, []);

  return { session, notice, startSession, endSession };
}
