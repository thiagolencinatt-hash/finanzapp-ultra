import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUserPassword, getUserByEmail, registerUser } from "@/lib/auth/user-store";

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
    let authenticatedUser: { id: string; name: string; email: string; currency: string; salary: number } | null = null;
    let authSource = "local";

    // 1. Verificar primero en el almacén persistente local
    const localVerification = verifyUserPassword(normalizedEmail, password);
    if (localVerification.valid && localVerification.user) {
      authenticatedUser = {
        id: localVerification.user.id,
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
              id: data.user.id,
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
      if (existingUser) {
        return NextResponse.json(
          { error: "Contraseña incorrecta. Por favor verifica tus datos." },
          { status: 401 }
        );
      }

      // Si el usuario no existe aún y la contraseña tiene >= 6 caracteres, crearlo automáticamente para máxima comodidad
      if (password.length >= 6) {
        const reg = registerUser({
          email: normalizedEmail,
          password,
          name: normalizedEmail.split("@")[0],
          currency: "ARS",
          salary: 980000,
        });
        if (reg.success && reg.user) {
          authenticatedUser = {
            id: reg.user.id,
            name: reg.user.name,
            email: reg.user.email,
            currency: reg.user.currency,
            salary: reg.user.salary,
          };
          authSource = "local-auto-created";
        }
      } else {
        return NextResponse.json(
          { error: "La contraseña debe tener al menos 6 caracteres" },
          { status: 400 }
        );
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json(
        { error: "Error al iniciar sesión" },
        { status: 400 }
      );
    }

    // Asegurar que el cloud store esté inicializado
    try {
      const { getUserStore } = await import("@/lib/db/cloud-store");
      getUserStore(authenticatedUser.id, {
        email: authenticatedUser.email,
        name: authenticatedUser.name,
        currency: authenticatedUser.currency,
        salary: authenticatedUser.salary,
      });
    } catch (e) {
      console.warn("Could not pre-init user store in login:", e);
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
    // BORRAR explícitamente cualquier cookie de demo previa para que la cuenta tenga todas las funciones desbloqueadas
    response.cookies.set("finance_demo_session", "", {
      path: "/",
      maxAge: 0,
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
    response.cookies.set(
      "finance_user_email",
      encodeURIComponent(authenticatedUser.email),
      {
        path: "/",
        maxAge,
        sameSite: "lax",
      }
    );
    response.cookies.set(
      "finance_user_id",
      encodeURIComponent(authenticatedUser.id),
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
