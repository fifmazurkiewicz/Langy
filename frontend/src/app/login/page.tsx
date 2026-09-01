"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ApiStatusIndicator } from "@/components/ApiStatusIndicator";

export default function LoginPage() {
  const { signInWithGoogle } = useAuth();
  const [oauthError] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("error") === "oauth";
  });

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <div className="classical-card max-w-sm w-full p-8 text-center">
        <h1 className="text-3xl mb-2">Langy</h1>
        <p className="text-sm opacity-80 mb-6">Voice-first language practice</p>
        {oauthError && (
          <p className="mb-4 text-sm text-amber-200/90" role="alert">
            Google sign-in failed. Try again, or check Supabase redirect URLs include{" "}
            <code className="text-xs">/auth/callback</code>.
          </p>
        )}
        <button
          type="button"
          className="classical-btn classical-btn-primary w-full"
          onClick={() => void signInWithGoogle()}
        >
          Continue with Google
        </button>
        <ApiStatusIndicator />
        <p className="mt-4 text-xs opacity-60">Dev mode: sign in without Supabase env</p>
      </div>
    </main>
  );
}
