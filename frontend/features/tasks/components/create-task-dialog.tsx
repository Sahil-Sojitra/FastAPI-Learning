"use client";

import { useState, type FormEvent } from "react";
import { titleLength, validTitle } from "../task";
import { Modal } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import { Button } from "@/components/ui/button";

export function CreateTaskDialog({
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
    <Modal title="New task" icon="plus" close={close} busy={busy}>
      <form className="form" onSubmit={submit}>
        <label>
          Task title
          <input
            required
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Review the launch checklist"
            aria-describedby="task-title-hint"
          />
        </label>
        <p className="field-hint" id="task-title-hint">
          <span>3–100 characters</span>
          <span
            className="counter"
            data-invalid={titleLength(title) > 100 || undefined}
          >
            {titleLength(title)} / 100
          </span>
        </p>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="dialog-actions">
          <Button type="button" disabled={busy} onClick={close}>
            Cancel
          </Button>
          <Button
            tone="primary"
            type="submit"
            icon="plus"
            busy={busy}
            disabled={!validTitle(title)}
          >
            {busy ? "Adding…" : "Add task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
