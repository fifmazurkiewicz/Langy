"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useOnApiHealthy } from "@/components/ApiPulseProvider";
import { createClient, DEV_TOKEN, DEV_USER_ID, isDevAuthMode } from "@/lib/supabase/client";

type SessionState = {
  token: string | null;
  userId: string | null;
  email: string | null;
  isAdmin: boolean;
  onboardingCompleted: boolean;
  activeLanguage: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<SessionState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!token) return;
    try {
      const me = await apiFetch<{
        onboarding_completed_at: string | null;
        active_language: string | null;
        email: string | null;
        id: string;
        is_admin: boolean;
      }>("/api/auth/me", { token });
      setOnboardingCompleted(Boolean(me.onboarding_completed_at));
      setActiveLanguage(me.active_language);
      setEmail(me.email);
      setUserId(me.id);
      setIsAdmin(me.is_admin);
    } catch {
      /* dev without backend */
    }
  }, [token]);

  useOnApiHealthy(
    useCallback(() => {
      if (token && !activeLanguage) void refreshProfile();
    }, [token, activeLanguage, refreshProfile])
  );

  useEffect(() => {
    async function init() {
      if (isDevAuthMode()) {
        setToken(DEV_TOKEN);
        setUserId(DEV_USER_ID);
        setEmail("dev@langy.local");
        setOnboardingCompleted(false);
        setLoading(false);
        return;
      }
      const supabase = createClient();
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      const access = data.session?.access_token ?? null;
      setToken(access);
      setUserId(data.session?.user.id ?? null);
      setEmail(data.session?.user.email ?? null);
      setLoading(false);
      if (access) {
        try {
          const me = await apiFetch<{
            onboarding_completed_at: string | null;
            active_language: string | null;
            email: string | null;
            id: string;
            is_admin: boolean;
          }>("/api/auth/me", { token: access });
          setOnboardingCompleted(Boolean(me.onboarding_completed_at));
          setActiveLanguage(me.active_language);
          setEmail(me.email);
          setUserId(me.id);
          setIsAdmin(me.is_admin);
        } catch {
          /* backend may be offline */
        }
      }
    }
    void init();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (isDevAuthMode()) {
      setToken(DEV_TOKEN);
      setUserId(DEV_USER_ID);
      setEmail("dev@langy.local");
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/chat`,
      },
    });
  }, []);

  const signOut = useCallback(async () => {
    if (!isDevAuthMode()) {
      const supabase = createClient();
      await supabase?.auth.signOut();
    }
    setToken(null);
    setUserId(null);
    setEmail(null);
    setOnboardingCompleted(false);
    setActiveLanguage(null);
    setIsAdmin(false);
  }, []);

  const value = useMemo(
    () => ({
      token,
      userId,
      email,
      isAdmin,
      onboardingCompleted,
      activeLanguage,
      loading,
      signInWithGoogle,
      signOut,
      refreshProfile,
    }),
    [token, userId, email, isAdmin, onboardingCompleted, activeLanguage, loading, signInWithGoogle, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
