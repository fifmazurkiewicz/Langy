"use client";

import { useCallback, useState } from "react";
import { fetchProfiles } from "@/lib/api/profile";
import { useAuth } from "@/components/AuthProvider";
import { useDeferredEffect } from "@/lib/hooks/useDeferredEffect";

export type LearningLanguageStatus = "loading" | "ready" | "needs_setup" | "error";

export function useLearningLanguage() {
  const { token, activeLanguage } = useAuth();
  const [languages, setLanguages] = useState<string[]>([]);
  const [sessionLanguage, setSessionLanguage] = useState<string | null>(null);
  const [status, setStatus] = useState<LearningLanguageStatus>("loading");

  const reload = useCallback(async () => {
    if (!token) {
      setStatus("loading");
      return;
    }
    setStatus("loading");
    try {
      const data = await fetchProfiles(token);
      const langs = data.profiles.map((p) => p.language);
      setLanguages(langs);
      setSessionLanguage(data.active_language ?? activeLanguage ?? langs[0] ?? null);
      setStatus(langs.length > 0 ? "ready" : "needs_setup");
    } catch {
      // Never invent a language here: a fabricated fallback made Chat look usable without a profile.
      setLanguages([]);
      setSessionLanguage(null);
      setStatus("error");
    }
  }, [token, activeLanguage]);

  useDeferredEffect(() => reload(), [reload]);

  return { sessionLanguage, languages, status, reload };
}
