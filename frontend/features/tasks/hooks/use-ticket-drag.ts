"use client";

import { useCallback, useState, type DragEvent } from "react";
import type { Status, Task } from "../task";

export function useTicketDrag(
  move: (task: Task, status: Status) => Promise<void>,
) {
  const [ticket, setTicket] = useState<Task | null>(null);
  const [target, setTarget] = useState<Status | null>(null);

  const end = useCallback(() => {
    setTicket(null);
    setTarget(null);
  }, []);

  const start = useCallback((event: DragEvent<HTMLElement>, task: Task) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(
      "application/x-taskboard-ticket",
      String(task.id),
    );
    setTicket(task);
  }, []);

  function over(event: DragEvent<HTMLElement>, status: Status) {
    if (
      !ticket ||
      ticket.status === status ||
      !event.dataTransfer.types.includes("application/x-taskboard-ticket")
    )
      return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (target !== status) setTarget(status);
  }

  function leave(event: DragEvent<HTMLElement>, status: Status) {
    if (target !== status) return;
    if (
      event.relatedTarget instanceof Node &&
      event.currentTarget.contains(event.relatedTarget)
    )
      return;
    setTarget(null);
  }

  function drop(event: DragEvent<HTMLElement>, status: Status) {
    if (
      !ticket ||
      event.dataTransfer.getData("application/x-taskboard-ticket") !==
        String(ticket.id)
    )
      return;
    event.preventDefault();
    end();
    if (ticket.status !== status) void move(ticket, status);
  }

  return { ticket, target, start, end, over, leave, drop };
}

export type TicketDrag = ReturnType<typeof useTicketDrag>;
