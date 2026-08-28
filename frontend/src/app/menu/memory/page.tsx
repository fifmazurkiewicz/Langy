"use client";

import { useCallback, useEffect, useState } from "react";
import { LANGUAGE_MARKERS } from "@/lib/constants/profile";
import {
  deleteMemoryFact,
  fetchMemoryFacts,
  fetchSessionSummaries,
  updateMemoryFact,
  type MemoryFact,
  type SessionSummary,
} from "@/lib/api/memory";
import { useAuth } from "@/components/AuthProvider";
import { BottomNav } from "@/components/BottomNav";
import { MenuBackHeader } from "@/components/menu/MenuBackHeader";
import { formatConversationDate } from "@/lib/chat/transcript";

export default function MenuMemoryPage() {
  const { token, activeLanguage } = useAuth();
  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [summaries, setSummaries] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [f, s] = await Promise.all([
        fetchMemoryFacts(token),
        fetchSessionSummaries(token, activeLanguage ?? undefined),
      ]);
      setFacts(f.facts);
      setSummaries(s.summaries);
    } finally {
      setLoading(false);
    }
  }, [token, activeLanguage]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveEdit(id: string) {
    if (!token || !editText.trim()) return;
    await updateMemoryFact(token, id, editText.trim());
    setEditingId(null);
    void load();
  }

  async function remove(id: string) {
    if (!token || !confirm("Delete this memory fact?")) return;
    await deleteMemoryFact(token, id);
    void load();
  }

  return (
    <div className="flex flex-1 flex-col pb-[calc(52px+env(safe-area-inset-bottom))]">
      <MenuBackHeader title="Memory" />
      <main className="flex-1 space-y-6 p-4">
        {loading ? <p className="text-sm text-[var(--color-soft)]">Loading…</p> : null}

        <section className="space-y-3">
          <h2 className="font-serif text-xl">Facts about you</h2>
          {facts.length === 0 ? (
            <p className="text-sm text-[var(--color-soft)]">
              Facts appear after chat sessions when the agent learns something about you.
            </p>
          ) : (
            <ul className="space-y-3">
              {facts.map((fact) => (
                <li key={fact.id} className="classical-card p-3">
                  {editingId === fact.id ? (
                    <div className="space-y-2">
                      <textarea
                        className="classical-input min-h-[80px] py-2"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button type="button" className="classical-btn flex-1" onClick={() => setEditingId(null)}>
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="classical-btn classical-btn-primary flex-1"
                          onClick={() => void saveEdit(fact.id)}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm leading-relaxed">{fact.content}</p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          className="classical-btn px-2 py-1 text-xs"
                          onClick={() => {
                            setEditingId(fact.id);
                            setEditText(fact.content);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="classical-btn px-2 py-1 text-xs opacity-70"
                          onClick={() => void remove(fact.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl">Recent session notes</h2>
          {summaries.length === 0 ? (
            <p className="text-sm text-[var(--color-soft)]">Session summaries appear after you end a chat.</p>
          ) : (
            <ul className="space-y-3">
              {summaries.map((s) => (
                <li key={s.id} className="classical-card p-3">
                  <p className="text-xs text-[var(--color-soft)]">
                    {LANGUAGE_MARKERS[s.language] ?? s.language} · {formatConversationDate(s.created_at)}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed">{s.summary}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
