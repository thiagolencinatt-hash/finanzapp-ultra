import { NextResponse } from "next/server";
import { setPasswordForUser, getUserByEmail } from "@/lib/auth/user-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { email, password, newPassword } = body;
    const finalPassword = password || newPassword;

    if (!finalPassword || finalPassword.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe contener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    // Si el correo no vino explícito en el body, resolverlo de las cookies de sesión activa
    if (!email) {
      const cookieHeader = request.headers.get("cookie") || "";
      const emailMatch = cookieHeader.match(/finance_user_email=([^;]+)/);
      if (emailMatch && emailMatch[1]) {
        try {
          email = decodeURIComponent(emailMatch[1]);
        } catch {
          email = emailMatch[1];
        }
      }
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "No se pudo identificar la cuenta del usuario para cambiar la contraseña" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Actualizar en el almacén local persistente
    const res = setPasswordForUser(normalizedEmail, finalPassword);
    if (!res.success) {
      return NextResponse.json({ error: res.error || "Error al actualizar contraseña" }, { status: 400 });
    }

    // 2. Si hay sesión Supabase en servidor, intentar actualizar Supabase Auth
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const { error: supaErr } = await supabase.auth.updateUser({ password: finalPassword });
      if (!supaErr) {
        console.log(`✅ [Supabase Auth] Contraseña actualizada para usuario en sesión`);
      }
    } catch {
      // ignore
    }

    return NextResponse.json({
      success: true,
      message: "¡Contraseña actualizada con éxito! Ya puedes iniciar sesión con tu nueva clave.",
      user: {
        name: res.user?.name,
        email: res.user?.email,
        currency: res.user?.currency,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al actualizar la contraseña";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
