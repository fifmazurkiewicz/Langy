"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  INTERESTS,
  LANGUAGE_LABELS,
  MOTIVATIONS,
  SKILL_ASPECTS,
} from "@/lib/constants/profile";
import { fetchProfiles, updateProfile, type LanguageProfile } from "@/lib/api/profile";
import { fetchVoiceCatalog, type VoiceCatalog } from "@/lib/api/voice";
import { useAuth } from "@/components/AuthProvider";
import { BottomNav } from "@/components/BottomNav";
import { MenuBackHeader } from "@/components/menu/MenuBackHeader";
import { useDeferredEffect } from "@/lib/hooks/useDeferredEffect";

import { ChipToggle } from "@/components/profile/ChipToggle";
import { SkillCefrSlider } from "@/components/profile/SkillCefrSlider";
import { VoicePicker } from "@/components/profile/VoicePicker";

type ProfileDraft = {
  motivations: string[];
  interests: string[];
  skills: LanguageProfile["skills"];
  tts_voice_key: string;
  tts_custom_voice_id: string;
};

function sortedKey(values: string[]) {
  return [...values].sort().join(",");
}

function isDraftDirty(draft: ProfileDraft, profile: LanguageProfile) {
  if (sortedKey(draft.motivations) !== sortedKey(profile.motivations)) return true;
  if (sortedKey(draft.interests) !== sortedKey(profile.interests)) return true;
  for (const { key } of SKILL_ASPECTS) {
    const skillKey = key as keyof LanguageProfile["skills"];
    if ((draft.skills[skillKey] ?? 2) !== (profile.skills[skillKey] ?? 2)) return true;
  }
  if (draft.tts_voice_key !== profile.tts_voice_key) return true;
  if ((draft.tts_custom_voice_id || "") !== (profile.tts_custom_voice_id || "")) return true;
  return false;
}

export default function MenuProfilePage() {
  const { token, activeLanguage } = useAuth();
  const [profiles, setProfiles] = useState<LanguageProfile[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [voiceCatalog, setVoiceCatalog] = useState<VoiceCatalog | null>(null);

  const language = selectedLanguage ?? activeLanguage ?? profiles[0]?.language ?? null;

  const load = useCallback(async () => {
    if (!token) return;
    const data = await fetchProfiles(token);
    setProfiles(data.profiles);
    setSelectedLanguage((prev) => prev ?? data.active_language ?? data.profiles[0]?.language ?? null);
  }, [token]);

  useDeferredEffect(() => load(), [load]);

  const profile = profiles.find((p) => p.language === language);

  useEffect(() => {
    if (!profile) {
      setDraft(null);
      return;
    }
    setDraft({
      motivations: [...profile.motivations],
      interests: [...profile.interests],
      skills: { ...profile.skills },
      tts_voice_key: profile.tts_voice_key,
      tts_custom_voice_id: profile.tts_custom_voice_id ?? "",
    });
    setSaved(false);
  }, [profile]);

  useEffect(() => {
    if (!token || !language) {
      setVoiceCatalog(null);
      return;
    }
    fetchVoiceCatalog(token, language)
      .then(setVoiceCatalog)
      .catch(() => setVoiceCatalog(null));
  }, [token, language]);

  const isDirty = useMemo(
    () => (draft && profile ? isDraftDirty(draft, profile) : false),
    [draft, profile]
  );

  async function handleSave() {
    if (!token || !language || !draft || !isDirty) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile(token, language, {
        motivations: draft.motivations,
        interests: draft.interests,
        skill_reading: draft.skills.reading ?? undefined,
        skill_speaking: draft.skills.speaking ?? undefined,
        skill_writing: draft.skills.writing ?? undefined,
        skill_listening: draft.skills.listening ?? undefined,
        skill_vocabulary: draft.skills.vocabulary ?? undefined,
        tts_voice_key: draft.tts_voice_key,
        tts_custom_voice_id: draft.tts_custom_voice_id.trim() || null,
      });
      setSaved(true);
      await load();
    } finally {
      setSaving(false);
    }
  }

  function toggleList(field: "motivations" | "interests", value: string) {
    if (!draft) return;
    const current = draft[field];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    setDraft({ ...draft, [field]: next });
    setSaved(false);
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

        {!profile || !draft ? (
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
                    selected={draft.motivations.includes(m)}
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
                    selected={draft.interests.includes(i)}
                    onToggle={() => toggleList("interests", i)}
                  />
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-serif text-xl">Self-assessment</h2>
              {SKILL_ASPECTS.map(({ key, label }) => {
                const skillKey = key as keyof typeof draft.skills;
                const val = draft.skills[skillKey] ?? 2;
                return (
                  <SkillCefrSlider
                    key={key}
                    label={label}
                    value={val}
                    onChange={(next) => {
                      setDraft({
                        ...draft,
                        skills: { ...draft.skills, [skillKey]: next },
                      });
                      setSaved(false);
                    }}
                  />
                );
              })}
            </section>

            {token && voiceCatalog ? (
              <VoicePicker
                token={token}
                language={language}
                catalog={voiceCatalog}
                selectedKey={draft.tts_voice_key}
                customVoiceId={draft.tts_custom_voice_id}
                disabled={saving}
                onSelect={(key) => {
                  setDraft({ ...draft, tts_voice_key: key });
                  setSaved(false);
                }}
                onCustomVoiceIdChange={(id) => {
                  setDraft({ ...draft, tts_custom_voice_id: id });
                  setSaved(false);
                }}
              />
            ) : null}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                className="classical-btn classical-btn-primary w-full"
                disabled={!isDirty || saving}
                onClick={() => void handleSave()}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              {saved && !saving && !isDirty ? (
                <p className="text-xs text-[var(--color-accent)]">Saved</p>
              ) : null}
            </div>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
