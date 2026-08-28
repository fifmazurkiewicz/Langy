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
  onClose: () => void;
  onSelect: (conversation: ConversationListItem) => void;
};

export function HistorySheet({ open, loading, conversations, onClose, onSelect }: Props) {
  return (
    <ClassicalBottomSheet open={open} title="History" onClose={onClose}>
      {loading ? <p className="text-sm text-[var(--color-soft)]">Loading…</p> : null}
      {!loading && conversations.length === 0 ? (
        <p className="text-sm text-[var(--color-soft)]">No conversations yet. Start your first session!</p>
      ) : null}
      <ul className="space-y-2">
        {conversations.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className="classical-card w-full p-3 text-left"
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
          </li>
        ))}
      </ul>
    </ClassicalBottomSheet>
  );
}
