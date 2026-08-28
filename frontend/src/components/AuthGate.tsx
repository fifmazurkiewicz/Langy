"use client";

import { useEffect } from "react";
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

/**
 * The only place in the app that decides which screen a visitor may see. Pages render their own
 * content and never redirect for auth reasons — that used to race across three separate effects.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, refreshProfile } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const redirectTo = resolveRedirect(status, pathname);

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
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

  return <>{children}</>;
}
