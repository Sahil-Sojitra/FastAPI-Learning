"use client";

import { useRef, useState, type FormEvent } from "react";
import { registerAccount, signIn } from "../auth-api";
import type { SessionCredentials } from "../session-storage";
import { Icon } from "@/components/ui/icon";
import { Button, IconButton } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

export function AuthForm({
  notice,
  onLogin,
}: {
  notice: string;
  onLogin: (credentials: SessionCredentials) => void;
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
    const credentials = {
      email: String(fields.get("email")).trim(),
      password: String(fields.get("password")),
    };
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      if (register) {
        await registerAccount(credentials);
        setRegister(false);
      }
      onLogin(await signIn(credentials));
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
    <div className="auth-content">
      <h1 id="auth-heading">
        {register ? "Create your account" : "Welcome back"}
      </h1>
      <p className="muted">
        {register
          ? "Create an account to start tracking your tickets."
          : "Sign in to view and manage your tickets."}
      </p>
      {notice && !error && <Notice tone="info">{notice}</Notice>}
      <form onSubmit={submit} className="form" aria-busy={busy}>
        <label>
          Email address
          <span className="field-icon">
            <Icon name="mail" />
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </span>
        </label>
        <label htmlFor="password">Password</label>
        <div className="password-field field-icon">
          <Icon name="lock" />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete={register ? "new-password" : "current-password"}
            minLength={register ? 8 : undefined}
            placeholder={register ? "At least 8 characters" : "Your password"}
            required
          />
          <IconButton
            icon={showPassword ? "eyeOff" : "eye"}
            label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((value) => !value)}
          />
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <Button
          type="submit"
          tone="primary"
          busy={busy}
          className="auth-submit"
        >
          {busy
            ? register
              ? "Creating account…"
              : "Signing in…"
            : register
              ? "Create account"
              : "Sign in"}
          {!busy && <Icon name="arrow" />}
        </Button>
      </form>
      <div className="auth-switch">
        <span>
          {register ? "Already have an account?" : "New to Taskboard?"}
        </span>
        <Button
          tone="ghost"
          className="text-button"
          disabled={busy}
          onClick={() => {
            setRegister(!register);
            setShowPassword(false);
            setError("");
          }}
        >
          {register ? "Sign in" : "Create an account"}
        </Button>
      </div>
    </div>
  );
}
