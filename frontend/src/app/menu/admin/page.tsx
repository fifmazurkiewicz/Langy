"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { listAdminUsers, updateSpendCap, type AdminUser } from "@/lib/api/admin";

export default function AdminPage() {
  const { token, isAdmin } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [capValue, setCapValue] = useState("10");

  useEffect(() => {
    if (!token || !isAdmin) return;
    listAdminUsers(token).then((r) => setUsers(r.items)).catch(() => setUsers([]));
  }, [token, isAdmin]);

  async function saveCap(userId: string) {
    if (!token) return;
    await updateSpendCap(token, userId, parseFloat(capValue));
    setEditing(null);
    const r = await listAdminUsers(token);
    setUsers(r.items);
  }

  if (!isAdmin) {
    return (
      <main className="p-6">
        <p>Admin access required.</p>
        <Link href="/menu" className="classical-btn mt-4 inline-block">
          Back to Menu
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6">
      <div className="flex items-center gap-3">
        <Link href="/menu" className="classical-btn px-2 py-1 text-sm">
          ← Menu
        </Link>
        <h1 className="text-2xl font-serif">Admin — spend caps</h1>
      </div>
      <p className="text-sm opacity-70">
        Costly features pause until next calendar month. Reviews stay available. Nothing is deleted.
      </p>
      <div className="hidden gap-2 border-b border-[var(--color-divider)] pb-2 text-sm font-medium md:grid md:grid-cols-5">
        <div>Email</div>
        <div className="text-right">Cap (USD)</div>
        <div>Used</div>
        <div>Status</div>
        <div />
      </div>
      <ul className="space-y-2">
        {users.map((u) => (
          <li
            key={u.id}
            className={`classical-card grid gap-2 p-4 md:grid-cols-5 md:items-center ${u.at_cap ? "border-red-400/50" : ""}`}
          >
            <div className="truncate text-sm">{u.email ?? u.id}</div>
            <div className="text-right text-sm">
              {editing === u.id ? (
                <input
                  className="classical-input w-20 text-right"
                  value={capValue}
                  onChange={(e) => setCapValue(e.target.value)}
                />
              ) : (
                `$${u.spend_cap_usd.toFixed(2)}`
              )}
            </div>
            <div className="text-sm">${u.monthly_spend_usd.toFixed(2)}</div>
            <div className="text-sm">{u.at_cap ? "At cap" : "OK"}</div>
            <div>
              {editing === u.id ? (
                <button type="button" className="classical-btn classical-btn-primary text-sm" onClick={() => void saveCap(u.id)}>
                  Save
                </button>
              ) : (
                <button
                  type="button"
                  className="classical-btn text-sm"
                  onClick={() => {
                    setEditing(u.id);
                    setCapValue(String(u.spend_cap_usd));
                  }}
                >
                  Edit cap
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
