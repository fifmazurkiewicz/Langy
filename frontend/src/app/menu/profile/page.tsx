"use client";

import { useCallback, useState } from "react";
import {
  INTERESTS,
  LANGUAGE_LABELS,
  MOTIVATIONS,
  SKILL_ASPECTS,
} from "@/lib/constants/profile";
import { fetchProfiles, updateProfile, type LanguageProfile } from "@/lib/api/profile";
import { useAuth } from "@/components/AuthProvider";
import { BottomNav } from "@/components/BottomNav";
import { MenuBackHeader } from "@/components/menu/MenuBackHeader";
import { useDeferredEffect } from "@/lib/hooks/useDeferredEffect";

import { ChipToggle } from "@/components/profile/ChipToggle";
import { SkillCefrSlider } from "@/components/profile/SkillCefrSlider";

export default function MenuProfilePage() {
  const { token, activeLanguage } = useAuth();
  const [profiles, setProfiles] = useState<LanguageProfile[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const language = selectedLanguage ?? activeLanguage ?? profiles[0]?.language ?? null;

  const load = useCallback(async () => {
    if (!token) return;
    const data = await fetchProfiles(token);
    setProfiles(data.profiles);
    setSelectedLanguage((prev) => prev ?? data.active_language ?? data.profiles[0]?.language ?? null);
  }, [token]);

  useDeferredEffect(() => load(), [load]);

  const profile = profiles.find((p) => p.language === language);

  async function save(patch: Parameters<typeof updateProfile>[2]) {
    if (!token || !language) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile(token, language, patch);
      setSaved(true);
      await load();
    } finally {
      setSaving(false);
    }
  }

  function toggleList(field: "motivations" | "interests", value: string) {
    if (!profile) return;
    const current = profile[field];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    void save({ [field]: next });
  }

  return (
    <div className="flex flex-1 flex-col pb-[calc(52px+env(safe-area-inset-bottom))]">
      <MenuBackHeader title="Profile" />
      <main className="flex-1 space-y-6 p-4">
        {profiles.length > 1 ? (
          <select
            className="classical-input"
            value={language ?? ""}
            onChange={(e) => setSelectedLanguage(e.target.value)}
          >
            {profiles.map((p) => (
              <option key={p.language} value={p.language}>
                {LANGUAGE_LABELS[p.language] ?? p.language}
              </option>
            ))}
          </select>
        ) : null}

        {!profile ? (
          <p className="text-sm text-[var(--color-soft)]">Add a language first.</p>
        ) : (
          <>
            <section className="space-y-2">
              <h2 className="font-serif text-xl">Motivation</h2>
              <div className="flex flex-wrap gap-2">
                {MOTIVATIONS.map((m) => (
                  <ChipToggle
                    key={m}
                    label={m}
                    selected={profile.motivations.includes(m)}
                    onToggle={() => toggleList("motivations", m)}
                  />
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="font-serif text-xl">Interests</h2>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((i) => (
                  <ChipToggle
                    key={i}
                    label={i}
                    selected={profile.interests.includes(i)}
                    onToggle={() => toggleList("interests", i)}
                  />
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-serif text-xl">Self-assessment</h2>
              {SKILL_ASPECTS.map(({ key, label }) => {
                const skillKey = key as keyof typeof profile.skills;
                const val = profile.skills[skillKey] ?? 2;
                return (
                  <SkillCefrSlider
                    key={key}
                    label={label}
                    value={val}
                    onChange={(next) =>
                      void save({ [`skill_${key}`]: next } as Parameters<typeof updateProfile>[2])
                    }
                  />
                );
              })}
            </section>
          </>
        )}

        {saving ? <p className="text-xs text-[var(--color-soft)]">Saving…</p> : null}
        {saved && !saving ? <p className="text-xs text-[var(--color-accent)]">Saved</p> : null}
      </main>
      <BottomNav />
    </div>
  );
}
