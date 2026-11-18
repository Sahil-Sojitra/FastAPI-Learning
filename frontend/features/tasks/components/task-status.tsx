import { labels, type Status } from "../task";
import { Icon } from "@/components/ui/icon";

export const statusIcon = {
  TODO: "circle",
  IN_PROGRESS: "progress",
  DONE: "check",
} as const;

export function StatusMarker({ status }: { status: Status }) {
  return (
    <span className="status-marker" data-status={status} aria-hidden="true">
      <Icon name={statusIcon[status]} />
    </span>
  );
}

export function StatusLabel({ status }: { status: Status }) {
  return (
    <>
      <StatusMarker status={status} />
      <span>{labels[status]}</span>
    </>
  );
}
