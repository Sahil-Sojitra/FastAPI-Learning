"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { textLength } from "@/lib/text";
import { validTitle, type Task } from "@/features/tasks/task";
import { Modal } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import { Button } from "@/components/ui/button";
import { AiSuggestions, type Suggestion } from "./ai-suggestions";
import { AiStarterPrompts } from "./ai-starter-prompts";

export function AiDialog({
  close,
  generate,
  add,
  done,
  source,
}: {
  close: () => void;
  generate: (description: string, signal: AbortSignal) => Promise<string[]>;
  add: (title: string) => Promise<void>;
  done: (count: number) => void;
  source?: Task;
}) {
  const [description, setDescription] = useState(source?.title ?? "");
  const [drafts, setDrafts] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState<"generate" | "add" | null>(null);
  const [error, setError] = useState("");
  const selected = drafts.filter((draft) => draft.selected);
  const length = textLength(description);
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
      icon="sparkle"
      variant="drawer"
      close={() => (saved.current ? done(saved.current) : close())}
      busy={busy === "add"}
    >
      <div className="ai-intake">
        {source && (
          <p className="ai-source">
            From TB-{source.id} · {source.title}
          </p>
        )}
        <p className="muted dialog-description">
          Describe the outcome and any constraints. Review the draft before
          adding it as new tickets.
        </p>
        {!source && !drafts.length && !busy && !description && (
          <AiStarterPrompts onSelect={setDescription} />
        )}
      </div>
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
            aria-describedby="description-hint"
          />
        </label>
        <p className="field-hint" id="description-hint">
          <span>Describe the goal and any constraints.</span>
          <span className="counter" data-invalid={length > 2000 || undefined}>
            {length} / 2000
          </span>
        </p>
        <Button
          type="submit"
          tone={drafts.length ? "secondary" : "primary"}
          icon="sparkle"
          busy={busy === "generate"}
          disabled={busy !== null || length < 3 || length > 2000}
        >
          {busy === "generate"
            ? "Generating…"
            : drafts.length
              ? "Regenerate suggestions"
              : "Generate suggestions"}
        </Button>
      </form>
      {busy === "generate" && (
        <Notice tone="info">
          Generating suggestions. Close this dialog to cancel.
        </Notice>
      )}
      {drafts.length > 0 && (
        <AiSuggestions
          drafts={drafts}
          busy={busy}
          onRevise={revise}
          onSave={() => void save()}
        />
      )}
      {error && <Notice tone="error">{error}</Notice>}
    </Modal>
  );
}
