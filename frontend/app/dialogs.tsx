"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { titleLength, validTitle, type Task } from "./api-client";
import { Icon } from "./icons";

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
          className="icon-button"
          aria-label="Close dialog"
          disabled={busy}
          onClick={close}
        >
          <Icon name="close" />
        </button>
      </header>
      {children}
    </dialog>
  );
}

export function TaskDialog({
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
    if (busy || !validTitle(title)) return;
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
        <p className="hint">
          Use 3 to 100 characters. {titleLength(title)} / 100
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button
            className="secondary"
            type="button"
            disabled={busy}
            onClick={close}
          >
            Cancel
          </button>
          <button className="primary" disabled={busy || !validTitle(title)}>
            {busy ? "Adding…" : "Add task"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function DeleteDialog({
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
    if (busy) return;
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

export function AiDialog({
  close,
  generate,
  add,
  done,
}: {
  close: () => void;
  generate: (description: string, signal: AbortSignal) => Promise<string[]>;
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
  const generation = useRef<AbortController | null>(null);

  useEffect(() => () => generation.current?.abort(), []);

  async function suggest(event: FormEvent) {
    event.preventDefault();
    if (busy || length < 3 || length > 2000) return;
    const controller = new AbortController();
    generation.current = controller;
    setBusy("generate");
    setError("");
    try {
      const suggestions = await generate(description.trim(), controller.signal);
      if (controller.signal.aborted) return;
      setDrafts(
        suggestions.map((title, id) => ({ id, title, selected: true })),
      );
    } catch (error) {
      if (controller.signal.aborted) return;
      setError(
        error instanceof Error
          ? error.message
          : "Could not generate suggestions.",
      );
    } finally {
      if (generation.current === controller) {
        generation.current = null;
        if (!controller.signal.aborted) setBusy(null);
      }
    }
  }

  async function save() {
    if (
      busy ||
      !selected.length ||
      !selected.every((draft) => validTitle(draft.title))
    )
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
      busy={busy === "add"}
    >
      <p className="muted dialog-description">
        Describe what you want to accomplish, then review the suggestions before
        adding them to your board.
      </p>
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
          className="primary"
          disabled={busy !== null || length < 3 || length > 2000}
        >
          <Icon name="sparkle" />
          {busy === "generate"
            ? "Generating…"
            : drafts.length
              ? "Regenerate suggestions"
              : "Generate suggestions"}
        </button>
      </form>
      {busy === "generate" && (
        <p className="dialog-progress" role="status">
          Generating suggestions. You can close this dialog to cancel.
        </p>
      )}
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
