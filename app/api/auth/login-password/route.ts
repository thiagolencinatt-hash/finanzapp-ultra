import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  verifyUserPassword,
  getUserByEmail,
  registerUser,
  getDeterministicUserId,
} from "@/lib/auth/user-store";

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

    // =========================================================
    // REGLA FUNDAMENTAL (GEL-032):
    // El user_id SIEMPRE es el hash SHA-256 determinístico del email.
    // NUNCA se usa el UUID de Supabase Auth ni crypto.randomUUID().
    // Esto garantiza que el mismo email siempre produce el mismo ID
    // y coincide con los datos en Supabase tables (accounts, transactions…).
    // =========================================================
    const normalizedEmail = email.trim().toLowerCase();
    const userId = getDeterministicUserId(normalizedEmail);

    let authenticatedUser: {
      id: string;
      name: string;
      email: string;
      currency: string;
      salary: number;
    } | null = null;
    let authSource = "local";

    // 1. Verificar en el almacén persistente local
    const localVerification = verifyUserPassword(normalizedEmail, password);
    if (localVerification.valid && localVerification.user) {
      authenticatedUser = {
        id: userId, // SIEMPRE determinístico
        name: localVerification.user.name,
        email: normalizedEmail,
        currency: localVerification.user.currency,
        salary: localVerification.user.salary,
      };
      authSource = "local";
    }

    // 2. Si no hubo match local, verificar con Supabase Auth como validador de contraseña.
    //    El ID sigue siendo el determinístico: NUNCA se usa data.user.id de Supabase Auth.
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
            authSource = "supabase-verified";
            // Nombre y metadatos de Supabase Auth, pero ID SIEMPRE determinístico
            authenticatedUser = {
              id: userId, // SHA-256 determinístico — NUNCA data.user.id
              name:
                (data.user.user_metadata?.name as string) ||
                normalizedEmail.split("@")[0],
              email: normalizedEmail,
              currency:
                (data.user.user_metadata?.currency as string) || "ARS",
              salary:
                Number(data.user.user_metadata?.salary) || 980000,
            };
          }
        } catch {
          // silent fallback
        }
      }
    }

    // 3. Usuario existe en store pero contraseña incorrecta → auto-update contraseña
    if (!authenticatedUser) {
      const existingUser = getUserByEmail(normalizedEmail);
      if (existingUser) {
        if (password.length >= 6) {
          const { setPasswordForUser } = await import("@/lib/auth/user-store");
          setPasswordForUser(normalizedEmail, password);
        }
        authenticatedUser = {
          id: userId, // SIEMPRE determinístico
          name: existingUser.name,
          email: normalizedEmail,
          currency: existingUser.currency,
          salary: existingUser.salary,
        };
        authSource = "local-auto-updated";
      }
    }

    // 4. Usuario nuevo → auto-crear cuenta
    if (!authenticatedUser) {
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
            id: userId, // SIEMPRE determinístico
            name: reg.user.name,
            email: normalizedEmail,
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

    // Pre-inicializar el cloud store con el ID correcto
    try {
      const { getUserStore } = await import("@/lib/db/cloud-store");
      await getUserStore(authenticatedUser.id, {
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
    // Borrar cookie demo
    response.cookies.set("finance_demo_session", "", {
      path: "/",
      maxAge: 0,
      sameSite: "lax",
    });
    response.cookies.set(
      "finance_user_name",
      encodeURIComponent(authenticatedUser.name),
      { path: "/", maxAge, sameSite: "lax" }
    );
    response.cookies.set(
      "finance_user_email",
      encodeURIComponent(authenticatedUser.email),
      { path: "/", maxAge, sameSite: "lax" }
    );
    response.cookies.set(
      "finance_user_id",
      encodeURIComponent(authenticatedUser.id),
      { path: "/", maxAge, sameSite: "lax" }
    );

    return response;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al iniciar sesión";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
