"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  INTERESTS,
  LANGUAGE_LABELS,
  LANGUAGE_MARKERS,
  MOTIVATIONS,
  SKILL_ASPECTS,
  SUPPORTED_LANGUAGES,
} from "@/lib/constants/profile";
import { ChipToggleWithOther, resolveChipValues } from "@/components/profile/ChipToggleWithOther";
import { CefrPlacement } from "@/components/profile/CefrPlacement";
import { SkillCefrSlider } from "@/components/profile/SkillCefrSlider";
import { useAuth } from "@/components/AuthProvider";

const DURATIONS = [4, 8, 12, 16] as const;

type LangProfile = {
  motivations: string[];
  interests: string[];
  skills: Record<(typeof SKILL_ASPECTS)[number]["key"], number>;
};

const defaultProfile = (): LangProfile => ({
  motivations: [],
  interests: [],
  skills: { reading: 2, speaking: 2, writing: 2, listening: 2, vocabulary: 2 },
});

type Phase = "languages" | "profile" | "plan" | "active";

export default function OnboardingPage() {
  const router = useRouter();
  const { getAccessToken, loading: authLoading, refreshProfile, markOnboardingComplete } = useAuth();
  const [phase, setPhase] = useState<Phase>("languages");
  const [selected, setSelected] = useState<string[]>(["en-GB"]);
  const [profileIndex, setProfileIndex] = useState(0);
  const [profiles, setProfiles] = useState<Record<string, LangProfile>>({});
  const [wantsPlan, setWantsPlan] = useState(false);
  const [planLanguage, setPlanLanguage] = useState("en-GB");
  const [cefr, setCefr] = useState<string>("A2");
  const [planWeeks, setPlanWeeks] = useState<number>(8);
  const [activeLanguage, setActiveLanguage] = useState("en-GB");
  const [submitting, setSubmitting] = useState(false);
  const [otherTexts, setOtherTexts] = useState<Record<string, Record<string, string>>>({});
  const [placementDone, setPlacementDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      void getAccessToken().then((access) => {
        if (!access) router.replace("/login");
      });
    }
  }, [authLoading, getAccessToken, router]);

  const currentLang = selected[profileIndex];
  const currentProfile = profiles[currentLang] ?? defaultProfile();

  function updateCurrent(patch: Partial<LangProfile>) {
    if (!currentLang) return;
    setProfiles((prev) => ({
      ...prev,
      [currentLang]: { ...defaultProfile(), ...prev[currentLang], ...patch },
    }));
  }

  function toggleInList(field: "motivations" | "interests", value: string) {
    const list = currentProfile[field];
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    updateCurrent({ [field]: next });
  }

  function skipProfileForLanguage() {
    if (profileIndex < selected.length - 1) {
      setProfileIndex((i) => i + 1);
    } else {
      setPlanLanguage(selected[0]);
      setActiveLanguage(selected[0]);
      setPhase("plan");
    }
  }

  function nextProfileStep() {
    if (profileIndex < selected.length - 1) {
      setProfileIndex((i) => i + 1);
    } else {
      setPlanLanguage(selected[0]);
      setActiveLanguage(selected[0]);
      setPhase("plan");
    }
  }

  async function complete() {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setError("Session expired. Please sign in again.");
      router.replace("/login");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/onboarding/complete", {
        method: "POST",
        token: accessToken,
        body: {
          languages: selected,
          active_language: activeLanguage,
          profiles: selected.map((language) => {
            const p = profiles[language] ?? defaultProfile();
            const langOthers = otherTexts[language] ?? {};
            return {
              language,
              motivations: resolveChipValues(
                p.motivations.length ? p.motivations : ["fun"],
                langOthers,
                "motivation_other"
              ),
              interests: resolveChipValues(p.interests, langOthers, "interest_other"),
              skill_reading: p.skills.reading,
              skill_speaking: p.skills.speaking,
              skill_writing: p.skills.writing,
              skill_listening: p.skills.listening,
              skill_vocabulary: p.skills.vocabulary,
              cefr_level: wantsPlan && planLanguage === language ? cefr : null,
              plan_duration_weeks: wantsPlan && planLanguage === language ? planWeeks : null,
            };
          }),
        },
      });
      markOnboardingComplete();
      await refreshProfile();
      router.replace("/chat");
    } catch (e) {
      console.error(e);
      setError("Could not complete onboarding. Is the API running?");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <main className="mx-auto flex max-w-lg flex-1 flex-col gap-4 p-6 pb-12">
        <p className="font-serif text-lg text-[var(--color-soft)]">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-lg flex-1 flex-col gap-4 p-6 pb-12">
      <h1 className="font-serif text-3xl">Welcome</h1>

      {phase === "languages" ? (
        <section className="classical-card space-y-3 p-4">
          <h2 className="font-serif text-xl">Choose languages</h2>
          <p className="text-sm text-[var(--color-soft)]">Select every language you want to learn.</p>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <label key={lang.id} className="flex min-h-[44px] items-center gap-3">
              <input
                type="checkbox"
                checked={selected.includes(lang.id)}
                onChange={(e) => {
                  setSelected((prev) => {
                    const next = e.target.checked
                      ? [...prev, lang.id]
                      : prev.filter((l) => l !== lang.id);
                    return next.length ? next : prev;
                  });
                }}
              />
              <span className="mr-2 text-xs text-[var(--color-accent)]">{lang.marker}</span>
              {lang.label}
            </label>
          ))}
          <button
            type="button"
            className="classical-btn classical-btn-primary w-full"
            disabled={selected.length === 0}
            onClick={() => {
              setProfileIndex(0);
              setPhase("profile");
            }}
          >
            Continue
          </button>
        </section>
      ) : null}

      {phase === "profile" && currentLang ? (
        <section className="classical-card space-y-4 p-4">
          <div>
            <p className="text-xs text-[var(--color-soft)]">
              Language {profileIndex + 1} of {selected.length}
            </p>
            <h2 className="font-serif text-xl">
              {LANGUAGE_MARKERS[currentLang]} {LANGUAGE_LABELS[currentLang]}
            </h2>
          </div>

          <div className="space-y-2">
            <h3 className="font-serif text-lg">Motivation</h3>
            <div className="flex flex-wrap gap-2">
              {MOTIVATIONS.map((m) => (
                <ChipToggleWithOther
                  key={m}
                  label={m}
                  selected={currentProfile.motivations.includes(m)}
                  onToggle={() => toggleInList("motivations", m)}
                  otherText={otherTexts[currentLang]?.motivation_other}
                  onOtherTextChange={
                    m === "other"
                      ? (value) =>
                          setOtherTexts((prev) => ({
                            ...prev,
                            [currentLang]: { ...prev[currentLang], motivation_other: value },
                          }))
                      : undefined
                  }
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-serif text-lg">Interests</h3>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <ChipToggleWithOther
                  key={i}
                  label={i}
                  selected={currentProfile.interests.includes(i)}
                  onToggle={() => toggleInList("interests", i)}
                  otherText={otherTexts[currentLang]?.interest_other}
                  onOtherTextChange={
                    i === "other"
                      ? (value) =>
                          setOtherTexts((prev) => ({
                            ...prev,
                            [currentLang]: { ...prev[currentLang], interest_other: value },
                          }))
                      : undefined
                  }
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-serif text-lg">Self-assessment</h3>
            {SKILL_ASPECTS.map(({ key, label }) => (
              <SkillCefrSlider
                key={key}
                label={label}
                value={currentProfile.skills[key]}
                onChange={(next) =>
                  updateCurrent({
                    skills: { ...currentProfile.skills, [key]: next },
                  })
                }
              />
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <button type="button" className="classical-btn classical-btn-primary w-full" onClick={nextProfileStep}>
              Continue
            </button>
            <button type="button" className="classical-btn w-full opacity-80" onClick={skipProfileForLanguage}>
              Skip for now
            </button>
          </div>
        </section>
      ) : null}

      {phase === "plan" ? (
        <section className="classical-card space-y-3 p-4">
          <h2 className="font-serif text-xl">Study plan (optional)</h2>
          <p className="text-sm text-[var(--color-soft)]">CEFR placement and a structured path — or skip and use Chat freely.</p>
          <label className="flex min-h-[44px] items-center gap-2">
            <input
              type="checkbox"
              checked={wantsPlan}
              onChange={(e) => {
                setWantsPlan(e.target.checked);
                setPlacementDone(false);
              }}
            />
            Create a study plan
          </label>
          {wantsPlan ? (
            <>
              <select
                className="classical-input"
                value={planLanguage}
                onChange={(e) => {
                  setPlanLanguage(e.target.value);
                  setPlacementDone(false);
                }}
              >
                {selected.map((id) => (
                  <option key={id} value={id}>
                    {LANGUAGE_LABELS[id]}
                  </option>
                ))}
              </select>
              {!placementDone ? (
                <CefrPlacement
                  onResult={(level) => {
                    setCefr(level);
                    setPlacementDone(true);
                  }}
                  onSkip={() => setPlacementDone(true)}
                />
              ) : (
                <>
                  <p className="text-sm text-[var(--color-soft)]">
                    Suggested level: <strong>{cefr}</strong>
                  </p>
                  <select
                    className="classical-input"
                    value={planWeeks}
                    onChange={(e) => setPlanWeeks(Number(e.target.value))}
                  >
                    {DURATIONS.map((w) => (
                      <option key={w} value={w}>
                        {w} weeks
                      </option>
                    ))}
                  </select>
                </>
              )}
            </>
          ) : null}
          <button type="button" className="classical-btn classical-btn-primary w-full" onClick={() => setPhase("active")}>
            Continue
          </button>
        </section>
      ) : null}

      {phase === "active" ? (
        <section className="classical-card space-y-3 p-4">
          <h2 className="font-serif text-xl">Active language</h2>
          <p className="text-sm text-[var(--color-soft)]">Which language should Chat and Memo use first?</p>
          {selected.map((id) => (
            <label key={id} className="flex min-h-[44px] items-center gap-3">
              <input
                type="radio"
                name="active"
                checked={activeLanguage === id}
                onChange={() => setActiveLanguage(id)}
              />
              <span className="text-xs text-[var(--color-accent)]">{LANGUAGE_MARKERS[id]}</span>
              {LANGUAGE_LABELS[id]}
            </label>
          ))}
          <button
            type="button"
            className="classical-btn classical-btn-primary w-full"
            disabled={submitting}
            onClick={() => void complete()}
          >
            {submitting ? "Saving…" : "Start practicing"}
          </button>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </section>
      ) : null}
    </main>
  );
}
