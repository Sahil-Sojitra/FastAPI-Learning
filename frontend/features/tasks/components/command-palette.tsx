"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { Icon, type IconName } from "@/components/ui/icon";
import { labels, type Task } from "../task";

export function CommandPalette({
  tasks,
  ready,
  close,
  onCreate,
  onAi,
  onTicket,
}: {
  tasks: Task[];
  ready: boolean;
  close: () => void;
  onCreate: () => void;
  onAi: () => void;
  onTicket: (task: Task) => void;
}) {
  const listId = useId();
  const [search, setSearch] = useState("");
  const [index, setIndex] = useState(0);
  const query = search.trim().toLowerCase();
  type Result = {
    key: string;
    title: string;
    detail: string;
    icon: IconName;
    run: () => void;
  };
  const actions: Result[] = ready
    ? [
        {
          key: "create",
          title: "New task",
          detail: "Action",
          icon: "plus",
          run: onCreate,
        },
        {
          key: "ai",
          title: "AI breakdown",
          detail: "Action",
          icon: "sparkle",
          run: onAi,
        },
      ]
    : [];
  const items = [
    ...actions.filter((action) => action.title.toLowerCase().includes(query)),
    ...tasks
      .filter((task) =>
        `tb-${task.id} ${task.title.toLowerCase()}`.includes(query),
      )
      .slice(0, 8)
      .map((task): Result => ({
        key: String(task.id),
        title: task.title,
        detail: `TB-${task.id} · ${labels[task.status]}`,
        icon: "ticket",
        run: () => onTicket(task),
      })),
  ];
  const active = Math.min(index, Math.max(0, items.length - 1));

  function navigate(event: KeyboardEvent<HTMLInputElement>) {
    if (!items.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next =
        (active + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
        items.length;
      setIndex(next);
      document
        .getElementById(`${listId}-${next}`)
        ?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      items[active].run();
    }
  }

  return (
    <Modal
      title="Quick search"
      icon="search"
      close={close}
      busy={false}
      variant="command"
    >
      <input
        autoFocus
        role="combobox"
        type="text"
        aria-label="Search actions and loaded tickets"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded="true"
        aria-activedescendant={items.length ? `${listId}-${active}` : undefined}
        onKeyDown={navigate}
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setIndex(0);
        }}
        placeholder="Search actions and loaded tickets…"
      />
      <div
        className="command-results"
        role="listbox"
        id={listId}
        aria-label="Search results"
      >
        {items.map((item, position) => (
          <div
            key={item.key}
            className="command-result"
            role="option"
            id={`${listId}-${position}`}
            aria-selected={position === active}
            onPointerMove={() => setIndex(position)}
            onClick={item.run}
          >
            <Icon name={item.icon} />
            <span>
              <strong>{item.title}</strong>
              <small>{item.detail}</small>
            </span>
            <Icon name="arrow" className="result-arrow" />
          </div>
        ))}
      </div>
      {!items.length && (
        <p className="command-empty" role="status">
          No actions or loaded tickets match.
        </p>
      )}
      <div className="command-footer">
        <span>
          <kbd>↑</kbd> <kbd>↓</kbd> Navigate
        </span>
        <span>
          <kbd>Enter</kbd> Open
        </span>
        <span>
          <kbd>Esc</kbd> Close
        </span>
      </div>
    </Modal>
  );
}
