import type { AuthStatus } from "@/components/AuthProvider";

export const LOGIN_ROUTE = "/login";
export const ONBOARDING_ROUTE = "/onboarding";
export const CHAT_ROUTE = "/chat";

/** Routes that exist only to hand the visitor over to the gate. */
const ENTRY_ROUTES = new Set<string>([LOGIN_ROUTE, ONBOARDING_ROUTE, "/"]);

/**
 * Single source of truth for "where does this visitor belong". Returns the path to redirect to,
 * or null when the current path is already correct.
 *
 * The unknown states (`initializing`, `profile_unknown`) deliberately return null: redirecting on
 * incomplete information is what previously bounced signed-in users to /login and let brand-new
 * users straight into /chat.
 */
export function resolveRedirect(status: AuthStatus, pathname: string): string | null {
  switch (status) {
    case "initializing":
    case "profile_unknown":
      return null;
    case "anonymous":
      return pathname === LOGIN_ROUTE ? null : LOGIN_ROUTE;
    case "needs_onboarding":
      return pathname === ONBOARDING_ROUTE ? null : ONBOARDING_ROUTE;
    case "ready":
      return ENTRY_ROUTES.has(pathname) ? CHAT_ROUTE : null;
  }
}
