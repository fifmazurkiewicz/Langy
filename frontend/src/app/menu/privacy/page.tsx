"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { MenuBackHeader } from "@/components/menu/MenuBackHeader";
import { deleteAccount, exportPersonalData } from "@/lib/api/privacy";

export default function PrivacyDataPage() {
  const { token, signOut } = useAuth();
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState<"export" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    if (!token) return;
    setBusy("export"); setError(null);
    try {
      const data = await exportPersonalData(token);
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url; link.download = `langy-personal-data-${new Date().toISOString().slice(0, 10)}.json`; link.click();
      URL.revokeObjectURL(url);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not export data"); }
    finally { setBusy(null); }
  }

  async function handleDelete() {
    if (!token || confirmation !== "DELETE") return;
    setBusy("delete"); setError(null);
    try { await deleteAccount(token, confirmation); await signOut(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not delete account"); setBusy(null); }
  }

  return (
    <div className="flex min-h-full flex-col">
      <MenuBackHeader title="Privacy & data" />
      <main className="mx-auto w-full max-w-lg flex-1 space-y-8 px-4 py-6">
        <section className="space-y-3">
          <h2 className="font-serif text-xl">Your information</h2>
          <p className="text-sm leading-relaxed text-[var(--color-soft)]">Download a portable JSON copy of the account and learning data currently stored by Langy.</p>
          <button type="button" className="classical-btn" disabled={busy !== null} onClick={() => void handleExport()}>{busy === "export" ? "Preparing…" : "Export my data"}</button>
        </section>
        <section className="space-y-3 border-t border-[var(--color-divider)] pt-6">
          <h2 className="font-serif text-xl">Privacy information</h2>
          <Link href="/privacy" className="text-sm text-[var(--color-accent)] hover:underline">Read the Privacy Policy</Link>
        </section>
        <section className="space-y-3 border-t border-[var(--color-divider)] pt-6">
          <h2 className="font-serif text-xl text-red-400">Delete account</h2>
          <p className="text-sm leading-relaxed text-[var(--color-soft)]">This permanently deletes your Langy account, transcripts, memory, vocabulary, plans, shadowing sessions, and usage records. This cannot be undone.</p>
          <label className="block space-y-2 text-sm"><span>Type DELETE to confirm</span><input className="classical-input w-full" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="off" /></label>
          <button type="button" className="classical-btn border-red-500 text-red-400" disabled={busy !== null || confirmation !== "DELETE"} onClick={() => void handleDelete()}>{busy === "delete" ? "Deleting…" : "Delete my account"}</button>
        </section>
        {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
      </main>
    </div>
  );
}
