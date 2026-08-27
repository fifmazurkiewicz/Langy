"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

const LANGUAGES = [
  { id: "en-GB", label: "GB English" },
  { id: "en-US", label: "US English" },
  { id: "de", label: "DE German" },
  { id: "es", label: "ES Spanish" },
  { id: "it", label: "IT Italian" },
];

const INTERESTS = ["technology", "travel", "movies", "music", "sports", "food"];

export default function OnboardingPage() {
  const router = useRouter();
  const { token, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>(["en-GB"]);
  const [activeLanguage, setActiveLanguage] = useState("en-GB");
  const [interests, setInterests] = useState<string[]>(["travel"]);
  const [submitting, setSubmitting] = useState(false);

  async function complete() {
    if (!token) return;
    setSubmitting(true);
    try {
      await apiFetch("/api/onboarding/complete", {
        method: "POST",
        token,
        body: {
          languages: selected,
          active_language: activeLanguage,
          profiles: selected.map((language) => ({
            language,
            motivations: ["fun"],
            interests: language === activeLanguage ? interests : [],
            skill_listening: 2,
            skill_speaking: 2,
          })),
        },
      });
      await refreshProfile();
      router.replace("/chat");
    } catch (e) {
      console.error(e);
      alert("Could not complete onboarding. Is the API running?");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-lg flex-1 flex-col gap-4 p-6 pb-12">
      <h1 className="text-2xl">Welcome</h1>
      {step === 0 ? (
        <section className="classical-card p-4 space-y-3">
          <h2 className="text-lg">Choose languages</h2>
          {LANGUAGES.map((lang) => (
            <label key={lang.id} className="flex min-h-[44px] items-center gap-3">
              <input
                type="checkbox"
                checked={selected.includes(lang.id)}
                onChange={(e) => {
                  setSelected((prev) =>
                    e.target.checked ? [...prev, lang.id] : prev.filter((l) => l !== lang.id)
                  );
                }}
              />
              {lang.label}
            </label>
          ))}
          <button type="button" className="classical-btn classical-btn-primary w-full" onClick={() => setStep(1)}>
            Continue
          </button>
        </section>
      ) : null}
      {step === 1 ? (
        <section className="classical-card p-4 space-y-3">
          <h2 className="text-lg">Interests (active language)</h2>
          <select
            className="classical-input"
            value={activeLanguage}
            onChange={(e) => setActiveLanguage(e.target.value)}
          >
            {selected.map((id) => (
              <option key={id} value={id}>
                {LANGUAGES.find((l) => l.id === id)?.label ?? id}
              </option>
            ))}
          </select>
          {INTERESTS.map((item) => (
            <label key={item} className="flex min-h-[44px] items-center gap-3 capitalize">
              <input
                type="checkbox"
                checked={interests.includes(item)}
                onChange={(e) =>
                  setInterests((prev) =>
                    e.target.checked ? [...prev, item] : prev.filter((i) => i !== item)
                  )
                }
              />
              {item}
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
        </section>
      ) : null}
    </main>
  );
}
