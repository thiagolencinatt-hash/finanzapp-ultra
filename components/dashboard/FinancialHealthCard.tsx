"use client";

import { motion } from "framer-motion";
import { ShieldCheck, TrendingUp, Clock, AlertTriangle, Sparkles, HelpCircle } from "lucide-react";
import type { FinancialHealthMetrics } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/currency";

interface FinancialHealthCardProps {
  metrics?: FinancialHealthMetrics;
}

export function FinancialHealthCard({ metrics }: FinancialHealthCardProps) {
  if (!metrics) return null;

  const { score, status, savings_rate, runway_months, free_cash_flow, debt_ratio } = metrics;

  const statusConfig = {
    excelente: {
      label: "Excelente",
      color: "#10B981",
      bgColor: "rgba(16, 185, 129, 0.12)",
      borderColor: "rgba(16, 185, 129, 0.3)",
      description: "Tus finanzas están en equilibrio óptimo. Ahorro sólido y colchón de seguridad fuerte.",
    },
    saludable: {
      label: "Saludable",
      color: "#3B82F6",
      bgColor: "rgba(59, 130, 246, 0.12)",
      borderColor: "rgba(59, 130, 246, 0.3)",
      description: "Buen control financiero. Podés aumentar tu colchón o acelerar metas de inversión.",
    },
    atencion: {
      label: "Atención",
      color: "#F59E0B",
      bgColor: "rgba(245, 158, 11, 0.12)",
      borderColor: "rgba(245, 158, 11, 0.3)",
      description: "Cuotas o gastos mensuales consumen más del 70% de tus ingresos. Conviene optimizar.",
    },
    critico: {
      label: "Ajuste Necesario",
      color: "#EF4444",
      bgColor: "rgba(239, 68, 68, 0.12)",
      borderColor: "rgba(239, 68, 68, 0.3)",
      description: "El flujo de caja mensual es negativo o el nivel de deuda supera el límite recomendado.",
    },
  }[status];

  return (
    <div
      className="rounded-3xl p-5 lg:p-6 glass-strong shadow-xl relative overflow-hidden"
      style={{ border: `1px solid ${statusConfig.borderColor}` }}
    >
      {/* Background soft ambient glow */}
      <div
        className="absolute -right-16 -top-16 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ background: statusConfig.color }}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner flex-shrink-0"
            style={{
              background: statusConfig.bgColor,
              color: statusConfig.color,
              border: `1px solid ${statusConfig.borderColor}`,
            }}
          >
            {score}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-foreground tracking-tight">
                Salud Financiera Pro
              </h3>
              <span
                className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase"
                style={{
                  background: statusConfig.bgColor,
                  color: statusConfig.color,
                  border: `1px solid ${statusConfig.borderColor}`,
                }}
              >
                {statusConfig.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {statusConfig.description}
            </p>
          </div>
        </div>

        {/* Score Progress Bar Visual */}
        <div className="w-full md:w-48 flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-muted-foreground">Índice Vital</span>
            <span style={{ color: statusConfig.color }}>{score}/100</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: statusConfig.color }}
            />
          </div>
        </div>
      </div>

      {/* 4 Essential Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-card/60 border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold mb-1">
            <span>Tasa de Ahorro</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-lg font-black text-foreground">
            {savings_rate}%
            <span className="text-[10px] text-muted-foreground font-normal ml-1">del ingreso</span>
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-card/60 border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold mb-1">
            <span>Colchón (Runway)</span>
            <Clock className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <p className="text-lg font-black text-foreground">
            {runway_months}{" "}
            <span className="text-[10px] text-muted-foreground font-normal">meses</span>
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-card/60 border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold mb-1">
            <span>Flujo Libre</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p
            className="text-lg font-black"
            style={{ color: free_cash_flow >= 0 ? "hsl(var(--foreground))" : "hsl(var(--expense))" }}
          >
            {formatCurrency(free_cash_flow, "ARS", true)}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-card/60 border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold mb-1">
            <span>Compromiso Cuotas</span>
            <AlertTriangle
              className="w-3.5 h-3.5"
              style={{ color: debt_ratio > 35 ? "#EF4444" : "#10B981" }}
            />
          </div>
          <p className="text-lg font-black text-foreground">
            {debt_ratio}%
            <span className="text-[10px] text-muted-foreground font-normal ml-1">del ingreso</span>
          </p>
        </div>
      </div>
    </div>
  );
}
