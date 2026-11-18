"use client";

import { useState } from "react";
import type { Task } from "../task";
import { Modal } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import { Button } from "@/components/ui/button";

export function DeleteTaskDialog({
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
    <Modal title="Delete task?" icon="trash" danger close={close} busy={busy}>
      <p className="muted">“{task.title}” will be removed from your board.</p>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="dialog-actions">
        <Button autoFocus disabled={busy} onClick={close}>
          Cancel
        </Button>
        <Button
          tone="danger"
          icon="trash"
          busy={busy}
          onClick={() => void confirm()}
        >
          {busy ? "Deleting…" : "Delete task"}
        </Button>
      </div>
    </Modal>
  );
}
