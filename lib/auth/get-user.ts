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

/**
 * Obtiene la identidad del usuario actual a partir de la solicitud:
 * 1. Supabase Auth (si está autenticado en la nube)
 * 2. Cookies de sesión de FinanzApp (`finance_user_id` o `finance_user_email`)
 * 3. Modo demo (`finance_demo_session=true`)
 * 4. Fallback seguro: usuario demo por defecto
 */
export async function getUserFromRequest(req: NextRequest): Promise<AuthenticatedUser> {
  const isDemoCookie = req.cookies.get("finance_demo_session")?.value === "true";
  const userIdCookie = req.cookies.get("finance_user_id")?.value;
  const userEmailCookie = req.cookies.get("finance_user_email")?.value;
  const userNameCookie = req.cookies.get("finance_user_name")?.value;
  const sessionCookie = req.cookies.get("finance_session")?.value;

  // 1. Si explícitamente está en modo demo
  if (isDemoCookie) {
    return {
      id: "demo-user",
      email: "demo@finanzapp.com",
      name: "Usuario Demo",
      currency: "ARS",
      salary: 980000,
      isDemo: true,
    };
  }

  // 2. Intentar obtener de Supabase Auth
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.id) {
      return {
        id: user.id,
        email: user.email || "usuario@finanzapp.com",
        name: (user.user_metadata?.name as string) || user.email?.split("@")[0] || "Usuario",
        currency: (user.user_metadata?.currency as string) || "ARS",
        salary: Number(user.user_metadata?.salary) || 980000,
        isDemo: false,
      };
    }
  } catch {
    // Supabase no disponible o sin sesión activa
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

  // 3. Usuario registrado mediante cookie de email o user ID
  if (userEmailCookie || userIdCookie) {
    const rawEmail = userEmailCookie ? safeDecode(userEmailCookie).toLowerCase().trim() : "";
    const name = userNameCookie ? safeDecode(userNameCookie) : (rawEmail.split("@")[0] || "Usuario");
    const rawUserId = userIdCookie ? safeDecode(userIdCookie).trim() : "";

    if (rawEmail) {
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

      // Si tiene cookie de email pero no está en user-store todavía
      const derivedId = rawUserId || `user_${rawEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
      return {
        id: derivedId,
        email: rawEmail,
        name,
        currency: "ARS",
        salary: 980000,
        isDemo: false,
      };
    }

    if (rawUserId) {
      return {
        id: rawUserId,
        email: "usuario@finanzapp.com",
        name: name || "Usuario",
        currency: "ARS",
        salary: 980000,
        isDemo: false,
      };
    }
  }

  // 4. Si hay sesión activa con nombre de usuario
  if (sessionCookie === "active" && userNameCookie) {
    const name = decodeURIComponent(userNameCookie).trim();
    if (name && name !== "Usuario Demo" && name !== "Thiago Demo") {
      const derivedId = `user_${name.toLowerCase().replace(/[^a-zA-Z0-9]/g, "_")}`;
      return {
        id: derivedId,
        email: `${derivedId}@finanzapp.com`,
        name,
        currency: "ARS",
        salary: 980000,
        isDemo: false,
      };
    }
  }

  // 5. Fallback por defecto: usuario demo
  return {
    id: "demo-user",
    email: "demo@finanzapp.com",
    name: "Usuario Demo",
    currency: "ARS",
    salary: 980000,
    isDemo: true,
  };
}
