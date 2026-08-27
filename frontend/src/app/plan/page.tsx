"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { BottomNav } from "@/components/BottomNav";
import { createPlan, getPlan, openLesson, completeLesson, type StudyPlan } from "@/lib/api/plan";

const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"];
const DURATIONS = [4, 8, 12, 16];

export default function PlanPage() {
  const { token, activeLanguage } = useAuth();
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [cefr, setCefr] = useState("A2");
  const [weeks, setWeeks] = useState(8);
  const [lesson, setLesson] = useState<{
    id: string;
    title: string;
    content: { body?: string };
    day_index: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || !activeLanguage) return;
    getPlan(token, activeLanguage).then((r) => setPlan(r.plan)).catch(() => setPlan(null));
  }, [token, activeLanguage]);

  async function startPlan() {
    if (!token || !activeLanguage) return;
    setLoading(true);
    try {
      const created = await createPlan(token, {
        language: activeLanguage,
        cefr_level: cefr,
        duration_weeks: weeks,
      });
      setPlan(created as unknown as StudyPlan);
    } finally {
      setLoading(false);
    }
  }

  async function openDay(day: number) {
    if (!token) return;
    const l = await openLesson(token, day, activeLanguage ?? undefined);
    setLesson({ id: l.id, title: l.title, content: l.content, day_index: l.day_index });
  }

  async function finishLesson() {
    if (!token || !lesson) return;
    const res = await completeLesson(token, lesson.id);
    setLesson(null);
    if (activeLanguage && token) {
      const r = await getPlan(token, activeLanguage);
      setPlan(r.plan);
    }
    if (res.pending_vocab > 0) alert(`${res.pending_vocab} word(s) added to Pending`);
  }

  return (
    <div className="flex flex-1 flex-col pb-[calc(52px+env(safe-area-inset-bottom))]">
      <header className="border-b border-[var(--color-divider)] p-4 flex items-center gap-3">
        <Link href="/menu" className="classical-btn px-2 py-1 text-sm">
          ← Menu
        </Link>
        <h1 className="text-xl">Study plan</h1>
      </header>
      <main className="flex-1 space-y-4 p-4">
        {!token || !activeLanguage ? (
          <p className="opacity-60">Sign in and set a language first.</p>
        ) : !plan ? (
          <section className="classical-card space-y-3 p-4">
            <p className="text-sm opacity-80">Optional CEFR path — skip anytime; Chat works without a plan.</p>
            <label className="block text-sm">
              CEFR level
              <select className="classical-input mt-1 w-full" value={cefr} onChange={(e) => setCefr(e.target.value)}>
                {CEFR.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Duration (weeks)
              <select
                className="classical-input mt-1 w-full"
                value={weeks}
                onChange={(e) => setWeeks(Number(e.target.value))}
              >
                {DURATIONS.map((w) => (
                  <option key={w} value={w}>
                    {w} weeks
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="classical-btn classical-btn-primary w-full"
              disabled={loading}
              onClick={() => void startPlan()}
            >
              {loading ? "Creating…" : "Create plan"}
            </button>
          </section>
        ) : (
          <>
            <p className="text-sm opacity-80">
              {plan.cefr_level} · {plan.duration_weeks} weeks · Day {plan.progress_day}
            </p>
            {lesson ? (
              <section className="classical-card space-y-3 p-4">
                <h2 className="font-serif text-lg">{lesson.title}</h2>
                <p className="text-sm">{lesson.content?.body ?? "Lesson content"}</p>
                <button type="button" className="classical-btn classical-btn-primary w-full" onClick={() => void finishLesson()}>
                  Complete lesson
                </button>
                <button type="button" className="classical-btn w-full" onClick={() => setLesson(null)}>
                  Back to grid
                </button>
              </section>
            ) : (
              <ul className="space-y-2">
                {plan.generated_plan?.weeks?.flatMap((w) =>
                  w.days.map((d) => (
                    <li key={d.day}>
                      <button
                        type="button"
                        className="classical-card w-full p-3 text-left"
                        onClick={() => void openDay(d.day)}
                      >
                        <span className="text-xs opacity-60">Day {d.day}</span>
                        <p className="font-serif">{d.title}</p>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
