import { Button } from "@/components/ui/button";

const examples = [
  [
    "Ship a feature",
    "Plan the rollout of a new feature. Include acceptance criteria, verification steps, and communications.",
  ],
  [
    "Triage a bug",
    "Triage a reported bug. Gather evidence, confirm impact, and outline how to verify a fix.",
  ],
  [
    "Prepare a review",
    "Prepare a sprint review. Gather completed work, identify decisions, and collect follow-up actions.",
  ],
] as const;

export function AiStarterPrompts({
  onSelect,
}: {
  onSelect: (draft: string) => void;
}) {
  return (
    <div className="ai-starters" aria-label="Example prompts">
      {examples.map(([label, draft]) => (
        <Button key={label} tone="secondary" onClick={() => onSelect(draft)}>
          {label}
        </Button>
      ))}
    </div>
  );
}
