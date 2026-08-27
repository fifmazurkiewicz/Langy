"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { exportQuizlet, generateCategory, listVocabCategories, reviewCard } from "@/lib/api/vocab";
import { PendingSourceBadge } from "@/components/memo/PendingSourceBadge";
import { MnemonicsList } from "@/components/mnemonics/MnemonicsList";
import { MnemonicPanel } from "@/components/mnemonics/MnemonicPanel";
import { ShadowingFlow } from "@/components/shadowing/ShadowingFlow";
import { useAuth } from "@/components/AuthProvider";
import { BottomNav } from "@/components/BottomNav";

type VocabItem = {
  id: string;
  term: string;
  translation: string;
  source: string;
  context_sentence?: string | null;
};

type Tab = "flashcards" | "shadowing" | "mnemonics";
type SubTab = "due" | "pending" | "categories";

export default function MemoPage() {
  const { token, activeLanguage } = useAuth();
  const [tab, setTab] = useState<Tab>("flashcards");
  const [subTab, setSubTab] = useState<SubTab>("pending");
  const [pending, setPending] = useState<VocabItem[]>([]);
  const [due, setDue] = useState<{ id: string; term: string; translation: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; category_key: string; accepted_count: number }[]>([]);
  const [mnemonicTerm, setMnemonicTerm] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<{ id: string; term: string; translation: string } | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function fetchVocab() {
      const p = await apiFetch<{ items: VocabItem[] }>("/api/vocab/pending", { token: token! });
      const d = await apiFetch<{ cards: { id: string; term: string; translation: string }[] }>(
        "/api/vocab/due",
        { token: token! }
      );
      const c = await listVocabCategories(token!, activeLanguage ?? undefined);
      if (!cancelled) {
        setPending(p.items);
        setDue(d.cards);
        setCategories(c.items);
      }
    }
    void fetchVocab();
    return () => {
      cancelled = true;
    };
  }, [token, activeLanguage]);

  async function reload() {
    if (!token) return;
    const p = await apiFetch<{ items: VocabItem[] }>("/api/vocab/pending", { token });
    setPending(p.items);
    const d = await apiFetch<{ cards: { id: string; term: string; translation: string }[] }>(
      "/api/vocab/due",
      { token }
    );
    setDue(d.cards);
    const c = await listVocabCategories(token, activeLanguage ?? undefined);
    setCategories(c.items);
  }

  async function decide(id: string, action: "accept" | "reject") {
    if (!token) return;
    await apiFetch(`/api/vocab/${id}/decision`, {
      method: "POST",
      token,
      body: { action },
    });
    await reload();
  }

  async function handleExport() {
    if (!token) return;
    const res = await exportQuizlet(token, activeLanguage ?? undefined);
    if (!res.content) {
      alert("No accepted cards to export.");
      return;
    }
    try {
      await navigator.clipboard.writeText(res.content);
      alert(`Copied ${res.count} card(s) to clipboard (Quizlet format).`);
    } catch {
      const blob = new Blob([res.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `langy-${activeLanguage ?? "export"}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  async function submitReview(rating: "again" | "hard" | "good" | "easy") {
    if (!token || !reviewing) return;
    await reviewCard(token, reviewing.id, rating);
    setReviewing(null);
    setRevealed(false);
    await reload();
  }

  return (
    <div className="flex flex-1 flex-col pb-[calc(52px+env(safe-area-inset-bottom))]">
      <header className="border-b border-[var(--color-divider)] p-4">
        <h1 className="text-xl mb-3">Memo</h1>
        <div className="flex gap-2 text-sm">
          {(["flashcards", "shadowing", "mnemonics"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`classical-btn px-3 py-2 capitalize ${tab === t ? "classical-btn-primary" : ""}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 p-4">
        {tab === "flashcards" ? (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                className={`classical-btn px-3 ${subTab === "due" ? "classical-btn-primary" : ""}`}
                onClick={() => setSubTab("due")}
              >
                Due today
              </button>
              <button
                type="button"
                className={`classical-btn px-3 ${subTab === "pending" ? "classical-btn-primary" : ""}`}
                onClick={() => setSubTab("pending")}
              >
                Pending {pending.length ? `(${pending.length})` : ""}
              </button>
              <button
                type="button"
                className={`classical-btn px-3 capitalize ${subTab === "categories" ? "classical-btn-primary" : ""}`}
                onClick={() => setSubTab("categories")}
              >
                Categories
              </button>
              <button type="button" className="classical-btn px-3 ml-auto" onClick={() => void handleExport()}>
                Export Quizlet
              </button>
            </div>
            {subTab === "pending" ? (
              <ul className="space-y-3">
                {pending.length === 0 ? (
                  <p className="opacity-60">No pending words.</p>
                ) : (
                  pending.map((item) => (
                    <li key={item.id} className="classical-card p-4">
                      <p className="font-serif text-lg">{item.term}</p>
                      <p className="text-sm opacity-80">{item.translation}</p>
                      <p className="text-xs opacity-60 mt-1">
                        <PendingSourceBadge source={item.source} />
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button type="button" className="classical-btn classical-btn-primary" onClick={() => void decide(item.id, "accept")}>
                          Accept
                        </button>
                        <button type="button" className="classical-btn" onClick={() => void decide(item.id, "reject")}>
                          Reject
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            ) : subTab === "categories" ? (
              <ul className="space-y-3">
                {categories.length === 0 ? (
                  <p className="opacity-60">No categories yet — set interests in onboarding.</p>
                ) : (
                  categories.map((cat) => (
                    <li key={cat.id} className="classical-card flex items-center justify-between gap-2 p-4">
                      <div>
                        <p className="font-serif capitalize">{cat.category_key}</p>
                        <p className="text-sm opacity-70">{cat.accepted_count} accepted</p>
                      </div>
                      <button
                        type="button"
                        className="classical-btn classical-btn-primary"
                        onClick={async () => {
                          if (!token) return;
                          const res = await generateCategory(token, cat.id);
                          await reload();
                          alert(`${res.created} word(s) added to Pending`);
                        }}
                      >
                        Generate new
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : reviewing ? (
              <section className="classical-card space-y-4 p-6 text-center">
                <p className="font-serif text-2xl">{reviewing.term}</p>
                {revealed ? (
                  <p className="text-lg opacity-80">{reviewing.translation}</p>
                ) : (
                  <button type="button" className="classical-btn" onClick={() => setRevealed(true)}>
                    Show answer
                  </button>
                )}
                {revealed ? (
                  <div className="grid grid-cols-2 gap-2">
                    {(["again", "hard", "good", "easy"] as const).map((r) => (
                      <button key={r} type="button" className="classical-btn capitalize" onClick={() => void submitReview(r)}>
                        {r}
                      </button>
                    ))}
                  </div>
                ) : null}
                <button type="button" className="classical-btn w-full" onClick={() => { setReviewing(null); setRevealed(false); }}>
                  Cancel
                </button>
              </section>
            ) : (
              <ul className="space-y-3">
                {due.length === 0 ? (
                  <p className="opacity-60">Nothing due today.</p>
                ) : (
                  due.map((card) => (
                    <li key={card.id} className="classical-card p-4">
                      <p className="font-serif text-lg">{card.term}</p>
                      <p className="text-sm opacity-80">{card.translation}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" className="classical-btn classical-btn-primary" onClick={() => { setReviewing(card); setRevealed(false); }}>
                          Review
                        </button>
                        {token && activeLanguage ? (
                          <button type="button" className="classical-btn" onClick={() => setMnemonicTerm(card.term)}>
                            Mnemonic
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            )}
          </>
        ) : tab === "shadowing" ? (
          token && activeLanguage ? (
            <ShadowingFlow
              token={token}
              language={activeLanguage}
              onDone={async (created) => {
                await reload();
                if (created > 0) alert(`${created} line(s) added to Pending`);
              }}
            />
          ) : (
            <p className="opacity-60">Sign in and set a language first.</p>
          )
        ) : tab === "mnemonics" ? (
          token && activeLanguage ? (
            <MnemonicsList token={token} language={activeLanguage} />
          ) : (
            <p className="opacity-60">Sign in and set a language first.</p>
          )
        ) : (
          <p className="opacity-60">Unknown tab.</p>
        )}
      </main>

      <BottomNav pendingCount={pending.length} />

      {mnemonicTerm && token && activeLanguage ? (
        <MnemonicPanel
          token={token}
          language={activeLanguage}
          term={mnemonicTerm}
          onClose={() => setMnemonicTerm(null)}
        />
      ) : null}
    </div>
  );
}
