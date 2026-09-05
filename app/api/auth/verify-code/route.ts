import { NextResponse } from "next/server";
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

    const verification = verifyOtp(email, code);

    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.message },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Código verificado con éxito",
      user: verification.user,
    });

    // Guardar cookies seguras de sesión activa
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
    if (verification.user?.name) {
      response.cookies.set("finance_user_name", encodeURIComponent(verification.user.name), {
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
