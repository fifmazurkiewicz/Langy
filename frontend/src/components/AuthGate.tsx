"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { resolveRedirect } from "@/lib/auth/routePolicy";

function Splash({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <p className="font-serif text-lg text-[var(--color-soft)]">{label}</p>
      {action}
    </main>
  );
}

const POLL_MS = 15_000;

function PendingApprovalScreen() {
  const { refreshProfile, signOut } = useAuth();

  useEffect(() => {
    const id = window.setInterval(() => {
      void refreshProfile();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [refreshProfile]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="classical-card w-full max-w-sm space-y-4 p-6">
        <h1 className="font-serif text-2xl text-[var(--color-text)]">Konto oczekuje na akceptację</h1>
        <p className="text-sm text-[var(--color-soft)]">
          Administrator musi zaakceptować to konto, zanim będzie można korzystać z Langy.
        </p>
        <div className="flex flex-col gap-2">
          <button type="button" className="classical-btn classical-btn-primary" onClick={() => void refreshProfile()}>
            Sprawdź status
          </button>
          <button type="button" className="classical-btn" onClick={() => void signOut()}>
            Wyloguj
          </button>
        </div>
      </div>
    </main>
  );
}

/**
 * The only place in the app that decides which screen a visitor may see. Pages render their own
 * content and never redirect for auth reasons — that used to race across three separate effects.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, refreshProfile } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const redirectTo = resolveRedirect(status, pathname);
  const navigatedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!redirectTo) {
      navigatedRef.current = null;
      return;
    }
    if (navigatedRef.current === redirectTo) return;
    navigatedRef.current = redirectTo;
    router.replace(redirectTo);
  }, [redirectTo, router]);

  if (redirectTo) return <Splash label="Taking you to the right place…" />;

  if (status === "initializing") return <Splash label="Loading Langy…" />;

  if (status === "profile_unknown") {
    return (
      <Splash
        label="Waking up the API…"
        action={
          <button type="button" className="classical-btn" onClick={() => void refreshProfile()}>
            Retry now
          </button>
        }
      />
    );
  }

  if (status === "pending_approval") {
    return <PendingApprovalScreen />;
  }

  return <>{children}</>;
}
