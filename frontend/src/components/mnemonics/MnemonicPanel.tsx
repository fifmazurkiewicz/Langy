"use client";

import { useState } from "react";
import { generateMnemonic, type MnemonicResponse } from "@/lib/api/mnemonics";

type Props = {
  token: string;
  language: string;
  term: string;
  onClose: () => void;
};

export function MnemonicPanel({ token, language, term, onClose }: Props) {
  const [data, setData] = useState<MnemonicResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(regenerate = false) {
    setLoading(true);
    setError(null);
    try {
      const result = await generateMnemonic(token, { term, language, regenerate });
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate mnemonic");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 pb-[calc(52px+env(safe-area-inset-bottom)+1rem)]">
      <div className="classical-card max-h-[min(70vh,calc(100%-1rem))] w-full max-w-lg space-y-3 overflow-y-auto p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-serif">Mnemonic — {term}</h2>
          <button type="button" className="classical-btn px-2 py-1 text-sm" onClick={onClose}>
            Close
          </button>
        </div>
        {!data && !loading ? (
          <button type="button" className="classical-btn classical-btn-primary w-full" onClick={() => void load(false)}>
            Generate
          </button>
        ) : null}
        {loading ? <p>Loading…</p> : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {data ? (
          <>
            <p className="text-sm">{data.association_pl}</p>
            <p className="text-sm opacity-80">{data.example_l2}</p>
            <p className="text-sm opacity-70">{data.example_pl}</p>
            {data.from_cache ? <p className="text-xs opacity-50">From cache</p> : null}
            <button type="button" className="classical-btn w-full" onClick={() => void load(true)}>
              Regenerate
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
