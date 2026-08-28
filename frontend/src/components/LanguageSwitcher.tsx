"use client";

import { useState } from "react";

const LABELS: Record<string, string> = {
  "en-GB": "English (British)",
  "en-US": "English (American)",
  de: "German",
  es: "Spanish",
  it: "Italian",
};

const MARKERS: Record<string, string> = {
  "en-GB": "GB",
  "en-US": "US",
  de: "DE",
  es: "ES",
  it: "IT",
};

export function LanguageSwitcher({
  activeLanguage,
  languages,
  onChange,
}: {
  activeLanguage: string | null;
  languages: string[];
  onChange: (lang: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!activeLanguage) return null;

  return (
    <>
      <button
        type="button"
        className="flex flex-1 items-center gap-2 text-left"
        onClick={() => setOpen(true)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex h-5 w-7 items-center justify-center border border-[var(--color-divider)] text-xs tracking-wide text-[var(--color-accent)]">
          {MARKERS[activeLanguage] ?? "??"}
        </span>
        <span className="font-serif text-lg">{LABELS[activeLanguage] ?? activeLanguage}</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/40">
          <button type="button" className="flex-1" aria-label="Close language menu" onClick={() => setOpen(false)} />
          <div className="classical-card rounded-t-md border-b-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <p className="mb-3 font-serif text-xl">Learning language</p>
            <ul role="listbox" className="space-y-1">
              {languages.map((lang) => (
                <li key={lang}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={lang === activeLanguage}
                    className={`flex w-full items-center gap-3 rounded px-2 py-3 text-left ${
                      lang === activeLanguage ? "text-[var(--color-accent)]" : ""
                    }`}
                    onClick={() => {
                      onChange(lang);
                      setOpen(false);
                    }}
                  >
                    <span className="flex h-5 w-7 items-center justify-center border border-[var(--color-divider)] text-xs tracking-wide">
                      {MARKERS[lang] ?? "??"}
                    </span>
                    <span className="font-serif text-xl">{LABELS[lang] ?? lang}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
