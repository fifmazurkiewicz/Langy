import { describe, expect, it } from "vitest";

import { makeCreatedCategory } from "./categories";

describe("makeCreatedCategory", () => {
  it("creates an immediately renderable custom category", () => {
    expect(makeCreatedCategory({ id: "c1", category_key: "travel" })).toEqual({
      id: "c1",
      category_key: "travel",
      accepted_count: 0,
      due_count: 0,
      is_custom: true,
    });
  });
});
