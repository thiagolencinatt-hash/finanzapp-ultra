import { NextResponse } from "next/server";
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

    const result = await generateAndSendOtp({ email, name, currency, salary });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al procesar el código";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
