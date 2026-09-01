"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { useOnApiHealthy } from "@/components/ApiPulseProvider";
import { clearOAuthRedirectParams, hasPendingOAuthRedirect } from "@/lib/auth/oauth";
import { createClient, DEV_TOKEN, DEV_USER_ID, isDevAuthMode } from "@/lib/supabase/client";

/**
 * `profile_unknown` is the cold-start state: the Supabase session is valid but the API has not
 * answered yet, so onboarding status is genuinely unknown. Routing must never guess from it.
 */
export type AuthStatus = "initializing" | "anonymous" | "profile_unknown" | "needs_onboarding" | "ready";

type ProfileState = "unknown" | "needs_onboarding" | "ready";

type MeResponse = {
  id: string;
  email: string | null;
  is_admin: boolean;
  active_language: string | null;
  onboarding_completed_at: string | null;
};

type SessionState = {
  status: AuthStatus;
  token: string | null;
  userId: string | null;
  email: string | null;
  isAdmin: boolean;
  activeLanguage: string | null;
  getAccessToken: () => Promise<string | null>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  markOnboardingComplete: () => void;
};

const AuthContext = createContext<SessionState | null>(null);

const AUTH_INIT_TIMEOUT_MS = 15_000;

function createInitGate() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const devMode = isDevAuthMode();
  const initGateRef = useRef(createInitGate());
  const [sessionResolved, setSessionResolved] = useState(devMode);
  const [token, setToken] = useState<string | null>(() => (devMode ? DEV_TOKEN : null));
  const [userId, setUserId] = useState<string | null>(() => (devMode ? DEV_USER_ID : null));
  const [email, setEmail] = useState<string | null>(() => (devMode ? "dev@langy.local" : null));
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState<string | null>(null);
  const [profileState, setProfileState] = useState<ProfileState>("unknown");
  /** Token whose /api/auth/me result we already hold — keeps cold starts to one request. */
  const profileTokenRef = useRef<string | null>(null);

  const finishInit = useCallback(() => {
    setSessionResolved(true);
    initGateRef.current.resolve();
  }, []);

  const clearSession = useCallback(() => {
    profileTokenRef.current = null;
    setToken(null);
    setUserId(null);
    setEmail(null);
    setIsAdmin(false);
    setActiveLanguage(null);
    setProfileState("unknown");
  }, []);

  const rejectSession = useCallback(async () => {
    clearSession();
    finishInit();
    if (!isDevAuthMode()) {
      await createClient()?.auth.signOut();
    }
  }, [clearSession, finishInit]);

  const applyMe = useCallback(
    async (access: string, force = false) => {
      if (!force && profileTokenRef.current === access) return;
      profileTokenRef.current = access;
      try {
        const me = await apiFetch<MeResponse>("/api/auth/me", { token: access });
        setUserId(me.id);
        setEmail(me.email);
        setIsAdmin(me.is_admin);
        setActiveLanguage(me.active_language);
        setProfileState(me.onboarding_completed_at ? "ready" : "needs_onboarding");
      } catch (err) {
        profileTokenRef.current = null;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          await rejectSession();
          return;
        }
        // Render cold start or offline API — stay unknown, never assume "not onboarded".
        setProfileState("unknown");
      }
    },
    [rejectSession]
  );

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (isDevAuthMode()) return DEV_TOKEN;
    await initGateRef.current.promise;

    const supabase = createClient();
    if (!supabase) return null;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const access = session?.access_token ?? null;
    setToken(access);
    setUserId(session?.user?.id ?? null);
    setEmail(session?.user?.email ?? null);
    return access;
  }, []);

  const refreshProfile = useCallback(async () => {
    const bearer = await getAccessToken();
    if (!bearer) return;
    await applyMe(bearer, true);
  }, [getAccessToken, applyMe]);

  useOnApiHealthy(
    useCallback(() => {
      if (profileState === "unknown" && token) void refreshProfile();
    }, [profileState, token, refreshProfile])
  );

  useEffect(() => {
    if (devMode) {
      initGateRef.current.resolve();
      queueMicrotask(() => void applyMe(DEV_TOKEN));
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      queueMicrotask(() => finishInit());
      return;
    }

    const timeoutId = setTimeout(() => {
      if (hasPendingOAuthRedirect()) {
        clearOAuthRedirectParams();
      }
      finishInit();
    }, AUTH_INIT_TIMEOUT_MS);

    void supabase.auth.getSession().then(({ data }) => {
      const access = data.session?.access_token ?? null;
      if (access) {
        setToken(access);
        setUserId(data.session?.user?.id ?? null);
        setEmail(data.session?.user?.email ?? null);
        finishInit();
        void applyMe(access);
        return;
      }
      // PKCE: ?code= in URL but session not ready — wait for onAuthStateChange, not anonymous.
      if (hasPendingOAuthRedirect()) return;
      finishInit();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token) {
        clearTimeout(timeoutId);
        setToken(session.access_token);
        setUserId(session.user.id);
        setEmail(session.user.email ?? null);
        finishInit();
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          void applyMe(session.access_token);
        }
        return;
      }
      if (event === "SIGNED_OUT") {
        clearTimeout(timeoutId);
        clearSession();
        finishInit();
      }
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [applyMe, clearSession, devMode, finishInit]);

  const signInWithGoogle = useCallback(async () => {
    if (isDevAuthMode()) {
      setToken(DEV_TOKEN);
      setUserId(DEV_USER_ID);
      setEmail("dev@langy.local");
      finishInit();
      await applyMe(DEV_TOKEN);
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }, [applyMe, finishInit]);

  const signOut = useCallback(async () => {
    if (!isDevAuthMode()) {
      await createClient()?.auth.signOut();
    }
    clearSession();
    finishInit();
  }, [clearSession, finishInit]);

  const markOnboardingComplete = useCallback(() => {
    setProfileState("ready");
  }, []);

  const status: AuthStatus = useMemo(() => {
    if (!sessionResolved) return "initializing";
    if (!token) return "anonymous";
    if (profileState === "unknown") return "profile_unknown";
    if (profileState === "needs_onboarding") return "needs_onboarding";
    return "ready";
  }, [sessionResolved, token, profileState]);

  const value = useMemo(
    () => ({
      status,
      token,
      userId,
      email,
      isAdmin,
      activeLanguage,
      getAccessToken,
      signInWithGoogle,
      signOut,
      refreshProfile,
      markOnboardingComplete,
    }),
    [
      status,
      token,
      userId,
      email,
      isAdmin,
      activeLanguage,
      getAccessToken,
      signInWithGoogle,
      signOut,
      refreshProfile,
      markOnboardingComplete,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
