"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { BottomNav } from "@/components/BottomNav";
import { ApiError } from "@/lib/api";
import {
  completeLesson,
  createPlan,
  generatePlan,
  getPlan,
  openLesson,
  type LessonDetail,
  type StudyPlan,
} from "@/lib/api/plan";
import { useDeferredEffect } from "@/lib/hooks/useDeferredEffect";
import { lessonChatHref } from "@/lib/plan/lessonChat";
import { groupLessonsByWeek, recentlyCompleted } from "@/lib/plan/progress";
import { notify } from "@/lib/uiFeedback";

const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"];
const DURATIONS = [4, 8, 12, 16];
const DURATION_HINTS: Record<number, string> = {
  4: "5 lessons a week",
  8: "4 lessons a week",
  12: "3 lessons a week",
  16: "2 lessons a week",
};

type Tab = "lessons" | "progress";

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 402) return "Monthly spend cap reached — lessons are paused until next month.";
    return err.message || fallback;
  }
  return fallback;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-divider)]"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${percent}%` }} />
    </div>
  );
}

export default function PlanPage() {
  const { token, activeLanguage } = useAuth();
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [suggestedLevel, setSuggestedLevel] = useState<string | null>(null);
  const [loadedLanguage, setLoadedLanguage] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("lessons");
  const [cefr, setCefr] = useState("A2");
  const [weeks, setWeeks] = useState(8);
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [openingDay, setOpeningDay] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  const reload = useCallback(async () => {
    if (!token || !activeLanguage) return;
    try {
      const r = await getPlan(token, activeLanguage);
      setLesson(null);
      setPlan(r.plan);
      setSuggestedLevel(r.suggested_level);
      if (r.suggested_level) setCefr(r.suggested_level);
    } catch {
      setPlan(null);
    } finally {
      setLoadedLanguage(activeLanguage);
    }
  }, [token, activeLanguage]);

  useDeferredEffect(() => reload(), [reload]);

  const loaded = loadedLanguage === activeLanguage;

  async function runCreate(level: "auto" | string) {
    if (!token || !activeLanguage) return;
    setBusy(true);
    try {
      const created =
        level === "auto"
          ? await generatePlan(token, { language: activeLanguage, duration_weeks: weeks })
          : await createPlan(token, { language: activeLanguage, cefr_level: level, duration_weeks: weeks });
      setPlan(created);
      setShowSetup(false);
      setTab("lessons");
      notify(`Your ${created.cefr_level} plan is ready — start with Day 1.`, "success");
    } catch (err) {
      notify(errorMessage(err, "Could not create the plan."), "error");
    } finally {
      setBusy(false);
    }
  }

  async function openDay(day: number) {
    if (!token || openingDay !== null) return;
    setOpeningDay(day);
    try {
      setLesson(await openLesson(token, day, activeLanguage ?? undefined));
    } catch (err) {
      notify(errorMessage(err, "Could not open the lesson."), "error");
    } finally {
      setOpeningDay(null);
    }
  }

  async function finishLesson() {
    if (!token || !lesson || !plan) return;
    setBusy(true);
    try {
      const res = await completeLesson(token, lesson.id);
      setPlan({ ...plan, progress: res.progress, progress_day: res.progress.next_day ?? plan.progress_day });
      setLesson(null);
      notify(
        res.pending_vocab > 0
          ? `Lesson completed · ${res.pending_vocab} word(s) added to Pending`
          : "Lesson completed",
        "success"
      );
    } catch (err) {
      notify(errorMessage(err, "Could not complete the lesson."), "error");
    } finally {
      setBusy(false);
    }
  }

  function startOver() {
    if (window.confirm("Start a new plan? Your current plan and its progress will be archived.")) {
      setShowSetup(true);
    }
  }

  const progress = plan?.progress;
  const allDone = progress ? progress.total_lessons > 0 && progress.completed_lessons === progress.total_lessons : false;

  const setupForm = (
    <section className="classical-card space-y-4 p-4">
      <div className="space-y-1">
        <h2 className="font-serif text-xl">Not sure where to start?</h2>
        <p className="text-sm text-[var(--color-soft)]">
          We&apos;ll build a step-by-step plan with short lessons matched to your level. Do one lesson at a time — Chat and
          Memo keep working alongside.
        </p>
      </div>
      <label className="block text-sm">
        Pace
        <select className="classical-input mt-1 w-full" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
          {DURATIONS.map((w) => (
            <option key={w} value={w}>
              {w} weeks · {DURATION_HINTS[w]}
            </option>
          ))}
        </select>
      </label>
      {suggestedLevel ? (
        <>
          <p className="text-sm">
            Your level: <span className="font-semibold">{suggestedLevel}</span>{" "}
            <span className="text-[var(--color-soft)]">(from your Profile)</span>
          </p>
          <button
            type="button"
            className="classical-btn classical-btn-primary w-full"
            disabled={busy}
            onClick={() => void runCreate("auto")}
          >
            {busy ? "Generating…" : "Generate my learning plan"}
          </button>
        </>
      ) : (
        <p className="text-sm">
          Your level isn&apos;t set yet.{" "}
          <Link href="/menu/profile" className="underline">
            Set your skill levels in Profile
          </Link>{" "}
          so we can match lessons to you, or pick a level below.
        </p>
      )}
      <details className="text-sm" open={!suggestedLevel}>
        <summary className="cursor-pointer text-[var(--color-soft)]">Choose a level manually</summary>
        <div className="mt-3 space-y-3">
          <label className="block">
            CEFR level
            <select className="classical-input mt-1 w-full" value={cefr} onChange={(e) => setCefr(e.target.value)}>
              {CEFR.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="classical-btn w-full" disabled={busy} onClick={() => void runCreate(cefr)}>
            {busy ? "Creating…" : `Create ${cefr} plan`}
          </button>
        </div>
      </details>
      {plan ? (
        <button type="button" className="classical-btn w-full" onClick={() => setShowSetup(false)}>
          Keep current plan
        </button>
      ) : null}
    </section>
  );

  return (
    <div className="flex flex-1 flex-col pb-[calc(52px+env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-3 border-b border-[var(--color-divider)] p-4">
        <Link href="/menu" className="classical-btn px-2 py-1 text-sm">
          ← Menu
        </Link>
        <h1 className="text-xl">Study plan</h1>
      </header>
      <main className="flex-1 space-y-4 p-4">
        {!token || !activeLanguage ? (
          <p className="opacity-60">Sign in and set a language first.</p>
        ) : !loaded ? (
          <p className="text-sm text-[var(--color-soft)]">Loading plan…</p>
        ) : !plan || showSetup ? (
          setupForm
        ) : lesson ? (
          <section className="classical-card space-y-3 p-4">
            <p className="text-xs text-[var(--color-soft)]">
              Week {lesson.week_index} · Day {lesson.day_index} · {lesson.lesson_type}
            </p>
            <h2 className="font-serif text-lg">{lesson.title}</h2>
            <p className="whitespace-pre-line text-sm">{lesson.content?.body || "Lesson content"}</p>
            <Link
              href={lessonChatHref({ id: lesson.id, title: lesson.title })}
              className="classical-btn classical-btn-primary flex w-full items-center justify-center text-center"
            >
              Talk with Langy about this lesson
            </Link>
            {lesson.is_completed ? (
              <p className="text-sm text-[var(--color-success)]">✓ Completed {formatDate(lesson.completed_at)}</p>
            ) : (
              <button
                type="button"
                className="classical-btn w-full"
                disabled={busy}
                onClick={() => void finishLesson()}
              >
                {busy ? "Saving…" : "Mark lesson as completed"}
              </button>
            )}
            <button type="button" className="classical-btn w-full" onClick={() => setLesson(null)}>
              Back to plan
            </button>
          </section>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-semibold">{plan.cefr_level}</span> · {plan.duration_weeks} weeks ·{" "}
                {progress?.completed_lessons ?? 0}/{progress?.total_lessons ?? 0} lessons done
              </p>
              <ProgressBar percent={progress?.percent ?? 0} label="Plan progress" />
            </div>
            <div className="segmented-control text-sm" role="tablist" aria-label="Plan sections">
              {(["lessons", "progress"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`classical-btn px-3 py-2 capitalize ${tab === t ? "classical-btn-primary" : ""}`}
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === "lessons" && progress ? (
              <div className="space-y-5">
                {!allDone && progress.next_day ? (
                  <button
                    type="button"
                    className="classical-btn classical-btn-primary w-full"
                    disabled={openingDay !== null}
                    onClick={() => void openDay(progress.next_day as number)}
                  >
                    {openingDay === progress.next_day ? "Preparing lesson…" : `Continue · Day ${progress.next_day}`}
                  </button>
                ) : null}
                {groupLessonsByWeek(progress.lessons).map((w) => (
                  <section key={w.week} className="space-y-2">
                    <h2 className="text-xs uppercase tracking-wide text-[var(--color-soft)]">Week {w.week}</h2>
                    <ul className="space-y-2">
                      {w.lessons.map((d) => {
                        const isNext = d.day === progress.next_day;
                        return (
                          <li key={d.day}>
                            <button
                              type="button"
                              className={`classical-card flex w-full items-center gap-3 p-3 text-left ${
                                isNext ? "border-[var(--color-accent)]" : ""
                              }`}
                              disabled={openingDay !== null}
                              onClick={() => void openDay(d.day)}
                            >
                              <span
                                aria-hidden
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                                  d.is_completed
                                    ? "border-[var(--color-success)] bg-[var(--color-success)] text-[var(--color-bg)]"
                                    : "border-[var(--color-divider)]"
                                }`}
                              >
                                {d.is_completed ? "✓" : d.day}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-xs text-[var(--color-soft)]">
                                  Day {d.day}
                                  {d.is_completed ? " · Completed" : isNext ? " · Up next" : ""}
                                </span>
                                <span className="block truncate font-serif">
                                  {openingDay === d.day ? "Preparing lesson…" : d.title}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            ) : null}

            {tab === "progress" && progress ? (
              <div className="space-y-4">
                <section className="classical-card space-y-2 p-4">
                  <p className="font-serif text-3xl">{progress.percent}%</p>
                  <p className="text-sm text-[var(--color-soft)]">
                    {allDone
                      ? "Plan finished — great work! Start a new plan to keep going."
                      : `${progress.completed_lessons} of ${progress.total_lessons} lessons completed · next up: Day ${progress.next_day}`}
                  </p>
                </section>
                <section className="classical-card space-y-3 p-4">
                  <h2 className="text-sm font-semibold">By week</h2>
                  <ul className="space-y-2">
                    {progress.weeks.map((w) => (
                      <li key={w.week} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Week {w.week}</span>
                          <span className="text-[var(--color-soft)]">
                            {w.completed}/{w.total}
                          </span>
                        </div>
                        <ProgressBar
                          percent={w.total ? Math.round((100 * w.completed) / w.total) : 0}
                          label={`Week ${w.week} progress`}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="classical-card space-y-2 p-4">
                  <h2 className="text-sm font-semibold">Recently completed</h2>
                  {recentlyCompleted(progress.lessons).length === 0 ? (
                    <p className="text-sm text-[var(--color-soft)]">No lessons completed yet.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {recentlyCompleted(progress.lessons).map((l) => (
                        <li key={l.day} className="flex justify-between gap-3">
                          <span className="truncate">
                            Day {l.day} · {l.title}
                          </span>
                          <span className="shrink-0 text-[var(--color-soft)]">{formatDate(l.completed_at)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                <button type="button" className="classical-btn w-full" onClick={startOver}>
                  Start a new plan
                </button>
              </div>
            ) : null}
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
