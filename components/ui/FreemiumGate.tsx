// ============================================================
// FinanzApp Ultra — FreemiumGate Component
// Envuelve contenido premium: si el usuario demo no tiene acceso,
// muestra un overlay con blur, candado y CTA para crear cuenta.
// ============================================================
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Sparkles, ArrowRight, X } from "lucide-react";
import { canPerformAction, isDemoUser, type FreemiumAction, getGateInfo } from "@/lib/freemium";

interface FreemiumGateProps {
  /** La acción que se intenta proteger */
  action: FreemiumAction;
  /** Contexto opcional (por ejemplo, currentCount para transacciones) */
  context?: { currentCount?: number };
  /** El contenido que se muestra si está permitido o con overlay si no */
  children: React.ReactNode;
  /** Si true, no muestra el contenido detrás del blur (lo oculta completamente) */
  hideContent?: boolean;
  /** Clase CSS extra para el wrapper */
  className?: string;
}

/**
 * FreemiumGate: componente wrapper que protege features premium.
 *
 * - Si el usuario tiene cuenta: renderiza children normalmente.
 * - Si el usuario es demo y la acción está bloqueada: renderiza children
 *   con un overlay blur + candado + CTA "Creá tu cuenta gratis".
 */
export function FreemiumGate({
  action,
  context,
  children,
  hideContent = false,
  className = "",
}: FreemiumGateProps) {
  const router = useRouter();
  const [isBlocked, setIsBlocked] = useState(false);
  const [gateInfo, setGateInfo] = useState<{ title: string; description: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const result = canPerformAction(action, context);
    setIsBlocked(!result.allowed);
    if (!result.allowed) {
      setGateInfo(result.gateInfo || getGateInfo(action));
    }
  }, [action, context]);

  // SSR: no bloquear hasta montar
  if (!mounted) {
    return <div className={className}>{children}</div>;
  }

  // No bloqueado: renderizar normalmente
  if (!isBlocked) {
    return <div className={className}>{children}</div>;
  }

  // Bloqueado: mostrar overlay
  return (
    <div className={`relative ${className}`}>
      {/* Contenido detrás (difuminado o oculto) */}
      {!hideContent && (
        <div className="pointer-events-none select-none" style={{ filter: "blur(6px)", opacity: 0.4 }}>
          {children}
        </div>
      )}

      {/* Overlay con CTA */}
      <div
        className={`${hideContent ? "" : "absolute inset-0"} flex flex-col items-center justify-center gap-4 p-6 rounded-2xl z-10`}
        style={{
          background: hideContent ? "transparent" : "hsl(var(--card) / 0.85)",
          backdropFilter: hideContent ? "none" : "blur(8px)",
          minHeight: hideContent ? "200px" : undefined,
        }}
      >
        {/* Ícono candado animado */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center border shadow-lg"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))",
            borderColor: "hsl(var(--primary) / 0.3)",
          }}
        >
          <Lock className="w-6 h-6" style={{ color: "hsl(var(--primary))" }} />
        </div>

        {/* Texto */}
        <div className="text-center max-w-sm">
          <h3 className="text-base font-extrabold mb-1.5" style={{ color: "hsl(var(--foreground))" }}>
            {gateInfo?.title || "Función Premium"}
          </h3>
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
            {gateInfo?.description || "Creá tu cuenta gratis para desbloquear esta función."}
          </p>
        </div>

        {/* CTA Button — 3D style matching the login page */}
        <button
          onClick={() => router.push("/login?tab=register")}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer border-t border-b-[3px] shadow-[0_4px_0_#064e3b,0_8px_18px_rgba(16,185,129,0.25)] active:translate-y-[3px] active:border-b-0 active:shadow-[0_1px_0_#064e3b] hover:brightness-110"
          style={{
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "#000",
            borderTopColor: "rgba(255,255,255,0.3)",
            borderBottomColor: "#064e3b",
          }}
        >
          <Sparkles className="w-4 h-4" />
          <span>Crear Cuenta Gratis</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-[11px] font-medium" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>
          Sin tarjeta de crédito · 100% gratis · Tus datos seguros
        </p>
      </div>
    </div>
  );
}

// ============================================================
// FreemiumBanner: versión inline/compacta para usar dentro de flujos
// (por ejemplo, dentro del chat IA después del 3er mensaje)
// ============================================================
interface FreemiumBannerProps {
  action: FreemiumAction;
  context?: { currentCount?: number };
  onDismiss?: () => void;
  className?: string;
}

export function FreemiumBanner({ action, context, onDismiss, className = "" }: FreemiumBannerProps) {
  const router = useRouter();
  const [isBlocked, setIsBlocked] = useState(false);
  const [gateInfo, setGateInfo] = useState<{ title: string; description: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const result = canPerformAction(action, context);
    setIsBlocked(!result.allowed);
    if (!result.allowed) {
      setGateInfo(result.gateInfo || getGateInfo(action));
    }
  }, [action, context]);

  if (!mounted || !isBlocked) return null;

  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-2xl border animate-slide-up ${className}`}
      style={{
        background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.02))",
        borderColor: "hsl(var(--primary) / 0.25)",
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border"
        style={{
          background: "hsl(var(--primary) / 0.12)",
          borderColor: "hsl(var(--primary) / 0.2)",
        }}
      >
        <Lock className="w-4.5 h-4.5" style={{ color: "hsl(var(--primary))" }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>
          {gateInfo?.title}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
          {gateInfo?.description}
        </p>
      </div>

      <button
        onClick={() => router.push("/login?tab=register")}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, #10b981, #059669)",
          color: "#000",
        }}
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>Crear Cuenta</span>
      </button>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
