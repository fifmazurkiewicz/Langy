import { describe, expect, it } from "vitest";
import { buildMultipleChoiceOptions } from "./multipleChoice";

const correct = { id: "correct", translation: "kot" };

describe("buildMultipleChoiceOptions", () => {
  it("returns the correct answer and three distinct vocabulary distractors", () => {
    const options = buildMultipleChoiceOptions(
      correct,
      [
        correct,
        { id: "duplicate", translation: " KOT " },
        { id: "one", translation: "pies" },
        { id: "two", translation: "dom" },
        { id: "three", translation: "książka" },
        { id: "four", translation: "woda" },
      ],
      () => 0,
    );

    expect(options).toHaveLength(4);
    expect(options.filter((option) => option.id === correct.id)).toHaveLength(1);
    expect(new Set(options.map((option) => option.translation.trim().toLowerCase())).size).toBe(4);
  });

  it("does not create a question without three valid distractors", () => {
    expect(
      buildMultipleChoiceOptions(correct, [correct, { id: "one", translation: "pies" }, { id: "two", translation: "dom" }]),
    ).toEqual([]);
  });
});
