"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { createCategory, exportQuizlet, generateCategory, listDueCards, listVocabCategories, reviewCard } from "@/lib/api/vocab";
import { formatCategoryLabel, splitCategoriesByInterests, UNCATEGORIZED_DUE_CATEGORY_KEY } from "@/lib/memo/categories";
import { PendingSourceBadge } from "@/components/memo/PendingSourceBadge";
import { VocabularyList } from "@/components/memo/VocabularyList";
import { MnemonicPanel } from "@/components/mnemonics/MnemonicPanel";
import { ShadowingFlow } from "@/components/shadowing/ShadowingFlow";
import { useAuth } from "@/components/AuthProvider";
import { BottomNav } from "@/components/BottomNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLearningLanguage } from "@/lib/hooks/useLearningLanguage";
import { setActiveLanguage } from "@/lib/api/profile";

type VocabItem = {
  id: string;
  term: string;
  translation: string;
  source: string;
  context_sentence?: string | null;
  category_key?: string | null;
};

type CategoryItem = {
  id: string;
  category_key: string;
  accepted_count: number;
  due_count: number;
  is_custom: boolean;
};

type Tab = "flashcards" | "vocabulary" | "shadowing";
type SubTab = "due" | "pending" | "generate";

export default function MemoPage() {
  const { token, refreshProfile } = useAuth();
  const { sessionLanguage, languages, activeInterests } = useLearningLanguage();
  const activeLanguage = sessionLanguage;
  const [tab, setTab] = useState<Tab>("flashcards");
  const [subTab, setSubTab] = useState<SubTab>("pending");
  const [pending, setPending] = useState<VocabItem[]>([]);
  const [due, setDue] = useState<{ id: string; term: string; translation: string }[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [otherDueCount, setOtherDueCount] = useState(0);
  const [dueCategoryKey, setDueCategoryKey] = useState<string | null>(null);
  const [mnemonicTerm, setMnemonicTerm] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<{ id: string; term: string; translation: string } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const { interestCategories, customCategories } = useMemo(
    () => splitCategoriesByInterests(categories, activeInterests),
    [categories, activeInterests],
  );

  async function handleGenerateCategory(catId: string) {
    if (!token) return;
    setGeneratingId(catId);
    try {
      const res = await generateCategory(token, catId);
      await reload();
      alert(`${res.created} word(s) added to Pending`);
    } finally {
      setGeneratingId(null);
    }
  }

  function renderCategoryRow(cat: CategoryItem) {
    return (
      <li key={cat.id} className="classical-card flex items-center justify-between gap-2 p-4">
        <div>
          <p className="font-serif capitalize">{formatCategoryLabel(cat.category_key)}</p>
          <p className="text-sm opacity-70">
            {cat.accepted_count} accepted
            {cat.due_count > 0 ? ` · ${cat.due_count} due` : ""}
          </p>
        </div>
        <button
          type="button"
          className="classical-btn classical-btn-primary"
          disabled={generatingId === cat.id}
          onClick={() => void handleGenerateCategory(cat.id)}
        >
          {generatingId === cat.id ? "Generating…" : "Generate new"}
        </button>
      </li>
    );
  }

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function fetchVocab() {
      setCategoriesLoading(true);
      setCategoriesError(null);
      try {
        const p = await apiFetch<{ items: VocabItem[] }>("/api/vocab/pending", { token: token! });
        const c = await listVocabCategories(token!, activeLanguage ?? undefined);
        if (!cancelled) {
          setPending(p.items);
          setCategories(c.items);
          setOtherDueCount(c.other_due_count);
        }
      } catch (e) {
        if (!cancelled) {
          setCategoriesError(e instanceof Error ? e.message : "Could not load categories");
        }
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    }
    void fetchVocab();
    return () => {
      cancelled = true;
    };
  }, [token, activeLanguage]);

  useEffect(() => {
    if (!token || subTab !== "due" || !dueCategoryKey) {
      setDue([]);
      return;
    }
    let cancelled = false;
    void listDueCards(token, activeLanguage ?? undefined, dueCategoryKey).then((d) => {
      if (!cancelled) setDue(d.cards);
    });
    return () => {
      cancelled = true;
    };
  }, [token, activeLanguage, subTab, dueCategoryKey]);

  async function reload() {
    if (!token) return;
    const p = await apiFetch<{ items: VocabItem[] }>("/api/vocab/pending", { token });
    setPending(p.items);
    const c = await listVocabCategories(token, activeLanguage ?? undefined);
    setCategories(c.items);
    setOtherDueCount(c.other_due_count);
    if (dueCategoryKey) {
      const d = await listDueCards(token, activeLanguage ?? undefined, dueCategoryKey);
      setDue(d.cards);
    } else {
      setDue([]);
    }
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
    if (!token || !reviewing || reviewSubmitting) return;
    setReviewSubmitting(true);
    try {
      await reviewCard(token, reviewing.id, rating);
      setReviewing(null);
      setRevealed(false);
      await reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not save review");
    } finally {
      setReviewSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col pb-[calc(52px+env(safe-area-inset-bottom))]">
      <header className="border-b border-[var(--color-divider)] p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h1 className="text-xl">Memo</h1>
          {token && languages.length > 0 ? (
            <LanguageSwitcher
              activeLanguage={activeLanguage}
              languages={languages}
              onChange={async (lang) => {
                await setActiveLanguage(token, lang);
                await refreshProfile();
              }}
            />
          ) : null}
        </div>
        <div className="flex gap-2 text-sm">
          {(["flashcards", "vocabulary", "shadowing"] as Tab[]).map((t) => (
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
                onClick={() => {
                  setSubTab("due");
                  setDueCategoryKey(null);
                  setReviewing(null);
                  setRevealed(false);
                }}
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
                className={`classical-btn px-3 capitalize ${subTab === "generate" ? "classical-btn-primary" : ""}`}
                onClick={() => setSubTab("generate")}
              >
                Generate
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
                        <PendingSourceBadge source={item.source} categoryKey={item.category_key} />
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
            ) : subTab === "generate" ? (
              <div className="space-y-6">
                <section className="space-y-3">
                  <p className="text-xs uppercase tracking-wide opacity-60">
                    From your interests
                    {interestCategories.length > 0
                      ? ` · ${interestCategories.length} set${interestCategories.length === 1 ? "" : "s"}`
                      : ""}
                  </p>
                  {categoriesError ? (
                    <p className="text-sm text-red-400">{categoriesError}</p>
                  ) : null}
                  {activeInterests.length === 0 ? (
                    <p className="opacity-60 text-sm">
                      No interests yet — pick favourites in Menu → Profile, then generate words here.
                    </p>
                  ) : categoriesLoading ? (
                    <p className="opacity-60 text-sm">Loading your interest sets…</p>
                  ) : interestCategories.length === 0 ? (
                    <p className="opacity-60 text-sm">
                      No interest sets yet — add a category below or update interests in Menu → Profile.
                    </p>
                  ) : (
                    <ul className="space-y-3">{interestCategories.map(renderCategoryRow)}</ul>
                  )}
                </section>

                <section className="space-y-3">
                  <p className="text-xs uppercase tracking-wide opacity-60">Custom categories</p>
                  <div className="flex gap-2">
                    <input
                      className="classical-input flex-1"
                      placeholder="Add your own category"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                    <button
                      type="button"
                      className="classical-btn classical-btn-primary shrink-0"
                      disabled={creatingCategory || !newCategoryName.trim() || !token || !activeLanguage}
                      onClick={async () => {
                        if (!token || !activeLanguage || !newCategoryName.trim()) return;
                        setCreatingCategory(true);
                        try {
                          await createCategory(token, {
                            language: activeLanguage,
                            category_key: newCategoryName.trim(),
                          });
                          setNewCategoryName("");
                          await reload();
                        } catch (e) {
                          const message = e instanceof Error ? e.message : "Could not create category";
                          await reload();
                          if (message.toLowerCase().includes("already exists")) {
                            setNewCategoryName("");
                            alert("This category already exists — see the list above.");
                          } else {
                            alert(message);
                          }
                        } finally {
                          setCreatingCategory(false);
                        }
                      }}
                    >
                      {creatingCategory ? "Adding…" : "Add"}
                    </button>
                  </div>
                  {customCategories.length === 0 ? (
                    <p className="opacity-60 text-sm">No custom categories yet.</p>
                  ) : (
                    <ul className="space-y-3">{customCategories.map(renderCategoryRow)}</ul>
                  )}
                </section>
              </div>
            ) : subTab === "due" && !dueCategoryKey && !reviewing ? (
              <div className="space-y-3">
                <p className="text-sm opacity-70">Choose a category to review today&apos;s cards.</p>
                {categories.filter((cat) => cat.due_count > 0).length === 0 && otherDueCount === 0 ? (
                  <p className="opacity-60">Nothing due today.</p>
                ) : (
                  <ul className="space-y-3">
                    {categories
                      .filter((cat) => cat.due_count > 0)
                      .map((cat) => (
                        <li key={cat.id}>
                          <button
                            type="button"
                            className="classical-card w-full p-4 text-left"
                            onClick={() => setDueCategoryKey(cat.category_key)}
                          >
                            <p className="font-serif text-lg capitalize">{formatCategoryLabel(cat.category_key)}</p>
                            <p className="text-sm opacity-70">
                              {cat.accepted_count} word{cat.accepted_count === 1 ? "" : "s"} · {cat.due_count} due
                            </p>
                          </button>
                        </li>
                      ))}
                    {otherDueCount > 0 ? (
                      <li>
                        <button
                          type="button"
                          className="classical-card w-full p-4 text-left"
                          onClick={() => setDueCategoryKey(UNCATEGORIZED_DUE_CATEGORY_KEY)}
                        >
                          <p className="font-serif text-lg">Other</p>
                          <p className="text-sm opacity-70">
                            {otherDueCount} due · from chat and other sources
                          </p>
                        </button>
                      </li>
                    ) : null}
                  </ul>
                )}
              </div>
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
                      <button
                        key={r}
                        type="button"
                        className="classical-btn capitalize"
                        disabled={reviewSubmitting}
                        onClick={() => void submitReview(r)}
                      >
                        {reviewSubmitting ? "…" : r}
                      </button>
                    ))}
                  </div>
                ) : null}
                <button
                  type="button"
                  className="classical-btn w-full"
                  disabled={reviewSubmitting}
                  onClick={() => {
                    setReviewing(null);
                    setRevealed(false);
                  }}
                >
                  Cancel
                </button>
              </section>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  className="classical-btn text-sm"
                  onClick={() => {
                    setDueCategoryKey(null);
                    setReviewing(null);
                    setRevealed(false);
                  }}
                >
                  ← Back
                </button>
                <p className="text-sm opacity-70 capitalize">
                  {dueCategoryKey === UNCATEGORIZED_DUE_CATEGORY_KEY
                    ? "Other"
                    : formatCategoryLabel(dueCategoryKey ?? "")}
                </p>
                <ul className="space-y-3">
                {due.length === 0 ? (
                  <p className="opacity-60">Nothing due in this category.</p>
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
              </div>
            )}
          </>
        ) : tab === "vocabulary" ? (
          token && activeLanguage ? (
            <VocabularyList token={token} language={activeLanguage} />
          ) : (
            <p className="opacity-60">Sign in and set a language first.</p>
          )
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
