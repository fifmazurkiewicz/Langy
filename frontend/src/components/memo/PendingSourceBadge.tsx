const SOURCE_LABELS: Record<string, string> = {
  chat_extraction: "Chat",
  agent_save: "Agent",
  category_generated: "Category",
  transcript_selection: "Transcript",
  lesson: "Lesson",
  correction: "Correction",
  shadowing: "Shadowing",
};

function formatCategoryKey(key: string) {
  return key.replace(/[-_]/g, " ");
}

export function PendingSourceBadge({
  source,
  categoryKey,
}: {
  source: string;
  categoryKey?: string | null;
}) {
  let label = SOURCE_LABELS[source] ?? source;
  if (source === "category_generated" && categoryKey) {
    label = formatCategoryKey(categoryKey);
  }

  return (
    <span className="rounded border border-[var(--color-divider)] px-2 py-0.5 text-xs capitalize opacity-70">
      {label}
    </span>
  );
}
