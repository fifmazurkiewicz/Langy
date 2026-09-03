import { describe, expect, it, vi } from "vitest";

import { withMicSuspended } from "./withMicSuspended";

describe("withMicSuspended", () => {
  it("runs work without suspending when listening is off", async () => {
    const setSuspended = vi.fn();
    const work = vi.fn(async () => "ok");
    await expect(withMicSuspended(false, setSuspended, work)).resolves.toBe("ok");
    expect(setSuspended).not.toHaveBeenCalled();
  });

  it("sets suspended true then false around work when listening is on", async () => {
    const order: string[] = [];
    const setSuspended = vi.fn((v: boolean) => {
      order.push(`suspend:${v}`);
    });
    const work = vi.fn(async () => {
      order.push("work");
      return 42;
    });
    await expect(withMicSuspended(true, setSuspended, work)).resolves.toBe(42);
    expect(order).toEqual(["suspend:true", "work", "suspend:false"]);
  });

  it("clears suspend even when work throws", async () => {
    const setSuspended = vi.fn();
    await expect(
      withMicSuspended(true, setSuspended, async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");
    expect(setSuspended).toHaveBeenCalledWith(true);
    expect(setSuspended).toHaveBeenCalledWith(false);
  });
});
