import type { ChatLessonRef } from "@/lib/api/chat";

const LESSON_PARAM = "lesson";
const TITLE_PARAM = "lessonTitle";

/** Chat link that starts a session practising a plan lesson. The backend re-checks lesson ownership. */
export function lessonChatHref(lesson: ChatLessonRef): string {
  const params = new URLSearchParams({ [LESSON_PARAM]: lesson.id, [TITLE_PARAM]: lesson.title });
  return `/chat?${params.toString()}`;
}

export function readLessonHandoff(search: string): ChatLessonRef | null {
  const params = new URLSearchParams(search);
  const id = params.get(LESSON_PARAM)?.trim();
  if (!id) return null;
  return { id, title: params.get(TITLE_PARAM)?.trim() || "Your lesson" };
}
