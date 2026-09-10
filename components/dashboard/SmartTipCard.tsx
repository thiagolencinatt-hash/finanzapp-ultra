"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Lock } from "lucide-react";
import { isDemoUser } from "@/lib/freemium";

interface SmartTipCardProps {
  income30d: number;
  expense30d: number;
  installmentsMonthly: number;
  topCategory?: string;
  goalsCount: number;
}

// Tips predefinidos inteligentes basados en datos reales
function generateLocalTip(props: SmartTipCardProps): { emoji: string; title: string; body: string; type: "success" | "warning" | "info" } {
  const { income30d, expense30d, installmentsMonthly, topCategory, goalsCount } = props;
  const netFlow = income30d - expense30d;
  const expenseRatio = income30d > 0 ? (expense30d / income30d) * 100 : 0;
  const debtRatio = income30d > 0 ? (installmentsMonthly / income30d) * 100 : 0;

  // Estado Inicial / En Limpio (Todo en $0)
  if (income30d === 0 && expense30d === 0) {
    return {
      emoji: "🚀",
      title: "Comenzando tu control financiero en limpio",
      body: "Tu cuenta está lista sin datos residuales. Registrá tu primer ingreso o tu saldo real para que el Asistente IA empiece a darte diagnósticos y recomendaciones personalizadas.",
      type: "info",
    };
  }

  // Situación crítica
  if (netFlow < 0) {
    return {
      emoji: "⚠️",
      title: "Estás gastando más de lo que ingresás",
      body: `Este mes tu flujo es negativo: -$${Math.abs(netFlow).toLocaleString("es-AR")}. Revisá tus gastos en "${topCategory || "la categoría principal"}" y buscá recortar al menos un 15%.`,
      type: "warning",
    };
  }

  // Gastos muy altos (>80% del ingreso)
  if (expenseRatio > 80) {
    return {
      emoji: "🔴",
      title: "Tus gastos están al límite",
      body: `Estás usando el ${Math.round(expenseRatio)}% de tus ingresos en gastos. La regla de oro es no superar el 50%. Intentá reducir gastos opcionales.`,
      type: "warning",
    };
  }

  // Deuda alta en cuotas (>30% del ingreso)
  if (debtRatio > 30) {
    return {
      emoji: "💳",
      title: "Ojo con las cuotas",
      body: `Tus compromisos en cuotas representan el ${Math.round(debtRatio)}% de tus ingresos. Evitá nuevas compras en cuotas hasta bajar del 25%.`,
      type: "warning",
    };
  }

  // Sin metas de ahorro
  if (goalsCount === 0) {
    return {
      emoji: "🎯",
      title: "Creá tu primera meta de ahorro",
      body: `Ahorrando apenas $${Math.round(netFlow * 0.2).toLocaleString("es-AR")}/mes (20% de tu excedente) en 6 meses tendrías $${Math.round(netFlow * 0.2 * 6).toLocaleString("es-AR")} extra.`,
      type: "info",
    };
  }

  // Todo bien
  if (expenseRatio < 50) {
    return {
      emoji: "🎉",
      title: "¡Vas muy bien!",
      body: `Solo usás el ${Math.round(expenseRatio)}% de tus ingresos en gastos. Seguí así y tu fondo de emergencia crecerá rápido.`,
      type: "success",
    };
  }

  // Tip genérico educativo
  const tips = [
    {
      emoji: "💡",
      title: "Regla 50/30/20",
      body: "Destiná 50% a necesidades, 30% a gustos y 20% a ahorro. Es la base de una finanza personal sana.",
      type: "info" as const,
    },
    {
      emoji: "🧊",
      title: "El truco de las 48 horas",
      body: "Antes de una compra no esencial, esperá 48 horas. Si después de 2 días seguís necesitándolo, compralo.",
      type: "info" as const,
    },
    {
      emoji: "📊",
      title: "Revisá tus suscripciones",
      body: "Muchos pagan servicios que no usan. Revisá tus débitos automáticos y cancelá lo que no uses.",
      type: "info" as const,
    },
  ];
  return tips[Math.floor(Math.random() * tips.length)];
}

export function SmartTipCard(props: SmartTipCardProps) {
  const router = useRouter();
  const [tip, setTip] = useState<ReturnType<typeof generateLocalTip> | null>(null);
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    setTip(generateLocalTip(props));
    setIsDemo(isDemoUser());
  }, [props.income30d, props.expense30d, props.installmentsMonthly]);

  async function fetchAiTip() {
    if (isDemo) {
      router.push("/login?tab=register");
      return;
    }
    setLoadingAi(true);
    try {
      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Dame UN consejo financiero corto (máximo 2 oraciones) personalizado basándote en mis datos actuales. Sé directo y específico, no genérico.`,
          session_id: "tip",
        }),
      });
      const data = await res.json();
      if (data.message) setAiTip(data.message);
    } catch {
      // Fallback silencioso
    } finally {
      setLoadingAi(false);
    }
  }

  if (!tip) return null;

  const borderColor =
    tip.type === "warning" ? "hsl(var(--expense) / 0.4)" :
    tip.type === "success" ? "hsl(var(--income) / 0.4)" :
    "hsl(var(--primary) / 0.4)";

  const bgGradient =
    tip.type === "warning" ? "linear-gradient(135deg, hsl(var(--expense) / 0.08), transparent)" :
    tip.type === "success" ? "linear-gradient(135deg, hsl(var(--income) / 0.08), transparent)" :
    "linear-gradient(135deg, hsl(var(--primary) / 0.08), transparent)";

  return (
    <div
      className="rounded-2xl p-4 transition-all duration-300"
      style={{
        background: bgGradient,
        border: `1px solid ${borderColor}`,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0 mt-0.5">{tip.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>
              {tip.title}
            </h3>
            <button
              onClick={fetchAiTip}
              disabled={loadingAi}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all hover:bg-white/10 cursor-pointer"
              style={{ color: "hsl(var(--primary))" }}
              title={isDemo ? "Creá tu cuenta para tips personalizados con IA" : "Pedir consejo personalizado con IA"}
            >
              {loadingAi ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : isDemo ? (
                <Lock className="w-3 h-3" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              <span>{isDemo ? "Crear Cuenta" : "IA Tip"}</span>
            </button>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>
            {aiTip || tip.body}
          </p>
        </div>
      </div>
    </div>
  );
}
