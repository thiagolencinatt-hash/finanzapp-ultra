import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { registerUser, getUserByEmail } from "@/lib/auth/user-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, currency = "ARS", salary = 980000 } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Por favor ingresa un correo electrónico válido" },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userName = (name || normalizedEmail.split("@")[0]).trim();

    // 1. Registrar usuario en almacén local persistente
    const regResult = registerUser({
      email: normalizedEmail,
      password,
      name: userName,
      currency,
      salary: Number(salary) || 980000,
    });

    if (!regResult.success || !regResult.user) {
      return NextResponse.json(
        { error: regResult.error || "No se pudo registrar la cuenta" },
        { status: 400 }
      );
    }

    // 2. Intentar registrar en Supabase en segundo plano si está disponible
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    if (supabaseUrl.length > 15 && supabaseKey.length > 15 && !supabaseUrl.includes("your-project")) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              name: userName,
              currency,
              salary: Number(salary) || 980000,
            },
          },
        });
      } catch (e) {
        console.warn("⚠️ [Supabase SignUp silent fallback]:", e);
      }
    }

    // 3. Inicializar almacén persistente en la nube para este usuario
    try {
      const { getUserStore } = await import("@/lib/db/cloud-store");
      getUserStore(regResult.user.id, {
        email: regResult.user.email,
        name: regResult.user.name,
        currency: regResult.user.currency,
        salary: regResult.user.salary,
      });
    } catch (e) {
      console.warn("Could not pre-init user store:", e);
    }

    const authenticatedUser = {
      id: regResult.user.id,
      name: regResult.user.name,
      email: regResult.user.email,
      currency: regResult.user.currency,
      salary: regResult.user.salary,
    };

    const response = NextResponse.json({
      success: true,
      message: "¡Cuenta creada con éxito!",
      user: authenticatedUser,
    });

    const maxAge = 60 * 60 * 24 * 30; // 30 días
    response.cookies.set("finance_session", "active", {
      path: "/",
      maxAge,
      sameSite: "lax",
    });
    // BORRAR explícitamente cualquier cookie de demo previa
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
    const message = error instanceof Error ? error.message : "Error al registrar cuenta";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
