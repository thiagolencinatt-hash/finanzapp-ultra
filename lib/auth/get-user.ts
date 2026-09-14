import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserByEmail } from "@/lib/auth/user-store";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  currency: string;
  salary: number;
  isDemo: boolean;
}

function safeDecode(val: string): string {
  try {
    let decoded = decodeURIComponent(val);
    if (decoded.includes("%")) {
      try {
        decoded = decodeURIComponent(decoded);
      } catch {
        // ignore
      }
    }
    return decoded;
  } catch {
    return val;
  }
}

/**
 * Resuelve la identidad del usuario en orden de prioridad:
 * 1. Supabase Auth Oficial (Sesión de token en cookies / SSR) -> Sincronización en la Nube
 * 2. Cookie de usuario registrado (Fallback local / offline)
 * 3. Modo demo explícito
 */
export async function getUserFromRequest(req: NextRequest): Promise<AuthenticatedUser> {
  // 1. Prioridad Suprema: Supabase Auth
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && user.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, salary, currency, pay_day")
        .eq("id", user.id)
        .maybeSingle();

      return {
        id: user.id,
        email: user.email || "usuario@finanzapp.com",
        name:
          profile?.name ||
          (user.user_metadata?.name as string) ||
          user.email?.split("@")[0] ||
          "Usuario",
        currency: profile?.currency || (user.user_metadata?.currency as string) || "ARS",
        salary: Number(profile?.salary) || Number(user.user_metadata?.salary) || 800000,
        isDemo: false,
      };
    }
  } catch (err) {
    // Supabase no configurado o sin conexión momentánea
  }

  // 2. Fallback de cookies locales para compatibilidad
  const isDemoCookie = req.cookies.get("finance_demo_session")?.value === "true";
  const userIdCookie = req.cookies.get("finance_user_id")?.value;
  const userEmailCookie = req.cookies.get("finance_user_email")?.value;
  const userNameCookie = req.cookies.get("finance_user_name")?.value;

  const rawEmail = userEmailCookie ? safeDecode(userEmailCookie).toLowerCase().trim() : "";
  const isRealEmail = rawEmail && rawEmail.includes("@") && !rawEmail.includes("demo@");

  if (isRealEmail) {
    const name = userNameCookie ? safeDecode(userNameCookie) : (rawEmail.split("@")[0] || "Usuario");
    const storedUser = getUserByEmail(rawEmail);
    if (storedUser) {
      return {
        id: storedUser.id,
        email: storedUser.email,
        name: storedUser.name,
        currency: storedUser.currency,
        salary: storedUser.salary,
        isDemo: false,
      };
    }

    const rawUserId = userIdCookie ? safeDecode(userIdCookie).trim() : "";
    const derivedId = rawUserId || `user_${rawEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
    return {
      id: derivedId,
      email: rawEmail,
      name,
      currency: "ARS",
      salary: 800000,
      isDemo: false,
    };
  }

  // 3. Modo demo
  if (isDemoCookie && !isRealEmail) {
    return {
      id: "demo-user",
      email: "demo@finanzapp.com",
      name: "Usuario Demo",
      currency: "ARS",
      salary: 980000,
      isDemo: true,
    };
  }

  // 4. Default demo fallback
  return {
    id: "demo-user",
    email: "demo@finanzapp.com",
    name: "Usuario Demo",
    currency: "ARS",
    salary: 980000,
    isDemo: true,
  };
}
