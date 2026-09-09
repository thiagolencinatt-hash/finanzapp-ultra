import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUserPassword, getUserByEmail } from "@/lib/auth/user-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Por favor ingresa tu correo y contraseña" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    let authenticatedUser: { name: string; email: string; currency: string; salary: number } | null = null;
    let authSource = "local";

    // 1. Verificar primero en el almacén persistente local
    const localVerification = verifyUserPassword(normalizedEmail, password);
    if (localVerification.valid && localVerification.user) {
      authenticatedUser = {
        name: localVerification.user.name,
        email: localVerification.user.email,
        currency: localVerification.user.currency,
        salary: localVerification.user.salary,
      };
      authSource = "local";
    }

    // 2. Si no se autenticó localmente, intentar con Supabase si está disponible
    if (!authenticatedUser) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      const isSupabaseConfigured =
        supabaseUrl.length > 15 &&
        !supabaseUrl.includes("your-project") &&
        supabaseKey.length > 15;

      if (isSupabaseConfigured) {
        try {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { data, error: supaErr } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });

          if (!supaErr && data.user) {
            authSource = "supabase";
            authenticatedUser = {
              name: data.user.user_metadata?.name || normalizedEmail.split("@")[0],
              email: data.user.email || normalizedEmail,
              currency: data.user.user_metadata?.currency || "ARS",
              salary: data.user.user_metadata?.salary || 980000,
            };
          }
        } catch {
          // ignore
        }
      }
    }

    if (!authenticatedUser) {
      const existingUser = getUserByEmail(normalizedEmail);
      if (existingUser && !existingUser.passwordHash) {
        return NextResponse.json(
          {
            error:
              "Esta cuenta fue creada por código de verificación y no tiene contraseña aún. Puedes ingresar con código OTP o crear una contraseña.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Correo o contraseña incorrectos. Verifica tus datos." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "¡Sesión iniciada con éxito!",
      user: authenticatedUser,
      source: authSource,
    });

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
    response.cookies.set(
      "finance_user_name",
      encodeURIComponent(authenticatedUser.name),
      {
        path: "/",
        maxAge,
        sameSite: "lax",
      }
    );

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al iniciar sesión";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
