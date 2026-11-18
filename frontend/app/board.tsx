"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  api,
  ApiError,
  labels,
  loadTasks,
  statuses,
  titleLength,
  validTitle,
  type Status,
  type Task,
  type User,
} from "./api-client";
import { Brand } from "./brand";

type DialogState = { type: "create" | "ai" } | { type: "delete"; task: Task };

export function Board({
  token,
  user,
  signOut,
}: {
  token: string;
  user: User;
  signOut: (expired?: boolean) => void;
}) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const signOutRef = useRef(signOut);

  useEffect(() => {
    signOutRef.current = signOut;
  }, [signOut]);
  useEffect(() => {
    const controller = new AbortController();
    loadTasks(token, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setTasks(data);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401)
          signOutRef.current(true);
        else
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load your tasks.",
          );
      });
    return () => controller.abort();
  }, [token, attempt]);

  async function request<T>(path: string, options: RequestInit) {
    try {
      return await api<T>(path, options, token);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) signOut(true);
      throw error;
    }
  }

  async function addTask(title: string) {
    const task = await request<Task>("/tasks", {
      method: "POST",
      body: JSON.stringify({ title: title.trim() }),
    });
    setTasks((current) => [task, ...(current ?? [])]);
  }

  async function changeStatus(task: Task, status: Status) {
    setPending(task.id);
    setError("");
    setNotice("");
    try {
      const updated = await request<Task>(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setTasks(
        (current) =>
          current?.map((item) => (item.id === updated.id ? updated : item)) ??
          [],
      );
      setNotice(`Task moved to ${labels[status].toLowerCase()}.`);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not update the task.",
      );
    } finally {
      setPending(null);
    }
  }

  const ready = tasks !== null;
  const visible = (tasks ?? []).filter((task) =>
    task.title.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const counts = statuses.map(
    (status) => (tasks ?? []).filter((task) => task.status === status).length,
  );
  const close = () => setDialog(null);

  return (
    <div className="workspace">
      <aside className="sidebar">
        <Brand />
        <div className="side-nav">
          <span className="side-label">Workspace</span>
          <a href="#board" className="nav-current">
            <span aria-hidden="true">▥</span> My board
          </a>
          <button onClick={() => setDialog({ type: "ai" })} disabled={!ready}>
            <span aria-hidden="true">✧</span> AI breakdown
          </button>
        </div>
        <div className="account">
          <span className="avatar" aria-hidden="true">
            {user.email[0].toUpperCase()}
          </span>
          <div>
            <strong title={user.email}>{user.email}</strong>
            <button className="text-button" onClick={() => signOut()}>
              Sign out
            </button>
          </div>
        </div>
      </aside>
      <main className="dashboard" id="board">
        <header className="board-header">
          <div>
            <p className="eyebrow">Personal workspace</p>
            <h1>My task board</h1>
            <p className="muted">
              Organize your work and track what’s moving forward.
            </p>
          </div>
          <button
            className="primary"
            onClick={() => setDialog({ type: "create" })}
            disabled={!ready}
          >
            <span aria-hidden="true">＋</span> New task
          </button>
        </header>
        <section className="stats" aria-label="Task totals">
          {[
            ["All tasks", tasks?.length],
            ...statuses.map((status, index) => [labels[status], counts[index]]),
          ].map(([label, count], index) => (
            <div className="stat" key={label}>
              <span>
                <i className={`dot ${statuses[index - 1] ?? "total"}`} />
                {label}
              </span>
              <strong>{ready ? count : "—"}</strong>
            </div>
          ))}
        </section>
        <section className="ai-banner">
          <span className="sparkle" aria-hidden="true">
            ✧
          </span>
          <div>
            <h2>Break down a task with AI</h2>
            <p>
              Turn a description into smaller steps you can add to your board.
            </p>
          </div>
          <button
            className="secondary"
            onClick={() => setDialog({ type: "ai" })}
            disabled={!ready}
          >
            Try AI breakdown <span aria-hidden="true">↗</span>
          </button>
        </section>
        <div className="board-controls">
          <h2>Tasks</h2>
          <input
            aria-label="Search tasks"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks…"
            disabled={!ready}
          />
        </div>
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {!ready &&
          (loadError ? (
            <div className="load-card">
              <p className="error" role="alert">
                {loadError}
              </p>
              <button
                className="secondary"
                onClick={() => {
                  setLoadError("");
                  setAttempt(attempt + 1);
                }}
              >
                Retry
              </button>
            </div>
          ) : (
            <p className="load-card muted" role="status">
              Loading your tasks…
            </p>
          ))}
        {ready && (
          <div className="columns">
            {statuses.map((status) => {
              const items = visible.filter((task) => task.status === status);
              return (
                <section
                  className="column"
                  key={status}
                  aria-label={labels[status]}
                >
                  <header>
                    <h3>
                      <i className={`dot ${status}`} />
                      {labels[status]}
                    </h3>
                    <span>{items.length}</span>
                  </header>
                  {items.length === 0 && (
                    <p className="empty">
                      {search.trim() ? "No matching tasks" : "No tasks yet"}
                    </p>
                  )}
                  {items.map((task) => (
                    <article className="task-card" key={task.id}>
                      <h4>{task.title}</h4>
                      <div className="task-actions">
                        <select
                          aria-label={`Status for ${task.title}`}
                          value={task.status}
                          disabled={pending !== null}
                          onChange={(event) =>
                            void changeStatus(
                              task,
                              event.target.value as Status,
                            )
                          }
                        >
                          {statuses.map((option) => (
                            <option key={option} value={option}>
                              {labels[option]}
                            </option>
                          ))}
                        </select>
                        <button
                          className="delete-link"
                          aria-label={`Delete ${task.title}`}
                          disabled={pending !== null}
                          onClick={() => setDialog({ type: "delete", task })}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </section>
              );
            })}
          </div>
        )}
      </main>
      {dialog?.type === "create" && (
        <TaskDialog
          close={close}
          add={async (title) => {
            await addTask(title);
            setSearch("");
            setNotice("Task added to To do.");
            setError("");
            close();
          }}
        />
      )}
      {dialog?.type === "ai" && (
        <AiDialog
          close={close}
          generate={async (description) => {
            const result = await request<{ suggestions: string[] }>(
              "/ai/task-breakdown",
              { method: "POST", body: JSON.stringify({ description }) },
            );
            return result.suggestions;
          }}
          add={async (title) => {
            await addTask(title);
            setSearch("");
            setError("");
          }}
          done={(count) => {
            setNotice(
              `${count} AI ${count === 1 ? "task" : "tasks"} added to To do.`,
            );
            close();
          }}
        />
      )}
      {dialog?.type === "delete" && (
        <DeleteDialog
          close={close}
          task={dialog.task}
          remove={async () => {
            await request<void>(`/tasks/${dialog.task.id}`, {
              method: "DELETE",
            });
            setTasks(
              (current) =>
                current?.filter((task) => task.id !== dialog.task.id) ?? [],
            );
            setNotice("Task deleted.");
            setError("");
            close();
          }}
        />
      )}
    </div>
  );
}

function Modal({
  title,
  close,
  busy,
  children,
}: {
  title: string;
  close: () => void;
  busy: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const modal = ref.current;
    modal?.showModal();
    return () => modal?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) close();
      }}
    >
      <header className="dialog-header">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="close"
          aria-label="Close dialog"
          disabled={busy}
          onClick={close}
        >
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}

function TaskDialog({
  close,
  add,
}: {
  close: () => void;
  add: (title: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!validTitle(title)) return;
    setBusy(true);
    setError("");
    try {
      await add(title);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not add the task.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="New task" close={close} busy={busy}>
      <form className="form" onSubmit={submit}>
        <label>
          Task title
          <input
            required
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What needs to get done?"
          />
        </label>
        <p className="hint">Use 3 to 100 characters.</p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy || !validTitle(title)}>
          {busy ? "Adding…" : "Add task"}
        </button>
      </form>
    </Modal>
  );
}

function DeleteDialog({
  close,
  task,
  remove,
}: {
  close: () => void;
  task: Task;
  remove: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await remove();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not delete the task.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Delete task?" close={close} busy={busy}>
      <p className="muted">“{task.title}” will be removed from your board.</p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button className="secondary" autoFocus disabled={busy} onClick={close}>
          Cancel
        </button>
        <button
          className="danger"
          disabled={busy}
          onClick={() => void confirm()}
        >
          {busy ? "Deleting…" : "Delete task"}
        </button>
      </div>
    </Modal>
  );
}

type Suggestion = { id: number; title: string; selected: boolean };

function AiDialog({
  close,
  generate,
  add,
  done,
}: {
  close: () => void;
  generate: (description: string) => Promise<string[]>;
  add: (title: string) => Promise<void>;
  done: (count: number) => void;
}) {
  const [description, setDescription] = useState("");
  const [drafts, setDrafts] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState<"generate" | "add" | null>(null);
  const [error, setError] = useState("");
  const selected = drafts.filter((draft) => draft.selected);
  const length = titleLength(description);
  const saved = useRef(0);

  async function suggest(event: FormEvent) {
    event.preventDefault();
    if (length < 3 || length > 2000) return;
    setBusy("generate");
    setError("");
    try {
      const suggestions = await generate(description.trim());
      setDrafts(
        suggestions.map((title, id) => ({ id, title, selected: true })),
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not generate suggestions.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!selected.length || !selected.every((draft) => validTitle(draft.title)))
      return;
    setBusy("add");
    setError("");
    let added = 0;
    try {
      for (const draft of selected) {
        await add(draft.title);
        added++;
        saved.current++;
        setDrafts((current) => current.filter((item) => item.id !== draft.id));
      }
      done(saved.current);
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "Could not add this task.";
      setError(
        added ? `Added ${added} before the request failed. ${reason}` : reason,
      );
    } finally {
      setBusy(null);
    }
  }

  function revise(id: number, change: Partial<Suggestion>) {
    setDrafts((current) =>
      current.map((draft) =>
        draft.id === id ? { ...draft, ...change } : draft,
      ),
    );
  }

  return (
    <Modal
      title="AI task breakdown"
      close={() => (saved.current ? done(saved.current) : close())}
      busy={busy !== null}
    >
      <form className="form" onSubmit={suggest}>
        <label>
          Describe the task
          <textarea
            autoFocus
            rows={4}
            value={description}
            disabled={busy !== null}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="For example, plan and launch a project website"
          />
        </label>
        <p className="hint">{length} / 2000 characters</p>
        <button
          className="secondary"
          disabled={busy !== null || length < 3 || length > 2000}
        >
          {busy === "generate"
            ? "Generating…"
            : drafts.length
              ? "Regenerate suggestions"
              : "Generate suggestions"}
        </button>
      </form>
      {drafts.length > 0 && (
        <section className="suggestions" aria-label="Suggested tasks">
          <h3>Review suggestions</h3>
          <p className="hint">
            Edit titles to 3–100 characters, then select the tasks to add.
          </p>
          {drafts.map((draft) => (
            <div className="suggestion" key={draft.id}>
              <input
                type="checkbox"
                aria-label={`Include suggestion ${draft.id + 1}`}
                checked={draft.selected}
                disabled={busy !== null}
                onChange={(event) =>
                  revise(draft.id, { selected: event.target.checked })
                }
              />
              <input
                aria-label={`Suggestion ${draft.id + 1}`}
                aria-invalid={!validTitle(draft.title)}
                value={draft.title}
                disabled={busy !== null}
                onChange={(event) =>
                  revise(draft.id, { title: event.target.value })
                }
              />
            </div>
          ))}
          <button
            className="primary"
            disabled={
              busy !== null ||
              !selected.length ||
              !selected.every((draft) => validTitle(draft.title))
            }
            onClick={() => void save()}
          >
            {busy === "add"
              ? "Adding tasks…"
              : `Add ${selected.length} selected`}
          </button>
        </section>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
