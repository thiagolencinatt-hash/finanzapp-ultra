import { NextResponse } from "next/server";
import { setPasswordForUser } from "@/lib/auth/user-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Correo y nueva contraseña requeridos" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe contener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const res = setPasswordForUser(email, password);
    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "¡Contraseña establecida con éxito! Ahora puedes iniciar sesión con ella.",
      user: {
        name: res.user?.name,
        email: res.user?.email,
        currency: res.user?.currency,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al fijar contraseña";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
