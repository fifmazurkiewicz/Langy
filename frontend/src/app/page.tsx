"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function HomePage() {
  const router = useRouter();
  const { loading, token, onboardingCompleted } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!token) {
      router.replace("/login");
      return;
    }
    if (!onboardingCompleted) {
      router.replace("/onboarding");
      return;
    }
    router.replace("/chat");
  }, [loading, token, onboardingCompleted, router]);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <p className="font-serif text-lg">Loading Langy…</p>
    </main>
  );
}
