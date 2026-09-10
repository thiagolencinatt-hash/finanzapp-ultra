import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyOtp } from "@/lib/auth/otp-store";
import { registerUser, getUserByEmail } from "@/lib/auth/user-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { error: "Correo y código son requeridos" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.trim();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const isSupabaseConfigured =
      supabaseUrl.length > 15 &&
      !supabaseUrl.includes("your-project") &&
      supabaseKey.length > 15;

    let verifiedUser: { name?: string; email: string; currency?: string; salary?: number } | null = null;
    let authSource = "local";

    // 1. Intentar verificar con Supabase Auth si está configurado
    if (isSupabaseConfigured) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        let { data, error: verifyErr } = await supabase.auth.verifyOtp({
          email: normalizedEmail,
          token: normalizedCode,
          type: "email",
        });

        // Si falló y era nuevo usuario, intentar también con type: "signup"
        if (verifyErr) {
          const resSignup = await supabase.auth.verifyOtp({
            email: normalizedEmail,
            token: normalizedCode,
            type: "signup",
          });
          if (!resSignup.error && resSignup.data.user) {
            data = resSignup.data;
            verifyErr = null;
          }
        }

        if (!verifyErr && data?.user) {
          authSource = "supabase";
          verifiedUser = {
            name: data.user.user_metadata?.name || normalizedEmail.split("@")[0],
            email: data.user.email || normalizedEmail,
            currency: data.user.user_metadata?.currency || "ARS",
            salary: data.user.user_metadata?.salary || 980000,
          };
          console.log(`✅ [Supabase Auth] Usuario autenticado con éxito: ${data.user.email}`);
        }
      } catch (err) {
        console.warn("Supabase verify attempt failed, trying fallback:", err);
      }
    }

    // 2. Si no se verificó con Supabase, verificar con el OTP local/fallback
    if (!verifiedUser) {
      const localVerification = verifyOtp(normalizedEmail, normalizedCode);
      if (!localVerification.valid) {
        return NextResponse.json(
          { error: localVerification.message || "Código incorrecto o expirado. Por favor verifica tus dígitos." },
          { status: 400 }
        );
      }
      const u = localVerification.user as { name: string; email: string; currency: string; salary: number; password?: string };
      verifiedUser = { name: u.name, email: u.email, currency: u.currency, salary: u.salary };

      // Si el usuario proporcionó una contraseña durante el registro, guardarla permanentemente
      if (u.password) {
        registerUser({
          email: u.email,
          password: u.password,
          name: u.name,
          currency: u.currency,
          salary: u.salary,
        });
      }
    }

    // Obtener o derivar ID de usuario
    let userId = "";
    const localUser = getUserByEmail(normalizedEmail);
    if (localUser) {
      userId = localUser.id;
    } else {
      userId = `user_${normalizedEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
    }

    // Inicializar almacén persistente en la nube
    try {
      const { getUserStore } = await import("@/lib/db/cloud-store");
      getUserStore(userId, {
        email: verifiedUser.email,
        name: verifiedUser.name,
        currency: verifiedUser.currency,
        salary: verifiedUser.salary,
      });
    } catch (e) {
      console.warn("Could not pre-init user store in verify-code:", e);
    }

    const response = NextResponse.json({
      success: true,
      message: "¡Código verificado con éxito!",
      user: { ...verifiedUser, id: userId },
      source: authSource,
    });

    // Guardar cookies de sesión activa
    const maxAge = 60 * 60 * 24 * 30; // 30 días
    response.cookies.set("finance_session", "active", {
      path: "/",
      maxAge,
      sameSite: "lax",
    });
    response.cookies.set("finance_demo_session", "", {
      path: "/",
      maxAge: 0,
      sameSite: "lax",
    });
    if (verifiedUser.name) {
      response.cookies.set("finance_user_name", encodeURIComponent(verifiedUser.name), {
        path: "/",
        maxAge,
        sameSite: "lax",
      });
    }
    response.cookies.set("finance_user_email", encodeURIComponent(verifiedUser.email), {
      path: "/",
      maxAge,
      sameSite: "lax",
    });
    response.cookies.set("finance_user_id", encodeURIComponent(userId), {
      path: "/",
      maxAge,
      sameSite: "lax",
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al verificar código";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
