"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, CreditCard, DollarSign, PlusCircle, MinusCircle, RotateCcw, Trash2, Eye, EyeOff } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { ResetDataModal } from "@/components/dashboard/ResetDataModal";
import { usePrivacy } from "@/components/providers/PrivacyProvider";

interface BalanceCardProps {
  totalBalance: number;
  income30d: number;
  expense30d: number;
  monthlyInstallments: number;
  onRefresh?: () => void;
}

export function BalanceCard({
  totalBalance,
  income30d,
  expense30d,
  monthlyInstallments,
  onRefresh,
}: BalanceCardProps) {
  const { isPrivate, togglePrivacy } = usePrivacy();
  const [formType, setFormType] = useState<"income" | "expense" | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  
  // Eliminado estado optimista (GEL-025)
  // El balance ahora proviene estrictamente de las props (Supabase SSoT)
  const netFlow = income30d - expense30d;
  const realFreeMoney = Math.max(0, totalBalance - monthlyInstallments);

  return (
    <>
      <div
        className="relative titanium-foil border border-white/10 glass-specular-top rounded-[2rem] p-5 sm:p-7 lg:p-8 overflow-hidden"
      >
        {/* Specular Iridescent Sheen Gradient Reflection Layer */}
        <div
          className="absolute -right-16 -top-16 w-56 h-56 bg-gradient-to-br from-emerald-400/25 via-indigo-500/15 to-transparent rounded-full blur-2xl pointer-events-none"
        />
        <div
          className="absolute -left-12 -bottom-12 w-48 h-48 bg-purple-500/10 rounded-full blur-xl pointer-events-none"
        />

        <div className="relative z-10">
          {/* Header row of the card */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-400/10 text-emerald-400 shrink-0 border border-emerald-400/25 shadow-[0_0_12px_rgba(78,222,163,0.25)]">
                <DollarSign className="w-4 h-4 font-bold" />
              </div>
              <p className="text-[11px] font-mono font-medium uppercase tracking-wider text-neutral-400 truncate">
                Saldo Consolidado
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={togglePrivacy}
                className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer border border-white/[0.06]"
                title={isPrivate ? "Mostrar números confidenciales" : "Ocultar números confidenciales (Modo Privacidad)"}
              >
                {isPrivate ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
              </button>
              {/* 3D Gold Microchip Accent */}
              <div
                className="w-8 h-6 rounded-md bg-gradient-to-tr from-amber-600 via-amber-300 to-amber-500 border border-amber-200/50 shadow-md flex items-center justify-center p-0.5 opacity-90 shrink-0"
                title="Sovereign Vault Security Chip"
              >
                <div className="w-full h-full border border-amber-900/40 rounded-sm grid grid-cols-2 gap-0.5">
                  <span className="border-b border-amber-900/30"></span>
                  <span className="border-b border-amber-900/30"></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>

          {/* Embossed Metallic Balance Figures */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="mb-3"
          >
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-mono tracking-tight tabular-nums text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-100 to-neutral-400 drop-shadow-sm">
                {isPrivate ? "$ ••••••" : formatCurrency(totalBalance)}
              </h1>
              <span className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-wider">
                ARS
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1 font-medium">
              Saldo total acumulado en todas tus cuentas
            </p>
          </motion.div>

          {/* Glowing Pill Badge: "Real Free Money" con efecto ping */}
          <div className="relative z-10 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-950/80 border border-emerald-400/30 backdrop-blur-md shadow-[0_0_14px_rgba(78,222,163,0.15)] mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-mono text-xs text-neutral-400">Real Free Money:</span>
            <span className="font-mono text-xs font-bold text-emerald-400">
              {isPrivate ? "$ ••••••" : formatCurrency(realFreeMoney, "ARS", true)}
            </span>
            <span className="text-[10px] text-neutral-500">disp. tras fijos</span>
          </div>

          {/* Botones de acción principales grandes para pulgar móvil */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-5">
            <button
              onClick={() => setFormType("income")}
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl text-xs sm:text-sm font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 shadow-[0_8px_20px_rgba(16,185,129,0.12)] transition-all cursor-pointer active:scale-[0.97]"
              title="Registrar nuevo ingreso (sueldo, extra, etc)"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
              <span>Ingreso</span>
            </button>
            <button
              onClick={() => setFormType("expense")}
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl text-xs sm:text-sm font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 shadow-[0_8px_20px_rgba(244,63,94,0.12)] transition-all cursor-pointer active:scale-[0.97]"
              title="Registrar nuevo gasto"
            >
              <MinusCircle className="w-4 h-4 text-rose-400 stroke-[2.5]" />
              <span>Gasto</span>
            </button>
          </div>

          {/* Stats row — 2 columnas en mobile con Cuotas ocupando fila completa */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {/* Ingresos card */}
            <div
              onClick={() => setFormType("income")}
              className="rounded-2xl p-3.5 sm:p-4 bg-neutral-900/60 border border-white/[0.08] hover:bg-neutral-900/90 transition-all cursor-pointer shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px] sm:text-xs font-semibold text-emerald-400">Ingresos</span>
                </div>
              </div>
              <p className="text-base sm:text-lg font-black text-white truncate font-mono tabular-nums tracking-tight">
                {isPrivate ? "$ ••••••" : formatCurrency(income30d, "ARS", true)}
              </p>
              <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">últimos 30 días</p>
            </div>

            {/* Gastos card */}
            <div
              onClick={() => setFormType("expense")}
              className="rounded-2xl p-3.5 sm:p-4 bg-neutral-900/60 border border-white/[0.08] hover:bg-neutral-900/90 transition-all cursor-pointer shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                  <span className="text-[11px] sm:text-xs font-semibold text-rose-400">Gastos</span>
                </div>
              </div>
              <p className="text-base sm:text-lg font-black text-white truncate font-mono tabular-nums tracking-tight">
                {isPrivate ? "$ ••••••" : formatCurrency(expense30d, "ARS", true)}
              </p>
              <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">últimos 30 días</p>
            </div>

            {/* Cuotas card */}
            <div className="col-span-2 sm:col-span-1 rounded-2xl p-3.5 sm:p-4 bg-neutral-900/60 border border-white/[0.08] shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  <span className="text-[11px] sm:text-xs font-semibold text-indigo-400">Cuotas Mensuales</span>
                </div>
              </div>
              <p className="text-base sm:text-lg font-black text-white truncate font-mono tabular-nums tracking-tight">
                {isPrivate ? "$ ••••••" : formatCurrency(monthlyInstallments, "ARS", true)}
              </p>
              <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">por mes</p>
            </div>
          </div>

          {/* Net flow indicator */}
          {(income30d > 0 || expense30d > 0) && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl px-4 py-3 bg-white/[0.02] border border-white/[0.06] backdrop-blur-md">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: netFlow >= 0 ? "#34d399" : "#fb7185", boxShadow: `0 0 10px ${netFlow >= 0 ? '#34d399' : '#fb7185'}` }}
              />
              <p className="text-xs text-neutral-300 font-medium">
                Flujo neto:{" "}
                <span className={`font-black font-mono tabular-nums tracking-tight ${netFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPrivate ? "$ ••••••" : formatCurrency(Math.abs(netFlow), "ARS", true)}
                </span>{" "}
                <span className="text-neutral-400">
                  {netFlow >= 0 ? "a favor este mes 🎉" : "en déficit este mes ⚠️"}
                </span>
              </p>
            </div>
          )}

        </div>
      </div>

      {formType && (
        <TransactionForm
          isOpen={Boolean(formType)}
          defaultType={formType}
          onClose={() => setFormType(null)}
          onSuccess={() => {
            setFormType(null);
            onRefresh?.();
          }}
        />
      )}

      <ResetDataModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onSuccess={() => onRefresh?.()}
      />
    </>
  );
}
