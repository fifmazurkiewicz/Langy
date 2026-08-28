export type TranscriptLine = { role: "User" | "Agent"; text: string };

export function parseTranscript(transcript: string | null | undefined): TranscriptLine[] {
  const lines: TranscriptLine[] = [];
  for (const raw of (transcript ?? "").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("User: ")) {
      lines.push({ role: "User", text: line.slice(6).trim() });
    } else if (line.startsWith("Agent: ")) {
      lines.push({ role: "Agent", text: line.slice(7).trim() });
    } else {
      lines.push({ role: "Agent", text: line });
    }
  }
  return lines;
}

export function formatConversationDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  if (isYesterday) return "Yesterday";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
