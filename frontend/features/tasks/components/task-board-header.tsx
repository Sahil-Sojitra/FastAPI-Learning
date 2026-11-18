import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export function TaskBoardHeader({
  disabled,
  onAi,
  onCreate,
  onCommands,
}: {
  disabled: boolean;
  onAi: () => void;
  onCreate: () => void;
  onCommands: () => void;
}) {
  return (
    <>
      <div className="workspace-topbar">
        <div className="workspace-trail">
          <Icon name="layers" />
          <span>Workspace</span>
          <Icon name="chevron" className="trail-chevron" />
          <strong>My tasks</strong>
        </div>
        <Button
          tone="secondary"
          icon="search"
          className="command-launch"
          aria-keyshortcuts="Control+K Meta+K"
          onClick={onCommands}
        >
          Quick search <kbd>Ctrl K</kbd>
        </Button>
      </div>
      <header className="board-header">
        <div className="board-heading">
          <h1>My tasks</h1>
        </div>
        <div className="header-actions">
          <Button icon="sparkle" disabled={disabled} onClick={onAi}>
            AI breakdown
          </Button>
          <Button
            tone="primary"
            icon="plus"
            disabled={disabled}
            aria-keyshortcuts="Alt+N"
            title="New task (Alt+N)"
            onClick={onCreate}
          >
            New task
          </Button>
        </div>
      </header>
    </>
  );
}
