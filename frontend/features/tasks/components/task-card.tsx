import { memo } from "react";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/button";
import type { Status, Task } from "../task";
import { StatusMenu } from "./status-menu";
import { taskDate } from "../task-date";
import type { TicketDrag } from "../hooks/use-ticket-drag";

export const TaskCard = memo(function TaskCard({
  task,
  saving,
  loading,
  onMove,
  onDelete,
  onOpen,
  onDragStart,
  onDragEnd,
  dragging,
}: {
  task: Task;
  saving: boolean;
  loading: boolean;
  onMove: (task: Task, status: Status) => Promise<void>;
  onDelete: (task: Task) => void;
  onOpen: (task: Task) => void;
  onDragStart?: TicketDrag["start"];
  onDragEnd?: TicketDrag["end"];
  dragging: boolean;
}) {
  const date = taskDate(task.created_at);
  const startDrag = saving || loading ? undefined : onDragStart;
  return (
    <article
      className="task-card"
      id={`task-card-${task.id}`}
      tabIndex={-1}
      draggable={Boolean(startDrag)}
      onDragStart={startDrag ? (event) => startDrag(event, task) : undefined}
      onDragEnd={onDragEnd}
      data-dragging={dragging || undefined}
    >
      <div className="task-heading">
        <div>
          <span className="ticket-key">
            <Icon name="ticket" /> TB-{task.id}
          </span>
          <h3>
            <button
              type="button"
              className="ticket-open"
              onClick={() => onOpen(task)}
            >
              {task.title}
            </button>
          </h3>
        </div>
        <div className="card-actions">
          {startDrag && (
            <span className="ticket-grip" aria-hidden="true">
              <Icon name="grip" />
            </span>
          )}
          <IconButton
            className="delete-button"
            icon="trash"
            label={`Delete ${task.title}`}
            title="Delete task"
            disabled={saving || loading}
            onClick={() => onDelete(task)}
          />
        </div>
      </div>
      <div className="task-meta">
        <StatusMenu
          task={task}
          disabled={saving || loading}
          onMove={(item, status) => void onMove(item, status)}
        />
        {saving ? (
          <span className="task-saving" role="status">
            <span className="spinner" /> Saving
          </span>
        ) : (
          date && (
            <span className="task-date">
              <Icon name="calendar" /> {date}
            </span>
          )
        )}
      </div>
    </article>
  );
});
