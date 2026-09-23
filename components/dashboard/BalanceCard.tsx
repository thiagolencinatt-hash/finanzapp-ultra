"use client";

import { useState, useEffect } from "react";
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
  
  // Optimistic State
  const [optTotalBalance, setOptTotalBalance] = useState(totalBalance);
  const [optIncome30d, setOptIncome30d] = useState(income30d);
  const [optExpense30d, setOptExpense30d] = useState(expense30d);

  useEffect(() => {
    let localOptBalance = totalBalance;
    let localOptIncome = income30d;
    let localOptExpense = expense30d;

    // Agregar transacciones locales no sincronizadas
    try {
      const localTxs = JSON.parse(localStorage.getItem("local_transactions") || "[]");
      const unsynced = localTxs.filter((t: any) => !t.synced);
      for (const t of unsynced) {
        const val = Number(t.amount) || 0;
        if (t.type === "income") {
          localOptBalance += val;
          localOptIncome += val;
        } else if (t.type === "expense") {
          localOptBalance -= val;
          localOptExpense += val;
        }
      }
    } catch (e) {}

    setOptTotalBalance(localOptBalance);
    setOptIncome30d(localOptIncome);
    setOptExpense30d(localOptExpense);
  }, [totalBalance, income30d, expense30d]);

  useEffect(() => {
    const handleOptimisticTx = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { type, amount } = customEvent.detail;
      const val = Number(amount) || 0;
      if (type === "income") {
        setOptTotalBalance((prev) => prev + val);
        setOptIncome30d((prev) => prev + val);
      } else if (type === "expense") {
        setOptTotalBalance((prev) => prev - val);
        setOptExpense30d((prev) => prev + val);
      }
    };
    window.addEventListener("optimistic-tx", handleOptimisticTx);
    return () => window.removeEventListener("optimistic-tx", handleOptimisticTx);
  }, []);

  const netFlow = optIncome30d - optExpense30d;

  return (
    <>
      <div
        className="relative rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 lg:p-8 overflow-hidden glass-strong"
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
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.05] text-zinc-300 shrink-0 border border-white/[0.08]">
                <DollarSign className="w-4 h-4 font-bold" />
              </div>
              <p className="text-[11px] sm:text-sm font-semibold uppercase tracking-widest text-zinc-400 truncate">
                Balance General
              </p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-zinc-100 mb-1 tracking-tighter truncate drop-shadow-md">
              {formatCurrency(optTotalBalance)}
            </p>
          </motion.div>

          <p className="text-[11px] sm:text-xs text-zinc-500 mb-5 font-medium">
            Saldo total acumulado en todas tus cuentas
          </p>

          {/* Botones de acción principales grandes para pulgar móvil */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-5">
            <button
              onClick={() => setFormType("income")}
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl text-xs sm:text-sm font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 shadow-[0_8px_20px_rgba(16,185,129,0.1)] transition-all cursor-pointer active:scale-[0.97]"
              title="Registrar nuevo ingreso (sueldo, extra, etc)"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
              <span>Ingreso</span>
            </button>
            <button
              onClick={() => setFormType("expense")}
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl text-xs sm:text-sm font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 shadow-[0_8px_20px_rgba(244,63,94,0.1)] transition-all cursor-pointer active:scale-[0.97]"
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
              className="rounded-2xl p-3 sm:p-4 bg-zinc-900/50 border border-white/[0.06] hover:bg-zinc-900/80 cursor-pointer card-hover"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px] sm:text-xs font-semibold text-emerald-400">Ingresos</span>
                </div>
              </div>
              <p className="text-base sm:text-lg font-bold text-zinc-100 truncate">{formatCurrency(optIncome30d, "ARS", true)}</p>
              <p className="text-[10px] text-zinc-500 font-medium">últimos 30 días</p>
            </div>

            {/* Gastos card */}
            <div
              onClick={() => setFormType("expense")}
              className="rounded-2xl p-3 sm:p-4 bg-zinc-900/50 border border-white/[0.06] hover:bg-zinc-900/80 cursor-pointer card-hover"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                  <span className="text-[11px] sm:text-xs font-semibold text-rose-400">Gastos</span>
                </div>
              </div>
              <p className="text-base sm:text-lg font-bold text-zinc-100 truncate">{formatCurrency(optExpense30d, "ARS", true)}</p>
              <p className="text-[10px] text-zinc-500 font-medium">últimos 30 días</p>
            </div>

            {/* Cuotas card */}
            <div className="col-span-2 sm:col-span-1 rounded-2xl p-3 sm:p-4 bg-zinc-900/50 border border-white/[0.06] card-hover">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  <span className="text-[11px] sm:text-xs font-semibold text-indigo-400">Cuotas Mensuales</span>
                </div>
              </div>
              <p className="text-base sm:text-lg font-bold text-zinc-100 truncate">
                {formatCurrency(monthlyInstallments, "ARS", true)}
              </p>
              <p className="text-[10px] text-zinc-500 font-medium">por mes</p>
            </div>
          </div>

          {/* Net flow indicator */}
          {(optIncome30d > 0 || optExpense30d > 0) && (
            <div className="mt-4 flex items-center gap-2 rounded-xl px-4 py-3 bg-white/[0.02] border border-white/[0.05]">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: netFlow >= 0 ? "#34d399" : "#fb7185", boxShadow: `0 0 10px ${netFlow >= 0 ? '#34d399' : '#fb7185'}` }}
              />
              <p className="text-xs text-zinc-300 font-medium">
                Flujo neto:{" "}
                <span className={`font-bold ${netFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(Math.abs(netFlow), "ARS", true)}</span>{" "}
                <span className="text-zinc-500">
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
