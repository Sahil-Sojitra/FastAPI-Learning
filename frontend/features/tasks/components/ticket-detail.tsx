import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import { labels, statuses, type Status, type Task } from "../task";
import { StatusMarker } from "./task-status";
import { taskDate } from "../task-date";

export function TicketDetail({
  task,
  busy,
  close,
  error,
  onMove,
  onAi,
  onDelete,
}: {
  task: Task;
  busy: boolean;
  close: () => void;
  error?: string;
  onMove: (task: Task, status: Status) => Promise<void>;
  onAi: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  return (
    <Modal
      title={`Ticket TB-${task.id}`}
      icon="ticket"
      close={close}
      busy={false}
      variant="drawer"
    >
      <div className="ticket-detail">
        <h3>{task.title}</h3>
        <dl>
          <div>
            <dt>Status</dt>
            <dd>
              <StatusMarker status={task.status} /> {labels[task.status]}
            </dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{taskDate(task.created_at) ?? "Unavailable"}</dd>
          </div>
        </dl>
        {error && <Notice tone="error">{error}</Notice>}
        <section aria-label="Update ticket status">
          <h4>Move ticket</h4>
          <div className="ticket-actions">
            {statuses.map((status) => (
              <Button
                key={status}
                aria-pressed={task.status === status}
                disabled={busy || task.status === status}
                onClick={() => void onMove(task, status)}
              >
                <StatusMarker status={status} />
                {labels[status]}
              </Button>
            ))}
          </div>
        </section>
        <section className="ticket-ai">
          <h4>Break this ticket down</h4>
          <p>
            Turn the title into a draft list of actionable tasks. Review it
            before anything is created.
          </p>
          <Button
            icon="sparkle"
            tone="primary"
            disabled={busy}
            onClick={() => onAi(task)}
          >
            Draft next steps
          </Button>
        </section>
        <Button
          tone="ghost"
          className="ticket-delete"
          icon="trash"
          disabled={busy}
          onClick={() => onDelete(task)}
        >
          Delete task
        </Button>
      </div>
    </Modal>
  );
}
