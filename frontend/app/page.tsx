"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, labels, statuses, type User } from "./api-client";
import { Board } from "./board";
import { Brand } from "./brand";

const sessionKey = "taskboard.access-token";
type Session = { token: string; user: User };

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const token = sessionStorage.getItem(sessionKey);
    async function restore() {
      try {
        if (token) {
          const user = await api<User>(
            "/auth/me",
            { signal: controller.signal },
            token,
          );
          if (!controller.signal.aborted) setSession({ token, user });
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) {
          sessionStorage.removeItem(sessionKey);
          setMessage("Your session expired. Please sign in again.");
        } else {
          setMessage(
            error instanceof Error
              ? error.message
              : "Could not restore your session.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void restore();
    return () => controller.abort();
  }, []);

  function signOut(token: string, expired = false) {
    if (sessionStorage.getItem(sessionKey) !== token) return;
    sessionStorage.removeItem(sessionKey);
    setSession(null);
    setMessage(expired ? "Your session expired. Please sign in again." : "");
  }

  if (loading)
    return (
      <main className="loading" role="status">
        Opening Taskboard…
      </main>
    );
  if (session)
    return (
      <Board
        key={session.token}
        {...session}
        signOut={(expired) => signOut(session.token, expired)}
      />
    );
  return (
    <Auth
      notice={message}
      onLogin={(next) => {
        sessionStorage.setItem(sessionKey, next.token);
        setMessage("");
        setSession(next);
      }}
    />
  );
}

function Auth({
  notice,
  onLogin,
}: {
  notice: string;
  onLogin: (session: Session) => void;
}) {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(notice);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const body = JSON.stringify({
      email: fields.get("email"),
      password: fields.get("password"),
    });
    setBusy(true);
    setError("");
    try {
      if (register) {
        await api<User>("/auth/register", { method: "POST", body });
        setRegister(false);
      }
      const { access_token: token } = await api<{ access_token: string }>(
        "/auth/login",
        { method: "POST", body },
      );
      const user = await api<User>("/auth/me", {}, token);
      onLogin({ token, user });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
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
              ? "Set up your personal task board."
              : "Sign in to open your task board."}
          </p>
          <form onSubmit={submit} className="form">
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
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                minLength={register ? 8 : undefined}
                placeholder={
                  register ? "At least 8 characters" : "Your password"
                }
                required
              />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary" disabled={busy}>
              {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
            </button>
          </form>
          <p className="auth-switch">
            {register ? "Already have an account?" : "New to Taskboard?"}{" "}
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                setRegister(!register);
                setError("");
              }}
            >
              {register ? "Sign in" : "Create an account"}
            </button>
          </p>
        </div>
      </section>
      <aside className="auth-art" aria-hidden="true">
        <div className="art-content">
          <h2>
            Make big tasks
            <br />
            feel manageable.
          </h2>
          <div className="art-board">
            {statuses.map((status, index) => (
              <div className="art-column" key={status}>
                <strong>
                  <i className={`dot ${status}`} />
                  {labels[status]}
                </strong>
                <div className="art-card">
                  <span />
                  {
                    [
                      "Draft project brief",
                      "Build the board",
                      "Set up workspace",
                    ][index]
                  }
                </div>
                {index === 0 && (
                  <div className="art-card">
                    <span />
                    Review next steps
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </main>
  );
}
