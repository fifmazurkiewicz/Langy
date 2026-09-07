"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { listAdminUsers, setUserApproval, updateSpendCap, type AdminUser } from "@/lib/api/admin";

export default function AdminPage() {
  const { token, isAdmin, userId } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [capValue, setCapValue] = useState("10");

  useEffect(() => {
    if (!token || !isAdmin) return;
    listAdminUsers(token).then((r) => setUsers(r.items)).catch(() => setUsers([]));
  }, [token, isAdmin]);

  async function refresh() {
    if (!token) return;
    const r = await listAdminUsers(token);
    setUsers(r.items);
  }

  async function saveCap(id: string) {
    if (!token) return;
    await updateSpendCap(token, id, parseFloat(capValue));
    setEditing(null);
    await refresh();
  }

  async function toggleApproval(id: string, is_approved: boolean) {
    if (!token) return;
    await setUserApproval(token, id, is_approved);
    await refresh();
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
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <div className="flex items-center gap-3">
        <Link href="/menu" className="classical-btn px-2 py-1 text-sm">
          ← Menu
        </Link>
        <h1 className="text-2xl font-serif">Admin — spend caps</h1>
      </div>
      <p className="text-sm opacity-70">
        Costly features pause until next calendar month. Reviews stay available. Nothing is deleted.
      </p>
      <div className="hidden gap-2 border-b border-[var(--color-divider)] pb-2 text-sm font-medium md:grid md:grid-cols-7">
        <div>Name</div>
        <div>Email</div>
        <div className="text-right">Cap (USD)</div>
        <div>Used</div>
        <div>Spend</div>
        <div>Status</div>
        <div />
      </div>
      <ul className="space-y-2">
        {users.map((u) => {
          const isSelf = u.id === userId;
          return (
            <li
              key={u.id}
              className={`classical-card grid gap-2 p-4 md:grid-cols-7 md:items-center ${
                u.at_cap ? "border-red-400/50" : ""
              } ${u.is_approved ? "" : "border-[var(--color-accent)]"}`}
            >
              <div className="truncate text-sm font-serif">{u.display_name ?? "—"}</div>
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
              <div className="text-sm">
                <span
                  className={`inline-block rounded-sm px-2 py-0.5 text-xs ${
                    u.is_approved
                      ? "bg-[color-mix(in_srgb,var(--color-accent)_16%,transparent)]"
                      : "bg-[color-mix(in_srgb,var(--color-accent)_28%,var(--color-surface))]"
                  }`}
                >
                  {u.is_approved ? "Zaakceptowany" : "Oczekuje"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
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
                {u.is_approved ? (
                  isSelf ? null : (
                    <button
                      type="button"
                      className="classical-btn text-sm"
                      onClick={() => void toggleApproval(u.id, false)}
                    >
                      Cofnij dostęp
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    className="classical-btn classical-btn-primary text-sm"
                    onClick={() => void toggleApproval(u.id, true)}
                  >
                    Akceptuj
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
