import { IconButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { labels, type Status, type Task } from "../task";
import { StatusMarker, statusIcon } from "./task-status";
import { TaskCard } from "./task-card";
import type { TicketDrag } from "../hooks/use-ticket-drag";

export function TaskColumn({
  status,
  tasks,
  query,
  pending,
  loading,
  onCreate,
  onMove,
  onDelete,
  onOpen,
  drag,
}: {
  status: Status;
  tasks: Task[];
  query: string;
  pending: ReadonlySet<number>;
  loading: boolean;
  onCreate?: () => void;
  onMove: (task: Task, status: Status) => Promise<void>;
  onDelete: (task: Task) => void;
  onOpen: (task: Task) => void;
  drag?: TicketDrag;
}) {
  return (
    <section
      className="column"
      aria-label={labels[status]}
      data-status={status}
      data-drop-active={drag?.target === status || undefined}
      onDragOver={drag ? (event) => drag.over(event, status) : undefined}
      onDragLeave={drag ? (event) => drag.leave(event, status) : undefined}
      onDrop={drag ? (event) => drag.drop(event, status) : undefined}
    >
      <header className="column-header">
        <h2>
          <StatusMarker status={status} />
          {labels[status]}
          <span className="count">{tasks.length}</span>
        </h2>
        {onCreate && (
          <IconButton
            icon="plus"
            label="Add task to To do"
            disabled={loading}
            onClick={onCreate}
          />
        )}
      </header>
      <div className="column-body">
        {tasks.length === 0 ? (
          <div className="empty">
            <span className="empty-icon">
              <Icon name={query ? "search" : statusIcon[status]} />
            </span>
            <div>
              <strong>
                {query
                  ? "No matching tasks"
                  : status === "TODO"
                    ? "Nothing to do yet"
                    : status === "DONE"
                      ? "No completed tasks"
                      : "Nothing in progress"}
              </strong>
              <p>
                {query
                  ? "Try a different search."
                  : status === "TODO"
                    ? "Add a task to get started."
                    : status === "DONE"
                      ? "Finished tasks appear here."
                      : "Tasks you start appear here."}
              </p>
            </div>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              saving={pending.has(task.id)}
              loading={loading}
              onMove={onMove}
              onDelete={onDelete}
              onOpen={onOpen}
              onDragStart={drag?.start}
              onDragEnd={drag?.end}
              dragging={drag?.ticket?.id === task.id}
            />
          ))
        )}
      </div>
    </section>
  );
}
