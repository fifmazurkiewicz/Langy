"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

export function SpendCapBanner() {
  const { token } = useAuth();
  const [atCap, setAtCap] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ spend_cap_usd: number; monthly_spend_usd: number; at_cap?: boolean }>("/api/auth/me", {
      token,
    })
      .then((me) => {
        const capped =
          me.at_cap ?? (me.monthly_spend_usd >= me.spend_cap_usd && me.spend_cap_usd > 0);
        setAtCap(capped);
      })
      .catch(() => setAtCap(false));
  }, [token]);

  if (!atCap) return null;

  return (
    <div className="border-b border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] px-4 py-2 text-center text-sm">
      Monthly limit reached — costly features pause until next month. Reviews and browsing still work.
    </div>
  );
}
