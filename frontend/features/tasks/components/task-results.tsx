import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { labels, type Status } from "../task";

export function TaskResultHeading({
  shown,
  total,
  loaded,
  hasMore,
  status,
  onClearStatus,
}: {
  shown: number;
  total: number;
  loaded: boolean;
  hasMore: boolean;
  status: Status | null;
  onClearStatus: () => void;
}) {
  return (
    <div className="task-area-heading">
      <div className="task-heading-count">
        <h2>Tickets</h2>
        {loaded && (
          <span className="result-count" role="status">
            {shown !== total ? `${shown} of ${total}` : shown}
            {hasMore ? " loaded" : ""}
          </span>
        )}
      </div>
      {status && (
        <Button
          className="active-status-filter"
          tone="secondary"
          icon="close"
          aria-label="Clear status filter"
          onClick={onClearStatus}
        >
          {labels[status]}
        </Button>
      )}
    </div>
  );
}

export function TaskResultsEmpty({
  hasMore,
  onReset,
}: {
  hasMore: boolean;
  onReset: () => void;
}) {
  return (
    <div className="task-results-empty">
      <span className="empty-icon">
        <Icon name="search" />
      </span>
      <div>
        <p>No matching tickets</p>
        <span>
          {hasMore
            ? "Only loaded tickets were searched. Clear your filters or load more below."
            : "Try another search or clear your filters."}
        </span>
      </div>
      <Button onClick={onReset}>Clear filters</Button>
    </div>
  );
}
