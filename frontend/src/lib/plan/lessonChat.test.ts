import { describe, expect, it } from "vitest";

import { lessonChatHref, readLessonHandoff } from "./lessonChat";

describe("lesson chat handoff", () => {
  it("round-trips lesson id and title through the chat link", () => {
    const href = lessonChatHref({ id: "abc-1", title: "Present Simple vs. Present Continuous & Work" });
    expect(href.startsWith("/chat?")).toBe(true);
    expect(readLessonHandoff(href.slice("/chat".length))).toEqual({
      id: "abc-1",
      title: "Present Simple vs. Present Continuous & Work",
    });
  });

  it("ignores links without a lesson", () => {
    expect(readLessonHandoff("")).toBeNull();
    expect(readLessonHandoff("?lessonTitle=x")).toBeNull();
  });

  it("falls back to a generic title", () => {
    expect(readLessonHandoff("?lesson=abc")).toEqual({ id: "abc", title: "Your lesson" });
  });
});
