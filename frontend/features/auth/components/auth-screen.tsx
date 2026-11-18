import { Brand } from "@/components/brand/brand";
import { Icon } from "@/components/ui/icon";
import { AuthForm } from "./auth-form";
import { AuthPreview } from "./auth-preview";
import type { SessionCredentials } from "../session-storage";

export function AuthScreen({
  notice,
  onLogin,
}: {
  notice: string;
  onLogin: (credentials: SessionCredentials) => void;
}) {
  return (
    <main className="auth-shell">
      <div className="auth-frame">
        <div className="auth-brand">
          <Brand />
        </div>
        <div className="auth-grid">
          <section className="auth-panel" aria-labelledby="auth-heading">
            <AuthForm notice={notice} onLogin={onLogin} />
            <p className="auth-footer">
              <Icon name="lock" /> Your tickets are private to your account.
            </p>
          </section>
          <AuthPreview />
        </div>
      </div>
    </main>
  );
}
