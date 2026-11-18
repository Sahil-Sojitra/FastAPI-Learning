import { labels, statuses, type Status } from "../task";
import { StatusMarker } from "./task-status";

export function TaskSummary({
  counts,
  total,
  loaded,
  hasMore,
  filter,
  onFilter,
}: {
  counts: Record<Status, number>;
  total: number;
  loaded: boolean;
  hasMore: boolean;
  filter: Status | null;
  onFilter: (status: Status | null) => void;
}) {
  const progress = total ? Math.round((counts.DONE / total) * 100) : 0;
  return (
    <section
      className="stats"
      aria-label={hasMore ? "Progress for loaded tasks" : "Task progress"}
    >
      {statuses.map((status) => (
        <button
          type="button"
          className="stat stat-filter"
          aria-label={`Filter by ${labels[status]}`}
          aria-pressed={filter === status}
          disabled={!loaded}
          key={status}
          onClick={() => onFilter(filter === status ? null : status)}
        >
          <StatusMarker status={status} />
          <div className="stat-content">
            <span>{labels[status]}</span>
            <strong>{loaded ? counts[status] : "—"}</strong>
          </div>
        </button>
      ))}
      <div className="stat progress-stat">
        <div className="progress-heading">
          <span>{hasMore ? "Loaded progress" : "Completion"}</span>
          <strong>{loaded ? `${progress}%` : "—"}</strong>
        </div>
        <progress
          max={100}
          value={progress}
          aria-label="Completion percentage"
        />
        <p>
          {loaded
            ? `${counts.DONE} of ${total} tasks done`
            : "Waiting for tasks"}
        </p>
      </div>
    </section>
  );
}
