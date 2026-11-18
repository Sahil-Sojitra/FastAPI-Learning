"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { StatusLabel } from "@/features/tasks/components/task-status";
import { labels, statuses, type Status } from "@/features/tasks/task";

const tickets: ReadonlyArray<{ id: number; title: string; status: Status }> = [
  { id: 24, title: "Review mobile sign-in", status: "IN_PROGRESS" },
  { id: 23, title: "Update the release checklist", status: "TODO" },
  { id: 22, title: "Document the support handoff", status: "TODO" },
  { id: 21, title: "Confirm the rollout window", status: "DONE" },
];

export function AuthPreview() {
  const [filter, setFilter] = useState<Status | null>(null);
  const visible = filter
    ? tickets.filter((ticket) => ticket.status === filter)
    : tickets;

  return (
    <aside className="auth-preview" aria-labelledby="preview-heading">
      <div className="preview-intro">
        <span className="preview-emblem">
          <Icon name="board" />
        </span>
        <div>
          <h2 id="preview-heading">Ticket queue</h2>
          <p>Try filtering an example workspace.</p>
        </div>
      </div>
      <div className="preview-queue">
        <header className="preview-queue-header">
          <strong>
            <Icon name="layers" /> Product launch
          </strong>
          <span>Sample data</span>
        </header>
        <div
          className="preview-filters"
          role="group"
          aria-label="Sample ticket status"
        >
          <Button
            tone="ghost"
            aria-pressed={filter === null}
            onClick={() => setFilter(null)}
          >
            All
          </Button>
          {statuses.map((status) => (
            <Button
              key={status}
              tone="ghost"
              aria-pressed={filter === status}
              onClick={() => setFilter(status)}
            >
              {labels[status]}
            </Button>
          ))}
        </div>
        <ul className="preview-tickets" aria-label="Sample tickets">
          {visible.map((ticket) => (
            <li key={ticket.id}>
              <div className="preview-ticket-title">
                <span>TB-{ticket.id}</span>
                <strong>{ticket.title}</strong>
              </div>
              <span
                className="preview-ticket-status"
                data-status={ticket.status}
              >
                <StatusLabel status={ticket.status} />
              </span>
            </li>
          ))}
        </ul>
        <p className="preview-count" role="status">
          {visible.length} of {tickets.length} sample tickets
        </p>
      </div>
    </aside>
  );
}
