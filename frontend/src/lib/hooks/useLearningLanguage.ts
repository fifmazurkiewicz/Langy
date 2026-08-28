"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchProfiles } from "@/lib/api/profile";
import { useAuth } from "@/components/AuthProvider";

export type LearningLanguageStatus = "loading" | "ready" | "needs_setup";

export function useLearningLanguage() {
  const { token, activeLanguage, refreshProfile } = useAuth();
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
      await refreshProfile();
      const data = await fetchProfiles(token);
      const langs = data.profiles.map((p) => p.language);
      setLanguages(langs);
      const resolved = activeLanguage ?? data.active_language ?? langs[0] ?? null;
      setSessionLanguage(resolved);
      setStatus(resolved || langs.length > 0 ? "ready" : "needs_setup");
    } catch {
      const fallback = activeLanguage ?? "en-GB";
      setLanguages([fallback]);
      setSessionLanguage(fallback);
      setStatus("ready");
    }
  }, [token, activeLanguage, refreshProfile]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { sessionLanguage, languages, status, reload };
}
