import { describe, expect, it } from "vitest";

import { voiceDotFillClass } from "./voiceDotFill";

describe("voiceDotFillClass", () => {
  it("uses accent fill when on", () => {
    expect(voiceDotFillClass(true)).toContain("--color-accent");
  });

  it("uses dark/divider fill when off", () => {
    const off = voiceDotFillClass(false);
    expect(off).not.toContain("--color-accent");
    expect(off.includes("--color-divider") || off.includes("201f1d")).toBe(true);
  });
});
