"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { BottomNav } from "@/components/BottomNav";

export default function MenuPage() {
  const { token, email, signOut } = useAuth();
  const [spend, setSpend] = useState<{ cap: number; used: number } | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ spend_cap_usd: number; monthly_spend_usd: number }>("/api/auth/me", { token })
      .then((me) => setSpend({ cap: me.spend_cap_usd, used: me.monthly_spend_usd }))
      .catch(() => undefined);
  }, [token]);

  return (
    <div className="flex flex-1 flex-col pb-[calc(52px+env(safe-area-inset-bottom))]">
      <header className="border-b border-[var(--color-divider)] p-4">
        <h1 className="text-xl">Menu</h1>
      </header>
      <main className="flex-1 space-y-4 p-4">
        <section className="classical-card p-4">
          <h2 className="text-lg mb-2">Account</h2>
          <p className="text-sm">{email ?? "—"}</p>
        </section>
        {spend ? (
          <section className="classical-card p-4">
            <h2 className="text-lg mb-2">Monthly spend</h2>
            <p className="text-sm">
              ${spend.used.toFixed(2)} / ${spend.cap.toFixed(2)} USD
            </p>
          </section>
        ) : null}
        <button type="button" className="classical-btn w-full" onClick={() => void signOut()}>
          Sign out
        </button>
      </main>
      <BottomNav />
    </div>
  );
}
