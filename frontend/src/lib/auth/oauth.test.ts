import { afterEach, describe, expect, it, vi } from "vitest";
import { hasPendingOAuthRedirect } from "./oauth";

function mockLocation(href: string) {
  vi.stubGlobal("window", { location: { href } });
}

describe("hasPendingOAuthRedirect", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects PKCE code in query string", () => {
    mockLocation("https://langy.fmazurkiewicz.dev/?code=abc123");
    expect(hasPendingOAuthRedirect()).toBe(true);
  });

  it("detects implicit access_token in hash", () => {
    mockLocation("https://langy.fmazurkiewicz.dev/#access_token=xyz");
    expect(hasPendingOAuthRedirect()).toBe(true);
  });

  it("returns false on a normal route", () => {
    mockLocation("https://langy.fmazurkiewicz.dev/chat");
    expect(hasPendingOAuthRedirect()).toBe(false);
  });
});
