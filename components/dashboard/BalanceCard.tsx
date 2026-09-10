"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, CreditCard, DollarSign, PlusCircle, MinusCircle, RotateCcw, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { ResetDataModal } from "@/components/dashboard/ResetDataModal";

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
  const [formType, setFormType] = useState<"income" | "expense" | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const netFlow = income30d - expense30d;

  return (
    <>
      <div
        className="relative rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 overflow-hidden glass-strong shadow-2xl"
        style={{
          border: "1px solid hsl(var(--border) / 0.6)",
        }}
      >
        {/* Luces de acento de fondo */}
        <div
          className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: "hsl(var(--primary))" }}
        />
        <div
          className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: "hsl(142 71% 45%)" }}
        />

        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center bg-primary/20 text-primary">
                <DollarSign className="w-4 h-4 font-bold" />
              </div>
              <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Balance General
              </p>
            </div>

            <button
              onClick={() => setShowResetModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer active:scale-95"
              title="Dejar todas las finanzas en $0 para arrancar como nuevo usuario"
            >
              <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Empezar en $0</span>
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground mb-1 tracking-tight">
              {formatCurrency(totalBalance)}
            </p>
          </motion.div>

          <p className="text-[11px] sm:text-xs text-muted-foreground mb-4">
            Saldo total acumulado en todas tus cuentas
          </p>

          {/* Botones de acción principales grandes para pulgar móvil */}
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <button
              onClick={() => setFormType("income")}
              className="flex items-center justify-center gap-2 py-2.5 sm:py-3 px-3 rounded-xl text-xs sm:text-sm font-black text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 shadow-lg shadow-emerald-500/10 transition-all cursor-pointer active:scale-[0.98]"
              title="Registrar nuevo ingreso (sueldo, extra, etc)"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
              <span>+ Ingreso</span>
            </button>
            <button
              onClick={() => setFormType("expense")}
              className="flex items-center justify-center gap-2 py-2.5 sm:py-3 px-3 rounded-xl text-xs sm:text-sm font-black text-rose-400 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 shadow-lg shadow-rose-500/10 transition-all cursor-pointer active:scale-[0.98]"
              title="Registrar nuevo gasto"
            >
              <MinusCircle className="w-4 h-4 text-rose-400 stroke-[2.5]" />
              <span>- Gasto</span>
            </button>
          </div>

          {/* Stats row — 2 columnas en mobile con Cuotas ocupando fila completa */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {/* Ingresos card */}
            <div
              onClick={() => setFormType("income")}
              className="rounded-2xl p-3 sm:p-3.5 gradient-income cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-income" />
                  <span className="text-[11px] sm:text-xs font-bold text-income">Ingresos</span>
                </div>
              </div>
              <p className="text-sm sm:text-base font-extrabold text-foreground truncate">{formatCurrency(income30d, "ARS", true)}</p>
              <p className="text-[10px] text-muted-foreground">últimos 30 días</p>
            </div>

            {/* Gastos card */}
            <div
              onClick={() => setFormType("expense")}
              className="rounded-2xl p-3 sm:p-3.5 gradient-expense cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-expense" />
                  <span className="text-[11px] sm:text-xs font-bold text-expense">Gastos</span>
                </div>
              </div>
              <p className="text-sm sm:text-base font-extrabold text-foreground truncate">{formatCurrency(expense30d, "ARS", true)}</p>
              <p className="text-[10px] text-muted-foreground">últimos 30 días</p>
            </div>

            {/* Cuotas card */}
            <div className="col-span-2 sm:col-span-1 rounded-2xl p-3 sm:p-3.5 glass">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-warning" />
                  <span className="text-[11px] sm:text-xs font-bold text-warning">Cuotas Comprometidas</span>
                </div>
              </div>
              <p className="text-sm sm:text-base font-extrabold text-foreground truncate">
                {formatCurrency(monthlyInstallments, "ARS", true)}
              </p>
              <p className="text-[10px] text-muted-foreground">por mes</p>
            </div>
          </div>

          {/* Net flow indicator */}
          {(income30d > 0 || expense30d > 0) && (
            <div className="mt-4 flex items-center gap-2 rounded-xl px-3.5 py-2.5 bg-black/20 border border-white/5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: netFlow >= 0 ? "hsl(var(--income))" : "hsl(var(--expense))" }}
              />
              <p className="text-xs text-foreground font-medium">
                Flujo neto:{" "}
                <span className="font-bold text-primary">{formatCurrency(Math.abs(netFlow), "ARS", true)}</span>{" "}
                <span className="text-muted-foreground">
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
