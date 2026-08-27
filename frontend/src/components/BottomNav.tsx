"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/chat", label: "Chat" },
  { href: "/memo", label: "Memo" },
  { href: "/menu", label: "Menu" },
];

export function BottomNav({ pendingCount = 0 }: { pendingCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-[var(--color-divider)] bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-lg">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          const showBadge = tab.href === "/memo" && pendingCount > 0;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`relative flex min-h-[52px] flex-col items-center justify-center text-sm ${
                  active ? "text-[var(--color-accent)]" : "text-[var(--color-text)]"
                }`}
              >
                {tab.label}
                {showBadge ? (
                  <span className="absolute top-2 right-[calc(50%-28px)] rounded-full bg-[var(--color-accent)] px-1.5 text-[10px] text-[var(--color-bg)]">
                    {pendingCount}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
