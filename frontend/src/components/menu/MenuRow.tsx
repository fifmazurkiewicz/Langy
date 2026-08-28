"use client";

import Link from "next/link";

type Props = {
  href: string;
  title: string;
  subtitle?: string;
};

export function MenuRow({ href, title, subtitle }: Props) {
  return (
    <Link
      href={href}
      className="flex min-h-[56px] items-center justify-between border-b border-[var(--color-divider)] py-4"
    >
      <span className="flex flex-col gap-1">
        <span className="font-serif text-xl">{title}</span>
        {subtitle ? <span className="text-xs text-[var(--color-soft)]">{subtitle}</span> : null}
      </span>
      <span className="text-[var(--color-soft)]" aria-hidden="true">
        ›
      </span>
    </Link>
  );
}
