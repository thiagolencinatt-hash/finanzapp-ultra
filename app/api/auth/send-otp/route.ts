import { NextResponse } from "next/server";
import { generateAndSendOtp } from "@/lib/auth/otp-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, password, currency, salary } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Por favor ingresa un correo electrónico válido" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Generar código numérico de 6 dígitos y despachar correo exclusivamente por Resend
    const result = await generateAndSendOtp({
      email: normalizedEmail,
      name,
      password,
      currency,
      salary,
    });

    console.log(`✅ [Send-OTP API] Código de 6 dígitos procesado para: ${normalizedEmail}. Enviado real: ${result.emailSentReal}`);

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      emailSentReal: result.emailSentReal,
      provider: result.emailSentReal ? "resend" : "local-resilient",
      message: `¡Código de 6 dígitos enviado con éxito a ${normalizedEmail}!`,
      note: result.emailError ? `Detalle envío: ${result.emailError}` : undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al procesar el código OTP";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
