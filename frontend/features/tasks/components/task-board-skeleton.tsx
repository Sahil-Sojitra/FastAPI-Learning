import { statuses } from "../task";

export function TaskBoardSkeleton() {
  return (
    <div className="columns" role="status" aria-label="Loading tasks">
      {statuses.map((status) => (
        <div className="column" key={status}>
          <span className="skeleton skeleton-heading" />
          <span className="skeleton skeleton-card" />
          <span className="skeleton skeleton-card" />
        </div>
      ))}
    </div>
  );
}
