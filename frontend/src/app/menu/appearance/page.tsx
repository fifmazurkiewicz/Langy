"use client";

import type { ThemeMode } from "@/lib/constants/profile";
import { useTheme } from "@/components/ThemeProvider";
import { BottomNav } from "@/components/BottomNav";
import { MenuBackHeader } from "@/components/menu/MenuBackHeader";

const OPTIONS: { id: ThemeMode; label: string; hint: string }[] = [
  { id: "system", label: "System", hint: "Match your device" },
  { id: "light", label: "Light", hint: "Classical light palette" },
  { id: "dark", label: "Dark", hint: "Classical dark palette" },
];

export default function MenuAppearancePage() {
  const { mode, setMode } = useTheme();

  return (
    <div className="flex flex-1 flex-col pb-[calc(52px+env(safe-area-inset-bottom))]">
      <MenuBackHeader title="Appearance" />
      <main className="flex-1 space-y-2 p-4">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`classical-card flex w-full flex-col items-start gap-1 p-4 text-left ${
              mode === opt.id ? "border-[var(--color-accent)]" : ""
            }`}
            onClick={() => setMode(opt.id)}
          >
            <span className="font-serif text-xl">{opt.label}</span>
            <span className="text-xs text-[var(--color-soft)]">{opt.hint}</span>
          </button>
        ))}
      </main>
      <BottomNav />
    </div>
  );
}
