import { Brand } from "@/components/brand/brand";
import { AccountMenu } from "@/features/auth/components/account-menu";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export function TaskSidebar({
  email,
  disabled,
  onAi,
  onSignOut,
}: {
  email?: string;
  disabled: boolean;
  onAi: () => void;
  onSignOut: () => void;
}) {
  return (
    <aside className="sidebar">
      <Brand />
      <nav className="side-nav" aria-label="Workspace">
        <p className="side-label">Workspace</p>
        <a href="#tasks" aria-current="page">
          <Icon name="board" /> My tasks
        </a>
        <Button tone="ghost" icon="sparkle" disabled={disabled} onClick={onAi}>
          AI breakdown
        </Button>
      </nav>
      <div className="account">
        <AccountMenu email={email} signOut={onSignOut} />
      </div>
    </aside>
  );
}
