"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  getAccessToken: () => Promise<string | null>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  markOnboardingComplete: () => void;
};

const AuthContext = createContext<SessionState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const devMode = isDevAuthMode();
  const [token, setToken] = useState<string | null>(() => (devMode ? DEV_TOKEN : null));
  const [userId, setUserId] = useState<string | null>(() => (devMode ? DEV_USER_ID : null));
  const [email, setEmail] = useState<string | null>(() => (devMode ? "dev@langy.local" : null));
  const [isAdmin, setIsAdmin] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => !devMode);
  const tokenRef = useRef<string | null>(devMode ? DEV_TOKEN : null);

  const syncSession = useCallback(
    (access: string | null, user: { id: string; email?: string | null } | null) => {
      tokenRef.current = access;
      setToken(access);
      setUserId(user?.id ?? null);
      setEmail(user?.email ?? null);
    },
    []
  );

  const clearSession = useCallback(() => {
    tokenRef.current = null;
    setToken(null);
    setUserId(null);
    setEmail(null);
    setOnboardingCompleted(false);
    setActiveLanguage(null);
    setIsAdmin(false);
  }, []);

  const applyMe = useCallback(async (access: string) => {
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
  }, []);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (isDevAuthMode()) return DEV_TOKEN;
    if (tokenRef.current) return tokenRef.current;

    const supabase = createClient();
    if (!supabase) return null;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      syncSession(session.access_token, session.user);
      return session.access_token;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const {
      data: { session: retry },
    } = await supabase.auth.getSession();
    const access = retry?.access_token ?? null;
    if (access) {
      syncSession(access, user);
    }
    return access;
  }, [syncSession]);

  const refreshProfile = useCallback(async () => {
    const bearer = await getAccessToken();
    if (!bearer) return;
    await applyMe(bearer);
  }, [getAccessToken, applyMe]);

  useOnApiHealthy(
    useCallback(() => {
      if (tokenRef.current && !activeLanguage) void refreshProfile();
    }, [activeLanguage, refreshProfile])
  );

  useEffect(() => {
    if (devMode) return;

    const supabase = createClient();
    if (!supabase) {
      queueMicrotask(() => setLoading(false));
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      const access = data.session?.access_token ?? null;
      syncSession(access, data.session?.user ?? null);
      setLoading(false);
      if (access) void applyMe(access);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token) {
        syncSession(session.access_token, session.user);
        void applyMe(session.access_token);
        return;
      }
      if (event === "SIGNED_OUT") {
        clearSession();
      }
    });

    return () => subscription.unsubscribe();
  }, [applyMe, clearSession, devMode, syncSession]);

  const signInWithGoogle = useCallback(async () => {
    if (isDevAuthMode()) {
      syncSession(DEV_TOKEN, { id: DEV_USER_ID, email: "dev@langy.local" });
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
  }, [syncSession]);

  const signOut = useCallback(async () => {
    if (!isDevAuthMode()) {
      const supabase = createClient();
      await supabase?.auth.signOut();
    }
    clearSession();
  }, [clearSession]);

  const markOnboardingComplete = useCallback(() => {
    setOnboardingCompleted(true);
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
      getAccessToken,
      signInWithGoogle,
      signOut,
      refreshProfile,
      markOnboardingComplete,
    }),
    [token, userId, email, isAdmin, onboardingCompleted, activeLanguage, loading, getAccessToken, signInWithGoogle, signOut, refreshProfile, markOnboardingComplete]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
