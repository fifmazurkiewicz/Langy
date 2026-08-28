"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  INTERESTS,
  LANGUAGE_LABELS,
  LANGUAGE_MARKERS,
  MOTIVATIONS,
  SKILL_ASPECTS,
  SUPPORTED_LANGUAGES,
} from "@/lib/constants/profile";
import { ChipToggleWithOther, resolveChipValues } from "@/components/profile/ChipToggleWithOther";
import { addLanguage, fetchProfiles, setActiveLanguage } from "@/lib/api/profile";
import { useAuth } from "@/components/AuthProvider";
import { BottomNav } from "@/components/BottomNav";
import { MenuBackHeader } from "@/components/menu/MenuBackHeader";

type AddStep = "skills" | "profile";

export default function MenuLanguagesPage() {
  const router = useRouter();
  const { token, activeLanguage, refreshProfile } = useAuth();
  const [profiles, setProfiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [addStep, setAddStep] = useState<AddStep>("skills");
  const [skills, setSkills] = useState({ reading: 2, speaking: 2, writing: 2, listening: 2, vocabulary: 2 });
  const [motivations, setMotivations] = useState<string[]>(["fun"]);
  const [interests, setInterests] = useState<string[]>([]);
  const [motivationOther, setMotivationOther] = useState("");
  const [interestOther, setInterestOther] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await fetchProfiles(token);
      setProfiles(data.profiles.map((p) => p.language));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const available = SUPPORTED_LANGUAGES.filter((l) => !profiles.includes(l.id));

  async function activate(lang: string) {
    if (!token) return;
    await setActiveLanguage(token, lang);
    await refreshProfile();
    void load();
  }

  function toggleInList(field: "motivations" | "interests", value: string) {
    const list = field === "motivations" ? motivations : interests;
    const setter = field === "motivations" ? setMotivations : setInterests;
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    setter(next);
  }

  async function handleAdd(lang: string) {
    if (!token) return;
    setError(null);
    try {
      await addLanguage(token, {
        language: lang,
        motivations: resolveChipValues(motivations, { motivation_other: motivationOther }, "motivation_other"),
        interests: resolveChipValues(interests, { interest_other: interestOther }, "interest_other"),
        skill_reading: skills.reading,
        skill_speaking: skills.speaking,
        skill_writing: skills.writing,
        skill_listening: skills.listening,
        skill_vocabulary: skills.vocabulary,
        set_active: profiles.length === 0,
      });
      setAdding(null);
      setAddStep("skills");
      setMotivations(["fun"]);
      setInterests([]);
      setMotivationOther("");
      setInterestOther("");
      await refreshProfile();
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add language");
    }
  }

  return (
    <div className="flex flex-1 flex-col pb-[calc(52px+env(safe-area-inset-bottom))]">
      <MenuBackHeader title="Languages" />
      <main className="flex-1 space-y-4 p-4">
        {loading ? <p className="text-sm text-[var(--color-soft)]">Loading…</p> : null}
        <ul className="space-y-1">
          {profiles.map((lang) => (
            <li key={lang}>
              <button
                type="button"
                className={`flex w-full items-center gap-3 border-b border-[var(--color-divider)] py-4 text-left ${
                  lang === activeLanguage ? "text-[var(--color-accent)]" : ""
                }`}
                onClick={() => void activate(lang)}
              >
                <span className="flex h-5 w-7 items-center justify-center border border-[var(--color-divider)] text-xs tracking-wide">
                  {LANGUAGE_MARKERS[lang] ?? "??"}
                </span>
                <span className="flex-1 font-serif text-xl">{LANGUAGE_LABELS[lang] ?? lang}</span>
                {lang === activeLanguage ? <span className="text-sm">Active</span> : null}
              </button>
            </li>
          ))}
        </ul>

        {adding ? (
          <section className="classical-card space-y-3 p-4">
            <h2 className="font-serif text-lg">
              {addStep === "skills" ? "Self-assessment" : "Motivation & interests"} — {LANGUAGE_LABELS[adding]}
            </h2>
            {addStep === "skills" ? (
              <>
                <p className="text-sm text-[var(--color-soft)]">Rate each skill from 1 (beginner) to 5 (advanced).</p>
                {SKILL_ASPECTS.map(({ key, label }) => (
                  <label key={key} className="block text-sm">
                    {label}
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={skills[key as keyof typeof skills]}
                      onChange={(e) =>
                        setSkills((s) => ({ ...s, [key]: Number(e.target.value) }))
                      }
                      className="mt-1 w-full"
                    />
                  </label>
                ))}
                <div className="flex gap-2">
                  <button type="button" className="classical-btn flex-1" onClick={() => setAdding(null)}>
                    Cancel
                  </button>
                  <button type="button" className="classical-btn classical-btn-primary flex-1" onClick={() => setAddStep("profile")}>
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <h3 className="font-serif">Motivation</h3>
                  <div className="flex flex-wrap gap-2">
                    {MOTIVATIONS.map((m) => (
                      <ChipToggleWithOther
                        key={m}
                        label={m}
                        selected={motivations.includes(m)}
                        onToggle={() => toggleInList("motivations", m)}
                        otherText={motivationOther}
                        onOtherTextChange={m === "other" ? setMotivationOther : undefined}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-serif">Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {INTERESTS.map((i) => (
                      <ChipToggleWithOther
                        key={i}
                        label={i}
                        selected={interests.includes(i)}
                        onToggle={() => toggleInList("interests", i)}
                        otherText={interestOther}
                        onOtherTextChange={i === "other" ? setInterestOther : undefined}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="classical-btn flex-1" onClick={() => setAddStep("skills")}>
                    Back
                  </button>
                  <button
                    type="button"
                    className="classical-btn classical-btn-primary flex-1"
                    onClick={() => void handleAdd(adding)}
                  >
                    Add language
                  </button>
                </div>
              </>
            )}
          </section>
        ) : available.length > 0 ? (
          <button
            type="button"
            className="classical-btn classical-btn-primary w-full"
            onClick={() => {
              setAdding(available[0].id);
              setAddStep("skills");
            }}
          >
            Add a language
          </button>
        ) : null}

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        {available.length > 1 && adding ? (
          <div className="flex flex-wrap gap-2">
            {available.map((l) => (
              <button
                key={l.id}
                type="button"
                className={`classical-btn text-sm ${adding === l.id ? "classical-btn-primary" : ""}`}
                onClick={() => setAdding(l.id)}
              >
                {l.marker}
              </button>
            ))}
          </div>
        ) : null}

        <p className="text-xs text-[var(--color-soft)]">
          Tap a language to make it active across Chat and Memo. New languages include a short interview.
        </p>
        <button type="button" className="classical-btn w-full" onClick={() => router.push("/menu/profile")}>
          Edit motivation & interests
        </button>
      </main>
      <BottomNav />
    </div>
  );
}
