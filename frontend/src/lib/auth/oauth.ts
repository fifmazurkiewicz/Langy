/** True while Supabase is still exchanging the OAuth PKCE code in the URL. */
export function hasPendingOAuthRedirect(): boolean {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  return url.searchParams.has("code") || url.hash.includes("access_token=");
}
