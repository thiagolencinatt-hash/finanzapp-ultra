import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyOtp } from "@/lib/auth/otp-store";

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
      verifiedUser = localVerification.user as { name: string; email: string; currency: string; salary: number };
    }

    const response = NextResponse.json({
      success: true,
      message: "¡Código verificado con éxito!",
      user: verifiedUser,
      source: authSource,
    });

    // Guardar cookies de sesión activa
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
    if (verifiedUser.name) {
      response.cookies.set("finance_user_name", encodeURIComponent(verifiedUser.name), {
        path: "/",
        maxAge,
        sameSite: "lax",
      });
    }

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al verificar código";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
