"use client";

import Link from "next/link";

export function MenuBackHeader({ title }: { title: string }) {
  return (
    <header className="flex items-center gap-3 border-b border-[var(--color-divider)] px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <Link href="/menu" className="text-[var(--color-accent)]" aria-label="Back to Menu">
        ‹
      </Link>
      <h1 className="font-serif text-2xl">{title}</h1>
    </header>
  );
}
