import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (code && supabaseUrl && supabaseKey) {
    let response = NextResponse.redirect(new URL(next, request.url));

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.redirect(new URL(next, request.url));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      const maxAge = 60 * 60 * 24 * 30; // 30 días
      response.cookies.set("finance_session", "active", {
        path: "/",
        maxAge,
        sameSite: "lax",
      });
      response.cookies.set("finance_demo_session", "true", {
        path: "/",
        maxAge,
        sameSite: "lax",
      });
      const userName =
        data.user.user_metadata?.name ||
        data.user.email?.split("@")[0] ||
        "Usuario";
      response.cookies.set("finance_user_name", encodeURIComponent(userName), {
        path: "/",
        maxAge,
        sameSite: "lax",
      });
      return response;
    }
  }

  // Fallback: Redirigir a login si falló
  return NextResponse.redirect(new URL("/login", request.url));
}
