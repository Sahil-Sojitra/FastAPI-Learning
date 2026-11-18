import { Button } from "@/components/ui/button";
import { validTitle } from "@/features/tasks/task";

export type Suggestion = { id: number; title: string; selected: boolean };

export function AiSuggestions({
  drafts,
  busy,
  onRevise,
  onSave,
}: {
  drafts: Suggestion[];
  busy: "generate" | "add" | null;
  onRevise: (id: number, change: Partial<Suggestion>) => void;
  onSave: () => void;
}) {
  const selected = drafts.filter((draft) => draft.selected);
  return (
    <section className="suggestions" aria-label="Suggested tasks">
      <div className="suggestions-header">
        <h3>Review suggestions</h3>
        <span className="count">{selected.length} selected</span>
      </div>
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
              onRevise(draft.id, { selected: event.target.checked })
            }
          />
          <input
            aria-label={`Suggestion ${draft.id + 1}`}
            aria-invalid={!validTitle(draft.title)}
            value={draft.title}
            disabled={busy !== null}
            onChange={(event) =>
              onRevise(draft.id, { title: event.target.value })
            }
          />
        </div>
      ))}
      <Button
        tone="primary"
        icon="plus"
        busy={busy === "add"}
        disabled={
          busy !== null ||
          !selected.length ||
          !selected.every((draft) => validTitle(draft.title))
        }
        onClick={onSave}
      >
        {busy === "add" ? "Adding tasks…" : `Add ${selected.length} selected`}
      </Button>
    </section>
  );
}
