const LABELS: Record<string, string> = {
  chat_extraction: "Chat",
  agent_save: "Agent",
  category_generated: "Category",
  transcript_selection: "Transcript",
  lesson: "Lesson",
  correction: "Correction",
  shadowing: "Shadowing",
};

export function PendingSourceBadge({ source }: { source: string }) {
  return (
    <span className="rounded border border-[var(--color-divider)] px-2 py-0.5 text-xs opacity-70">
      {LABELS[source] ?? source}
    </span>
  );
}
