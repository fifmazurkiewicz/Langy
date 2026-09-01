"use client";

import { useEffect, useMemo, useState } from "react";
import { listAcceptedVocab } from "@/lib/api/vocab";
import { PendingSourceBadge } from "@/components/memo/PendingSourceBadge";
import { MnemonicPanel } from "@/components/mnemonics/MnemonicPanel";
import { formatCategoryLabel, UNCATEGORIZED_DUE_CATEGORY_KEY } from "@/lib/memo/categories";

type Props = {
  token: string;
  language: string;
};

type VocabItem = {
  id: string;
  term: string;
  translation: string;
  source: string;
  category_key?: string | null;
};

export function VocabularyList({ token, language }: Props) {
  const [items, setItems] = useState<VocabItem[]>([]);
  const [search, setSearch] = useState("");
  const [mnemonicTerm, setMnemonicTerm] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await listAcceptedVocab(token, language);
      if (!cancelled) setItems(res.items);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, language]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) => item.term.toLowerCase().includes(q) || item.translation.toLowerCase().includes(q),
    );
  }, [items, search]);

  const grouped = useMemo(() => {
    const byCategory = new Map<string, VocabItem[]>();
    for (const item of filtered) {
      const key = item.category_key ?? UNCATEGORIZED_DUE_CATEGORY_KEY;
      const list = byCategory.get(key) ?? [];
      list.push(item);
      byCategory.set(key, list);
    }
    return Array.from(byCategory.entries()).sort(([a], [b]) => {
      if (a === UNCATEGORIZED_DUE_CATEGORY_KEY) return 1;
      if (b === UNCATEGORIZED_DUE_CATEGORY_KEY) return -1;
      return formatCategoryLabel(a).localeCompare(formatCategoryLabel(b));
    });
  }, [filtered]);

  return (
    <div className="space-y-4">
      <input
        className="classical-input w-full"
        placeholder="Search words…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search vocabulary"
      />
      {items.length === 0 ? (
        <p className="opacity-60">No learned words yet — accept words from Pending or save them in Chat.</p>
      ) : filtered.length === 0 ? (
        <p className="opacity-60">No matches for &ldquo;{search.trim()}&rdquo;.</p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([categoryKey, categoryItems]) => (
            <section key={categoryKey} className="space-y-2">
              <h2 className="font-serif text-lg capitalize">
                {categoryKey === UNCATEGORIZED_DUE_CATEGORY_KEY
                  ? "Other"
                  : formatCategoryLabel(categoryKey)}
              </h2>
              <ul className="space-y-2">
                {categoryItems.map((item) => (
                  <li key={item.id} className="classical-card flex items-start justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="font-serif text-lg">{item.term}</p>
                      <p className="text-sm opacity-80">{item.translation}</p>
                      {categoryKey === UNCATEGORIZED_DUE_CATEGORY_KEY ? (
                        <p className="mt-1 text-xs opacity-60">
                          <PendingSourceBadge source={item.source} categoryKey={item.category_key} />
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="classical-btn shrink-0"
                      onClick={() => setMnemonicTerm(item.term)}
                    >
                      Mnemonic
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {mnemonicTerm ? (
        <MnemonicPanel
          token={token}
          language={language}
          term={mnemonicTerm}
          onClose={() => setMnemonicTerm(null)}
        />
      ) : null}
    </div>
  );
}
