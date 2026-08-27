"use client";

import { useEffect, useState } from "react";
import { listNeedsMnemonic } from "@/lib/api/mnemonics";
import { MnemonicPanel } from "@/components/mnemonics/MnemonicPanel";

type Props = {
  token: string;
  language: string;
};

export function MnemonicsList({ token, language }: Props) {
  const [items, setItems] = useState<{ term: string; translation: string }[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await listNeedsMnemonic(token, language);
      if (!cancelled) setItems(res.items);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, language]);

  return (
    <div className="space-y-3">
      <p className="opacity-80 text-sm">Accepted terms without a mnemonic yet.</p>
      {items.length === 0 ? (
        <p className="opacity-60">All accepted terms have mnemonics — or none accepted yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.term} className="classical-card flex items-center justify-between gap-2 p-3">
              <div>
                <p className="font-serif">{item.term}</p>
                <p className="text-sm opacity-70">{item.translation}</p>
              </div>
              <button type="button" className="classical-btn classical-btn-primary" onClick={() => setSelectedTerm(item.term)}>
                Generate
              </button>
            </li>
          ))}
        </ul>
      )}
      {selectedTerm ? (
        <MnemonicPanel
          token={token}
          language={language}
          term={selectedTerm}
          onClose={() => setSelectedTerm(null)}
        />
      ) : null}
    </div>
  );
}
