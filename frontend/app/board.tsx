"use client";

import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { labels, statuses, type Status, type Task } from "./api-client";
import { Brand } from "./brand";
import { AiDialog, DeleteDialog, TaskDialog } from "./dialogs";
import { Icon } from "./icons";
import { useBoard } from "./use-board";

const statusIcon = {
  TODO: "circle",
  IN_PROGRESS: "progress",
  DONE: "check",
} as const;
type Dialog = "create" | "ai" | { task: Task };
type View = "board" | "list";
const dateFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function taskDate(value: string | null) {
  if (!value) return null;
  const date = new Date(/Z$|[+-]\d\d:\d\d$/i.test(value) ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? null : dateFormat.format(date);
}

export function Board({
  token,
  onSignOut,
}: {
  token: string;
  onSignOut: (expired?: boolean) => void;
}) {
  const board = useBoard(token, onSignOut);
  const [search, setSearch] = useState("");
  const query = useDeferredValue(search.trim().toLowerCase());
  const [view, setView] = useState<View>("board");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [feedback, setFeedback] = useState<{
    text: string;
    error?: boolean;
  } | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const ready = board.firstPage && !board.loading;

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      const target = event.target;
      if (
        dialog ||
        event.metaKey ||
        event.ctrlKey ||
        !event.altKey ||
        event.shiftKey ||
        event.repeat ||
        (target instanceof HTMLElement &&
          (target.isContentEditable ||
            /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)))
      )
        return;
      if (event.code === "Slash" && board.firstPage) {
        event.preventDefault();
        searchInput.current?.focus();
      }
      if (event.code === "KeyN" && ready) {
        event.preventDefault();
        setDialog("create");
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [dialog, board.firstPage, ready]);

  const { counts, groups } = useMemo(() => {
    const counts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
    const groups: Record<Status, Task[]> = {
      TODO: [],
      IN_PROGRESS: [],
      DONE: [],
    };
    for (const task of board.tasks) {
      counts[task.status]++;
      if (!query || task.title.toLowerCase().includes(query))
        groups[task.status].push(task);
    }
    return { counts, groups };
  }, [board.tasks, query]);

  const moveTask = board.move;
  const move = useCallback(
    async (task: Task, status: Status) => {
      try {
        await moveTask(task, status);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setFeedback({
          text:
            error instanceof Error ? error.message : "Could not move the task.",
          error: true,
        });
      }
    },
    [moveTask],
  );
  const openDelete = useCallback((task: Task) => setDialog({ task }), []);

  const closeDialog = () => setDialog(null);
  const progress = board.tasks.length
    ? Math.round((counts.DONE / board.tasks.length) * 100)
    : 0;

  return (
    <div className="workspace">
      <aside className="sidebar">
        <Brand />
        <nav className="side-nav" aria-label="Workspace">
          <p className="side-label">Workspace</p>
          <a href="#tasks" aria-current="page">
            <Icon name="board" /> My tasks
          </a>
          <button
            type="button"
            disabled={!ready}
            onClick={() => setDialog("ai")}
          >
            <Icon name="sparkle" /> AI breakdown
          </button>
        </nav>
        <div className="account">
          <span className="avatar" aria-hidden="true">
            {board.user?.email[0].toUpperCase() ?? "•"}
          </span>
          <div>
            <strong title={board.user?.email}>
              {board.user?.email ?? "Your account"}
            </strong>
            <span>Personal workspace</span>
          </div>
          <button
            className="icon-button signout"
            aria-label="Sign out"
            title="Sign out"
            onClick={() => board.signOut()}
          >
            <Icon name="logout" />
          </button>
        </div>
      </aside>
      <main className="dashboard" id="tasks">
        <header className="board-header">
          <div>
            <p className="eyebrow">
              <Icon name="board" /> Personal workspace
            </p>
            <h1>My tasks</h1>
            <p className="muted">
              Organize your work and see what needs your attention.
            </p>
          </div>
          <div className="header-actions">
            <button
              className="secondary"
              disabled={!ready}
              onClick={() => setDialog("ai")}
            >
              <Icon name="sparkle" /> AI breakdown
            </button>
            <button
              className="primary"
              disabled={!ready}
              aria-keyshortcuts="Alt+N"
              title="New task (Alt+N)"
              onClick={() => setDialog("create")}
            >
              <Icon name="plus" /> New task
            </button>
          </div>
        </header>
        <section
          className="stats"
          aria-label={
            board.hasMore ? "Progress for loaded tasks" : "Task progress"
          }
        >
          {statuses.map((status) => (
            <div className="stat" key={status}>
              <span className={`status-icon ${status}`}>
                <Icon name={statusIcon[status]} />
              </span>
              <div>
                <span>{labels[status]}</span>
                <strong>{board.firstPage ? counts[status] : "—"}</strong>
              </div>
            </div>
          ))}
          <div className="stat progress-stat">
            <div className="progress-heading">
              <span>{board.hasMore ? "Loaded progress" : "Completion"}</span>
              <strong>{board.firstPage ? `${progress}%` : "—"}</strong>
            </div>
            <progress
              max={100}
              value={progress}
              aria-label="Completion percentage"
            />
            <p>
              {board.firstPage
                ? `${counts.DONE} of ${board.tasks.length} tasks done`
                : "Waiting for tasks"}
            </p>
          </div>
        </section>
        <section className="task-area" aria-label="Tasks">
          <div className="toolbar">
            <div className="view-toggle" role="group" aria-label="Task layout">
              <button
                type="button"
                aria-pressed={view === "board"}
                onClick={() => setView("board")}
              >
                <Icon name="board" /> Board
              </button>
              <button
                type="button"
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
              >
                <Icon name="list" /> List
              </button>
            </div>
            <div className="toolbar-actions">
              <div className="search-field">
                <Icon name="search" />
                <input
                  ref={searchInput}
                  type="search"
                  aria-keyshortcuts="Alt+/"
                  title="Search tasks (Alt+/)"
                  aria-label={
                    board.hasMore ? "Search loaded tasks" : "Search tasks"
                  }
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={
                    board.hasMore ? "Search loaded tasks" : "Search tasks"
                  }
                  disabled={!board.firstPage}
                />
              </div>
              <button
                className="icon-button refresh"
                onClick={() => {
                  setFeedback(null);
                  void board.loadPage(true);
                }}
                disabled={!ready || board.pending.size > 0}
                aria-label="Refresh tasks"
                title="Refresh tasks"
              >
                <Icon name="refresh" />
              </button>
            </div>
          </div>
          {feedback && (
            <div
              className={
                feedback.error
                  ? "error board-feedback"
                  : "feedback board-feedback"
              }
              role={feedback.error ? "alert" : "status"}
            >
              {feedback.text}
              <button
                className="icon-button"
                aria-label="Dismiss message"
                onClick={() => setFeedback(null)}
              >
                <Icon name="close" />
              </button>
            </div>
          )}
          {board.loadError && (
            <div className="error board-feedback" role="alert">
              <span>{board.loadError}</span>
              {!board.firstPage && (
                <button
                  className="secondary"
                  onClick={() => void board.loadPage(true)}
                >
                  Try again
                </button>
              )}
            </div>
          )}
          {!board.firstPage && board.loading && (
            <div className="columns" role="status" aria-label="Loading tasks">
              {statuses.map((status) => (
                <div className="column" key={status}>
                  <span className="skeleton skeleton-heading" />
                  <span className="skeleton skeleton-card" />
                  <span className="skeleton skeleton-card" />
                </div>
              ))}
            </div>
          )}
          {board.firstPage && (
            <div
              className={view === "board" ? "columns" : "columns list-view"}
              aria-busy={board.loading || search.trim().toLowerCase() !== query}
            >
              {statuses.map((status) => (
                <section
                  className="column"
                  key={status}
                  aria-label={labels[status]}
                >
                  <header className="column-header">
                    <h2>
                      <i className={`dot ${status}`} />
                      {labels[status]}
                    </h2>
                    <span className="count">{groups[status].length}</span>
                  </header>
                  {groups[status].length === 0 ? (
                    <div className="empty">
                      <Icon name={statusIcon[status]} />
                      <p>
                        {query
                          ? "No matching tasks"
                          : `No ${status === "DONE" ? "completed" : status === "TODO" ? "pending" : "active"} tasks`}
                      </p>
                      {!query && status === "TODO" && (
                        <button
                          className="text-button"
                          disabled={!ready}
                          onClick={() => setDialog("create")}
                        >
                          <Icon name="plus" /> Add a task
                        </button>
                      )}
                    </div>
                  ) : (
                    groups[status].map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        saving={board.pending.has(task.id)}
                        loading={board.loading}
                        onMove={move}
                        onDelete={openDelete}
                      />
                    ))
                  )}
                </section>
              ))}
            </div>
          )}
          {board.firstPage && board.hasMore && (
            <div className="load-more">
              <p>{board.tasks.length} tasks loaded</p>
              <button
                className="secondary"
                disabled={board.loading}
                onClick={() => void board.loadPage()}
              >
                {board.loading ? "Loading…" : "Load more tasks"}
                <Icon name="chevron" />
              </button>
            </div>
          )}
        </section>
      </main>
      {dialog === "create" && (
        <TaskDialog
          close={closeDialog}
          add={async (title) => {
            await board.add(title);
            setSearch("");
            setFeedback({ text: "Task added to To do." });
            closeDialog();
          }}
        />
      )}
      {dialog === "ai" && (
        <AiDialog
          close={closeDialog}
          generate={async (description, signal) => {
            const result = await board.request<{ suggestions: string[] }>(
              "/ai/task-breakdown",
              { method: "POST", body: JSON.stringify({ description }), signal },
            );
            return result.suggestions;
          }}
          add={async (title) => {
            await board.add(title);
            setSearch("");
          }}
          done={(count) => {
            setFeedback({
              text: `${count} ${count === 1 ? "task" : "tasks"} added to To do.`,
            });
            closeDialog();
          }}
        />
      )}
      {dialog && typeof dialog === "object" && (
        <DeleteDialog
          close={closeDialog}
          task={dialog.task}
          remove={async () => {
            await board.remove(dialog.task);
            setFeedback({ text: "Task deleted." });
            closeDialog();
          }}
        />
      )}
    </div>
  );
}

const TaskCard = memo(function TaskCard({
  task,
  saving,
  loading,
  onMove,
  onDelete,
}: {
  task: Task;
  saving: boolean;
  loading: boolean;
  onMove: (task: Task, status: Status) => Promise<void>;
  onDelete: (task: Task) => void;
}) {
  const date = taskDate(task.created_at);
  return (
    <article className="task-card">
      <div className="task-heading">
        <h3>{task.title}</h3>
        <button
          className="icon-button delete-button"
          aria-label={`Delete ${task.title}`}
          title="Delete task"
          disabled={saving || loading}
          onClick={() => onDelete(task)}
        >
          <Icon name="trash" />
        </button>
      </div>
      <div className="task-meta">
        <label className={`status-select ${task.status}`}>
          <i className={`dot ${task.status}`} />
          <select
            aria-label={`Status for ${task.title}`}
            value={task.status}
            disabled={saving || loading}
            onChange={(event) =>
              void onMove(task, event.target.value as Status)
            }
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {labels[status]}
              </option>
            ))}
          </select>
          <Icon name="chevron" />
        </label>
        {saving ? (
          <span role="status">Saving…</span>
        ) : (
          date && <span>{date}</span>
        )}
      </div>
    </article>
  );
});
