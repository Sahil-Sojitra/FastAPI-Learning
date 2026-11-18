"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { labels, statuses, type Status, type Task } from "../task";
import { StatusLabel } from "./task-status";

export function StatusMenu({
  task,
  disabled,
  onMove,
}: {
  task: Task;
  disabled: boolean;
  onMove: (task: Task, status: Status) => void;
}) {
  const moved = useRef(false);
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger asChild>
        <Button
          disabled={disabled}
          className="status-trigger"
          data-status={task.status}
          aria-label={`Status for ${task.title}: ${labels[task.status]}`}
        >
          <StatusLabel status={task.status} />
          <Icon name="chevrons" className="status-caret" />
        </Button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          className="pop-menu"
          align="start"
          sideOffset={7}
          collisionPadding={10}
          onCloseAutoFocus={(event) => {
            if (!moved.current) return;
            event.preventDefault();
            moved.current = false;
            if (document.activeElement === document.body) {
              document
                .getElementById(`task-card-${task.id}`)
                ?.focus({ preventScroll: true });
            }
          }}
        >
          <Menu.Label className="menu-label">Move to</Menu.Label>
          <Menu.RadioGroup
            value={task.status}
            onValueChange={(value) => {
              if (value !== task.status) {
                moved.current = true;
                onMove(task, value as Status);
              }
            }}
          >
            {statuses.map((status) => (
              <Menu.RadioItem className="menu-item" value={status} key={status}>
                <StatusLabel status={status} />
                <Menu.ItemIndicator className="menu-indicator">
                  <Icon name="check" />
                </Menu.ItemIndicator>
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
