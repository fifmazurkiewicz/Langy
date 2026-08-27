"use client";

import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const { signInWithGoogle } = useAuth();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <div className="classical-card max-w-sm w-full p-8 text-center">
        <h1 className="text-3xl mb-2">Langy</h1>
        <p className="text-sm opacity-80 mb-6">Voice-first language practice</p>
        <button type="button" className="classical-btn classical-btn-primary w-full" onClick={() => void signInWithGoogle()}>
          Continue with Google
        </button>
        <p className="mt-4 text-xs opacity-60">Dev mode: sign in without Supabase env</p>
      </div>
    </main>
  );
}
