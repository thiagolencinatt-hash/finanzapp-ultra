import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/auth/user-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Correo requerido" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const storedUser = getUserByEmail(normalizedEmail);

    if (!storedUser) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    }

    const authenticatedUser = {
      id: storedUser.id,
      name: storedUser.name,
      email: storedUser.email,
      currency: storedUser.currency,
      salary: storedUser.salary,
    };

    // Pre-inicializar almacén persistente
    try {
      const { getUserStore } = await import("@/lib/db/cloud-store");
      await getUserStore(authenticatedUser.id, {
        email: authenticatedUser.email,
        name: authenticatedUser.name,
        currency: authenticatedUser.currency,
        salary: authenticatedUser.salary,
      });
    } catch (e) {
      console.warn("Could not pre-init user store in quick-login:", e);
    }

    const response = NextResponse.json({
      success: true,
      message: `¡Bienvenido ${authenticatedUser.name}! Sesión iniciada.`,
      user: authenticatedUser,
    });

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
    response.cookies.set("finance_user_name", encodeURIComponent(authenticatedUser.name), {
      path: "/",
      maxAge,
      sameSite: "lax",
    });
    response.cookies.set("finance_user_email", encodeURIComponent(authenticatedUser.email), {
      path: "/",
      maxAge,
      sameSite: "lax",
    });
    response.cookies.set("finance_user_id", encodeURIComponent(authenticatedUser.id), {
      path: "/",
      maxAge,
      sameSite: "lax",
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al iniciar sesión rápida";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
