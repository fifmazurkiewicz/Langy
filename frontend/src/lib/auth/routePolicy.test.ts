import { describe, expect, it } from "vitest";
import { CHAT_ROUTE, LOGIN_ROUTE, ONBOARDING_ROUTE, resolveRedirect } from "./routePolicy";

const PROTECTED = ["/chat", "/memo", "/menu", "/menu/languages", "/menu/profile", "/plan"];

describe("resolveRedirect", () => {
  it("never redirects while the session is still initializing", () => {
    for (const path of [...PROTECTED, "/", LOGIN_ROUTE, ONBOARDING_ROUTE]) {
      expect(resolveRedirect("initializing", path)).toBeNull();
    }
  });

  it("never redirects while the profile is unknown (API cold start)", () => {
    for (const path of [...PROTECTED, "/", LOGIN_ROUTE, ONBOARDING_ROUTE]) {
      expect(resolveRedirect("profile_unknown", path)).toBeNull();
    }
  });

  it("sends anonymous visitors to login from every protected route", () => {
    for (const path of [...PROTECTED, "/", ONBOARDING_ROUTE]) {
      expect(resolveRedirect("anonymous", path)).toBe(LOGIN_ROUTE);
    }
  });

  it("leaves anonymous visitors on the login page", () => {
    expect(resolveRedirect("anonymous", LOGIN_ROUTE)).toBeNull();
  });

  it("forces a user without onboarding into the wizard from every other route", () => {
    for (const path of [...PROTECTED, "/", LOGIN_ROUTE]) {
      expect(resolveRedirect("needs_onboarding", path)).toBe(ONBOARDING_ROUTE);
    }
  });

  it("leaves a user without onboarding on the wizard", () => {
    expect(resolveRedirect("needs_onboarding", ONBOARDING_ROUTE)).toBeNull();
  });

  it("moves an onboarded user off login, onboarding and root", () => {
    for (const path of [LOGIN_ROUTE, ONBOARDING_ROUTE, "/"]) {
      expect(resolveRedirect("ready", path)).toBe(CHAT_ROUTE);
    }
  });

  it("leaves an onboarded user on protected routes", () => {
    for (const path of PROTECTED) {
      expect(resolveRedirect("ready", path)).toBeNull();
    }
  });
});
