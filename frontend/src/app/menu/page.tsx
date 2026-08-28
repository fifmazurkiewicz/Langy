"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { LANGUAGE_LABELS } from "@/lib/constants/profile";
import { fetchProfiles } from "@/lib/api/profile";
import { useAuth } from "@/components/AuthProvider";
import { BottomNav } from "@/components/BottomNav";
import { MenuRow } from "@/components/menu/MenuRow";

export default function MenuPage() {
  const { token, email, isAdmin, signOut } = useAuth();
  const [spend, setSpend] = useState<{ cap: number; used: number } | null>(null);
  const [languageSummary, setLanguageSummary] = useState("");

  useEffect(() => {
    if (!token) return;
    apiFetch<{ spend_cap_usd: number; monthly_spend_usd: number }>("/api/auth/me", { token })
      .then((me) => setSpend({ cap: me.spend_cap_usd, used: me.monthly_spend_usd }))
      .catch(() => undefined);
    fetchProfiles(token)
      .then((data) => {
        const labels = data.profiles.map((p) => LANGUAGE_LABELS[p.language] ?? p.language);
        setLanguageSummary(labels.join(" · ") || "—");
      })
      .catch(() => undefined);
  }, [token]);

  return (
    <div className="flex flex-1 flex-col pb-[calc(52px+env(safe-area-inset-bottom))]">
      <header className="border-b border-[var(--color-divider)] p-4 pt-[calc(1rem+env(safe-area-inset-top))]">
        <h1 className="font-serif text-3xl">Menu</h1>
      </header>
      <main className="flex-1 px-4">
        <div className="border-b border-[var(--color-divider)] py-5">
          <p className="font-serif text-2xl">{email?.split("@")[0] ?? "Account"}</p>
          <p className="text-sm text-[var(--color-soft)]">{email ?? "—"}</p>
          {spend ? (
            <p className="mt-2 text-xs text-[var(--color-soft)]">
              ${spend.used.toFixed(2)} / ${spend.cap.toFixed(2)} USD this month
            </p>
          ) : null}
        </div>

        <nav className="flex flex-col">
          <MenuRow href="/menu/languages" title="Languages" subtitle={languageSummary} />
          <MenuRow
            href="/menu/profile"
            title="Profile"
            subtitle="Motivation, interests, and skill levels"
          />
          <MenuRow href="/plan" title="Plan" subtitle="Optional CEFR path and lessons" />
          <MenuRow href="/menu/memory" title="Memory" subtitle="Facts and recent session notes" />
          <MenuRow href="/menu/appearance" title="Appearance" subtitle="Light, dark, or system" />
          {isAdmin ? (
            <MenuRow href="/menu/admin" title="Admin" subtitle="Users and spend caps" />
          ) : null}
        </nav>

        <button
          type="button"
          className="mt-8 text-xs uppercase tracking-wide text-[var(--color-soft)]"
          onClick={() => void signOut()}
        >
          Sign out
        </button>
      </main>
      <BottomNav />
    </div>
  );
}
