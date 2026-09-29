"use client";

import { useMemo } from "react";
import { 
  Zap, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  Calendar, 
  CreditCard, 
  TrendingUp, 
  ChevronRight,
  Info
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { calculateCashFlowProjection } from "@/lib/utils/cash-flow";
import type { FinancialSummary } from "@/lib/types";
import { usePrivacy } from "@/components/providers/PrivacyProvider";

interface CashFlowProjectionCardProps {
  summary: FinancialSummary | null;
}

export function CashFlowProjectionCard({ summary }: CashFlowProjectionCardProps) {
  const { isPrivate } = usePrivacy();
  const analysis = useMemo(() => calculateCashFlowProjection(summary), [summary]);

  if (!summary || (analysis.totalFixedOutflow === 0 && analysis.upcomingEvents.length === 0)) {
    return null;
  }

  const statusConfig = {
    holgado: {
      badge: "Flujo Holgado",
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      barColor: "bg-emerald-400",
      description: "Tu saldo cubre cómodamente todos tus compromisos del mes y te queda margen para invertir.",
    },
    equilibrado: {
      badge: "Flujo Equilibrado",
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      barColor: "bg-blue-400",
      description: "Tus cuentas fijas están cubiertas. Cuidá los gastos hormiga antes del próximo ingreso.",
    },
    ajustado: {
      badge: "Margen Ajustado",
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      barColor: "bg-amber-400",
      description: "Las cuotas y suscripciones consumen una parte significativa de tu saldo disponible.",
    },
    riesgo: {
      badge: "Atención Requerida",
      color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
      barColor: "bg-rose-400",
      description: "Tus compromisos fijos superan el saldo disponible. Evitá compras no esenciales.",
    },
  }[analysis.healthStatus];

  return (
    <div className="rounded-3xl p-5 sm:p-7 lg:p-8 bg-gradient-to-b from-neutral-900/80 to-neutral-950/80 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.08)] relative overflow-hidden">
      {/* Glow ambiental */}
      <div 
        className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: analysis.healthStatus === 'riesgo' ? '#f43f5e' : '#10b981' }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-emerald-400">
            <Zap className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              Proyección de Dinero Libre Real
              <span className={`text-[10px] font-mono font-bold px-3 py-1 rounded-full border backdrop-blur-md ${statusConfig.color}`}>
                {statusConfig.badge}
              </span>
            </h3>
            <p className="text-xs text-neutral-400">
              Lo que podés gastar tranquilamente sin comprometer tus deudas del mes
            </p>
          </div>
        </div>

        {/* Runway Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-neutral-300 self-start sm:self-auto backdrop-blur-md">
          <Clock className="w-3.5 h-3.5 text-neutral-400" />
          <span>
            Runway estimado: <strong className="text-white font-mono font-bold">{analysis.runwayMonths} {analysis.runwayMonths === 1 ? "mes" : "meses"}</strong>
          </span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {/* Dinero Libre */}
        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/[0.08] shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 mb-1">
              Dinero Libre Estimado
            </p>
            <p className="text-2xl sm:text-3xl font-black text-white font-mono tabular-nums tracking-tight">
              {isPrivate ? "$ ••••••" : formatCurrency(Math.max(0, analysis.netFreeCashFlow), "ARS", true)}
            </p>
          </div>
          <p className="text-[10px] text-neutral-400 font-medium mt-2">
            Saldo disponible menos compromisos fijos
          </p>
        </div>

        {/* Compromisos fijos mensuales */}
        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/[0.08] shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 mb-1">
              Compromisos Fijos del Mes
            </p>
            <p className="text-xl sm:text-2xl font-black text-rose-400 font-mono tabular-nums tracking-tight">
              {isPrivate ? "$ ••••••" : formatCurrency(analysis.totalFixedOutflow, "ARS", true)}
            </p>
          </div>
          <p className="text-[10px] text-neutral-400 font-medium mt-2">
            Cuotas ({formatCurrency(analysis.monthlyInstallments, "ARS", true)}) + Suscripciones ({formatCurrency(analysis.monthlySubscriptions, "ARS", true)})
          </p>
        </div>

        {/* Consejo / Status */}
        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/[0.08] shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Diagnóstico
            </p>
            <p className="text-xs text-neutral-300 font-medium leading-relaxed">
              {statusConfig.description}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline de Próximos Vencimientos */}
      {analysis.upcomingEvents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              Timeline de Próximos Vencimientos (30 días)
            </h4>
            <span className="text-[10px] text-zinc-500">Orden cronológico</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {analysis.upcomingEvents.map((evt) => {
              const isToday = evt.daysRemaining === 0;
              const isUrgent = evt.daysRemaining <= 3 && !evt.isIncome;

              return (
                <div
                  key={evt.id}
                  className={`p-3.5 rounded-2xl border transition-all backdrop-blur-md ${
                    evt.isIncome
                      ? "bg-emerald-500/[0.05] border-emerald-500/20 shadow-sm"
                      : isUrgent
                      ? "bg-rose-500/[0.05] border-rose-500/20 shadow-[0_4px_15px_rgba(244,63,94,0.1)]"
                      : "bg-neutral-900/60 border-white/[0.08] shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        isToday
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : evt.isIncome
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : isUrgent
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : "bg-white/[0.06] text-neutral-400 border border-white/[0.08]"
                      }`}
                    >
                      {isToday
                        ? "¡Vence HOY!"
                        : evt.daysRemaining === 1
                        ? "Vence mañana"
                        : `en ${evt.daysRemaining} días`}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">{evt.formattedDate}</span>
                  </div>

                  <p className="text-xs font-semibold text-neutral-200 truncate" title={evt.title}>
                    {evt.title}
                  </p>

                  <p
                    className={`text-sm font-black font-mono tabular-nums tracking-tight mt-1 ${
                      evt.isIncome ? "text-emerald-400" : "text-white"
                    }`}
                  >
                    {evt.isIncome ? "+" : "-"}{isPrivate ? "$ •••" : formatCurrency(evt.amount, "ARS", true)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
