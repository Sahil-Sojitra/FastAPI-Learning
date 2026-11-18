"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { api, type User } from "./api-client";
import { Board } from "./board";
import { Brand } from "./brand";
import { Icon } from "./icons";

const sessionKey = "taskboard.access-token";

function readSavedToken() {
  try {
    return sessionStorage.getItem(sessionKey);
  } catch {
    return null;
  }
}

function saveToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(sessionKey, token);
    else sessionStorage.removeItem(sessionKey);
  } catch {
    // The active session still works when the browser blocks storage.
  }
}

function expiresAt(token: string) {
  try {
    const encoded = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const { exp } = JSON.parse(atob(encoded));
    return typeof exp === "number" && Number.isFinite(exp) ? exp * 1000 : null;
  } catch {
    return null;
  }
}

function SubscribeToExpiry({
  token,
  expire,
}: {
  token: string;
  expire: () => void;
}) {
  useEffect(() => {
    const expiry = expiresAt(token);
    if (expiry === null) return;
    const check = () => {
      if (Date.now() >= expiry) expire();
    };
    const timer = window.setTimeout(check, Math.max(0, expiry - Date.now()));
    window.addEventListener("pageshow", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pageshow", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [token, expire]);
  return null;
}

export default function Home() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const active = useRef<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const saved = readSavedToken();
      const expiry = saved ? expiresAt(saved) : null;
      if (expiry !== null && expiry <= Date.now()) {
        saveToken(null);
        setNotice("Your session expired. Sign in to continue.");
        setToken(null);
        return;
      }
      active.current = saved;
      setToken(saved);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const endSession = useCallback(
    (expired = false) => {
      if (!token || active.current !== token) return;
      active.current = null;
      saveToken(null);
      setNotice(
        expired
          ? "Your session expired. Sign in to continue."
          : "You’re signed out.",
      );
      setToken(null);
    },
    [token],
  );

  const expire = useCallback(() => endSession(true), [endSession]);

  if (token === undefined)
    return (
      <main className="launch" aria-busy="true">
        <Brand />
        <p role="status">Opening your workspace…</p>
      </main>
    );
  if (token)
    return (
      <>
        <SubscribeToExpiry token={token} expire={expire} />
        <Board key={token} token={token} onSignOut={endSession} />
      </>
    );
  return (
    <Auth
      notice={notice}
      onLogin={(next) => {
        active.current = next;
        saveToken(next);
        setNotice("");
        setToken(next);
      }}
    />
  );
}

function Auth({
  notice,
  onLogin,
}: {
  notice: string;
  onLogin: (token: string) => void;
}) {
  const [register, setRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const fields = new FormData(event.currentTarget);
    const body = JSON.stringify({
      email: String(fields.get("email")).trim(),
      password: fields.get("password"),
    });
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      if (register) {
        await api<User>("/auth/register", { method: "POST", body });
        setRegister(false);
      }
      const result = await api<{ access_token: string }>("/auth/login", {
        method: "POST",
        body,
      });
      onLogin(result.access_token);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not complete sign-in.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <Brand />
        <div className="auth-content">
          <h1>{register ? "Create your account" : "Welcome back"}</h1>
          <p className="muted">
            {register
              ? "Open a private workspace for your tasks."
              : "Sign in to pick up where you left off."}
          </p>
          {notice && !error && (
            <p className="feedback" role="status">
              {notice}
            </p>
          )}
          <form onSubmit={submit} className="form" aria-busy={busy}>
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </label>
            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={register ? "new-password" : "current-password"}
                minLength={register ? 8 : undefined}
                placeholder={
                  register ? "At least 8 characters" : "Your password"
                }
                required
              />
              <button
                type="button"
                className="icon-button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((value) => !value)}
              >
                <Icon name={showPassword ? "eyeOff" : "eye"} />
              </button>
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary auth-submit" disabled={busy}>
              {busy
                ? register
                  ? "Creating account…"
                  : "Signing in…"
                : register
                  ? "Create account"
                  : "Sign in"}
              <Icon name="arrow" />
            </button>
          </form>
          <p className="auth-switch">
            {register ? "Already have an account?" : "New to Taskboard?"}{" "}
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                setRegister(!register);
                setShowPassword(false);
                setError("");
              }}
            >
              {register ? "Sign in" : "Create an account"}
            </button>
          </p>
        </div>
        <p className="auth-footer">
          <Icon name="lock" /> Your tasks are private to your account.
        </p>
      </section>
      <aside className="auth-art" aria-hidden="true">
        <div className="art-content">
          <h2>
            See what’s next.
            <br />
            Finish what matters.
          </h2>
          <div className="art-board">
            <div className="art-header">
              <span>Project launch</span>
              <span>
                <i /> In progress
              </span>
            </div>
            <div className="art-columns">
              {["To do", "In progress", "Done"].map((step, index) => (
                <div className="art-column" key={step}>
                  <strong>
                    <i
                      className={`dot ${["TODO", "IN_PROGRESS", "DONE"][index]}`}
                    />
                    {step}
                  </strong>
                  <div className="art-card">
                    <span>
                      {
                        [
                          "Write the launch brief",
                          "Review the first draft",
                          "Gather feedback",
                        ][index]
                      }
                    </span>
                    <i />
                    <i />
                  </div>
                  {index !== 1 && (
                    <div className="art-card art-card-small">
                      <i />
                      <i />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
