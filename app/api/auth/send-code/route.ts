import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateAndSendOtp } from "@/lib/auth/otp-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, currency, salary } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Por favor ingresa un correo electrónico válido" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const isSupabaseConfigured =
      supabaseUrl.length > 15 &&
      !supabaseUrl.includes("your-project") &&
      supabaseKey.length > 15;

    // 1. Siempre generar código de 6 dígitos en el almacén resiliente local (y enviar por SMTP/Resend si configurado)
    const localOtp = await generateAndSendOtp({
      email: normalizedEmail,
      name,
      currency,
      salary,
    });

    let supabaseSent = false;
    let supabaseError: string | null = null;

    if (isSupabaseConfigured) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const { error: otpErr } = await supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: `${appUrl}/auth/callback`,
            data: {
              name: name || normalizedEmail.split("@")[0],
              currency: currency || "ARS",
              salary: Number(salary) || 980000,
            },
          },
        });

        if (!otpErr) {
          supabaseSent = true;
          console.log(`✅ [Supabase Auth] Código OTP despachado a: ${normalizedEmail}`);
          return NextResponse.json({
            success: true,
            email: normalizedEmail,
            code: localOtp.code,
            emailSentReal: true,
            provider: "supabase",
            message: `¡Código de 6 dígitos enviado a ${normalizedEmail}!`,
          });
        } else {
          supabaseError = otpErr.message;
          console.warn(`⚠️ [Supabase Auth warning]: ${otpErr.message}`);
        }
      } catch (err: unknown) {
        supabaseError = err instanceof Error ? err.message : "Error conectando a Supabase";
      }
    }

    // Si Supabase falló o no está configurado, devolver el resultado local
    return NextResponse.json({
      ...localOtp,
      provider: "local-resilient",
      note: supabaseError ? `Supabase: ${supabaseError}` : undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al procesar el código";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
