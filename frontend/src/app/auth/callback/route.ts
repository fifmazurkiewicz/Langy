import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { NextResponse } from "next/server";

/**
 * OAuth PKCE callback — exchanges ?code= for a session using the verifier cookie
 * set when signInWithOAuth started. Client-side exchange on `/` was returning 401.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") ? next : "/";

  if (!code) {
    return NextResponse.redirect(`${requestUrl.origin}/login?error=oauth`);
  }

  const supabaseResponse = NextResponse.redirect(`${requestUrl.origin}${safeNext}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get("Cookie") ?? "");
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("OAuth callback:", error.message);
    return NextResponse.redirect(`${requestUrl.origin}/login?error=oauth`);
  }

  return supabaseResponse;
}
