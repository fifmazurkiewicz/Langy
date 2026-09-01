"use client";

import type { ConversationListItem } from "@/lib/api/chat";
import { formatConversationDate } from "@/lib/chat/transcript";
import { ClassicalBottomSheet } from "@/components/chat/ClassicalBottomSheet";

const MARKERS: Record<string, string> = {
  "en-GB": "GB",
  "en-US": "US",
  de: "DE",
  es: "ES",
  it: "IT",
};

type Props = {
  open: boolean;
  loading: boolean;
  conversations: ConversationListItem[];
  deletingId: string | null;
  onClose: () => void;
  onSelect: (conversation: ConversationListItem) => void;
  onDelete: (conversation: ConversationListItem) => void;
};

export function HistorySheet({
  open,
  loading,
  conversations,
  deletingId,
  onClose,
  onSelect,
  onDelete,
}: Props) {
  return (
    <ClassicalBottomSheet open={open} title="History" onClose={onClose}>
      {loading ? <p className="text-sm text-[var(--color-soft)]">Loading…</p> : null}
      {!loading && conversations.length === 0 ? (
        <p className="text-sm text-[var(--color-soft)]">No conversations yet. Start your first session!</p>
      ) : null}
      <ul className="space-y-2">
        {conversations.map((c) => (
          <li key={c.id}>
            <div className="classical-card flex items-stretch gap-2 p-3">
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => onSelect(c)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs tracking-wide text-[var(--color-accent)]">
                    {MARKERS[c.language] ?? c.language}
                  </span>
                  <span className="text-xs text-[var(--color-soft)]">
                    {formatConversationDate(c.started_at)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm">{c.summary || c.preview || "Empty conversation"}</p>
                {c.is_active ? (
                  <span className="mt-2 inline-block text-xs text-[var(--color-accent)]">Active</span>
                ) : null}
              </button>
              <button
                type="button"
                className="classical-btn shrink-0 self-center px-3 text-sm opacity-80"
                disabled={deletingId === c.id}
                aria-label={`Delete conversation from ${formatConversationDate(c.started_at) || "history"}`}
                onClick={() => onDelete(c)}
              >
                {deletingId === c.id ? "…" : "Delete"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </ClassicalBottomSheet>
  );
}
