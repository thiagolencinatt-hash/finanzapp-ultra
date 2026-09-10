// ============================================================
// FinanzApp Ultra — Sistema Freemium
// Define qué puede hacer un usuario demo vs un usuario con cuenta
// ============================================================

// Límites para usuarios demo (sin cuenta)
export const DEMO_LIMITS = {
  MAX_TRANSACTIONS: 5,
  MAX_AI_MESSAGES: 3,
  MAX_GOALS: 0,        // No puede crear metas
  MAX_INSTALLMENTS: 0, // No puede crear cuotas
} as const;

// Todas las acciones premium que requieren cuenta
export type FreemiumAction =
  | "add_transaction"
  | "edit_transaction"
  | "delete_transaction"
  | "use_ai_chat"
  | "manage_goals"
  | "manage_installments"
  | "view_history"
  | "export_data"
  | "manage_budgets"
  | "manage_subscriptions"
  | "adjust_amounts"
  | "set_urgency";

// Mensajes amigables para cada bloqueo
const GATE_MESSAGES: Record<FreemiumAction, { title: string; description: string }> = {
  add_transaction: {
    title: "Límite de transacciones alcanzado",
    description: "Creá tu cuenta gratis para registrar transacciones ilimitadas y que tus datos se guarden para siempre.",
  },
  edit_transaction: {
    title: "Editar transacciones",
    description: "Creá tu cuenta gratis para editar y organizar tus gastos sin límites.",
  },
  delete_transaction: {
    title: "Eliminar transacciones",
    description: "Creá tu cuenta gratis para gestionar tus transacciones libremente.",
  },
  use_ai_chat: {
    title: "Coach IA ilimitado",
    description: "Creá tu cuenta gratis para chatear sin límite con tu coach financiero personal.",
  },
  manage_goals: {
    title: "Metas de Ahorro",
    description: "Creá tu cuenta gratis para crear y seguir tus metas de ahorro personales.",
  },
  manage_installments: {
    title: "Gestión de Cuotas",
    description: "Creá tu cuenta gratis para gestionar tus cuotas, pagos y compras financiadas.",
  },
  view_history: {
    title: "Historial Completo",
    description: "Creá tu cuenta gratis para ver tu historial detallado con filtros y comparaciones.",
  },
  export_data: {
    title: "Exportar a Excel",
    description: "Creá tu cuenta gratis para exportar tus datos y llevar un registro profesional.",
  },
  manage_budgets: {
    title: "Presupuestos Mensuales",
    description: "Creá tu cuenta gratis para crear presupuestos y controlar cuánto gastás por categoría.",
  },
  manage_subscriptions: {
    title: "Suscripciones y Recurrentes",
    description: "Creá tu cuenta gratis para trackear Netflix, Spotify y todos tus gastos fijos.",
  },
  adjust_amounts: {
    title: "Ajustar Montos",
    description: "Creá tu cuenta gratis para personalizar tus saldos, sueldo y configuración financiera.",
  },
  set_urgency: {
    title: "Categorizar Urgencia",
    description: "Creá tu cuenta gratis para marcar gastos como esenciales, importantes u opcionales.",
  },
};

/**
 * Verifica si el usuario actual está en modo demo (sin cuenta real).
 * Lee la cookie `finance_demo_session` para determinar el estado.
 */
export function isDemoUser(): boolean {
  if (typeof document === "undefined") return false;
  const cookies = document.cookie;
  const hasSession = cookies.includes("finance_session=active");
  const isDemo = cookies.includes("finance_demo_session=true");
  // Es demo si tiene sesión activa Y la cookie de demo
  // En futuro: verificar contra Supabase auth state
  return hasSession && isDemo;
}

/**
 * Obtiene la cantidad de transacciones creadas por el usuario demo.
 */
export function getDemoTxCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    return parseInt(localStorage.getItem("finanzapp_demo_tx_count") || "0", 10);
  } catch {
    return 0;
  }
}

/**
 * Incrementa el contador de transacciones creadas en demo.
 */
export function incrementDemoTxCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const next = getDemoTxCount() + 1;
    localStorage.setItem("finanzapp_demo_tx_count", String(next));
    return next;
  } catch {
    return 0;
  }
}

/**
 * Resetea el contador de transacciones creadas en demo.
 */
export function resetDemoTxCount(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("finanzapp_demo_tx_count");
  } catch {}
}

/**
 * Verifica si una acción freemium está permitida para el usuario actual.
 * Devuelve { allowed, reason, gateInfo } para que los componentes tomen decisiones.
 */
export function canPerformAction(
  action: FreemiumAction,
  context?: { currentCount?: number }
): {
  allowed: boolean;
  reason?: string;
  gateInfo?: { title: string; description: string };
} {
  // Si NO es demo, todo permitido
  if (!isDemoUser()) {
    return { allowed: true };
  }

  const gateInfo = GATE_MESSAGES[action];

  switch (action) {
    case "add_transaction": {
      const count = context?.currentCount ?? getDemoTxCount();
      if (count >= DEMO_LIMITS.MAX_TRANSACTIONS) {
        return { allowed: false, reason: `Máximo ${DEMO_LIMITS.MAX_TRANSACTIONS} transacciones en modo demo`, gateInfo };
      }
      return { allowed: true };
    }

    case "edit_transaction":
    case "delete_transaction":
      // Permitimos editar/borrar en demo para no frustrar
      return { allowed: true };

    case "use_ai_chat": {
      const count = context?.currentCount ?? 0;
      if (count >= DEMO_LIMITS.MAX_AI_MESSAGES) {
        return { allowed: false, reason: `Máximo ${DEMO_LIMITS.MAX_AI_MESSAGES} mensajes IA en modo demo`, gateInfo };
      }
      return { allowed: true };
    }

    // Todo lo demás está bloqueado en demo
    case "manage_goals":
    case "manage_installments":
    case "view_history":
    case "export_data":
    case "manage_budgets":
    case "manage_subscriptions":
    case "adjust_amounts":
    case "set_urgency":
      return { allowed: false, reason: gateInfo.description, gateInfo };

    default:
      return { allowed: true };
  }
}

/**
 * Obtiene la info del gate para un action específico.
 */
export function getGateInfo(action: FreemiumAction) {
  return GATE_MESSAGES[action];
}
