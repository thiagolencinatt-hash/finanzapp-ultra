"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, TrendingUp, TrendingDown, ArrowLeftRight, Edit3 } from "lucide-react";
import type { Transaction } from "@/lib/types";
import { normalizeTransactions } from "@/lib/utils/normalize-transaction";
import { formatCurrency } from "@/lib/utils/currency";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TransactionForm } from "@/components/transactions/TransactionForm";

/**
 * Safely format a date string for display. Falls back gracefully
 * if the date is invalid to prevent unmounting the dashboard.
 * GEL-021: Prevents crash from malformed date in AI-generated or local transactions.
 */
function safeFormatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "Sin fecha";
  try {
    // Ensure we always have a YYYY-MM-DD format by stripping time parts
    const cleanDate = dateStr.split("T")[0];
    const parsed = new Date(cleanDate + "T12:00:00");
    if (isNaN(parsed.getTime())) return "Sin fecha";
    return format(parsed, "d MMM", { locale: es });
  } catch {
    return "Sin fecha";
  }
}

export function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const fetchTransactions = () => {
    fetch("/api/transactions?limit=8", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        // GEL-021: Normalize all server transactions before setting state
        let serverTxs = normalizeTransactions(d.data || []);
        try {
          const localTxs = JSON.parse(localStorage.getItem("local_transactions") || "[]");
          const unsynced = normalizeTransactions(localTxs.filter((t: Record<string, unknown>) => !t.synced));
          // Insertar unsynced al principio y eliminar de serverTxs si por alguna razón vinieran repetidos
          const unsyncedIds = new Set(unsynced.map((t) => t.id));
          serverTxs = serverTxs.filter((t) => !unsyncedIds.has(t.id));
          setTransactions([...unsynced, ...serverTxs].slice(0, 8));
        } catch (e) {
          setTransactions(serverTxs);
        }
      })
      .catch((err) => {
        console.error("[RecentTransactions] fetch error:", err);
        // GEL-021: On network error, show local transactions only rather than empty
        try {
          const localTxs = JSON.parse(localStorage.getItem("local_transactions") || "[]");
          setTransactions(normalizeTransactions(localTxs).slice(0, 8));
        } catch {
          // Keep existing state, don't clear
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTransactions();
    const handleRefresh = () => fetchTransactions();
    window.addEventListener("finance-refresh", handleRefresh);
    return () => window.removeEventListener("finance-refresh", handleRefresh);
  }, []);

  return (
    <>
      <div
        className="rounded-[2rem] glass-strong p-4 sm:p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-zinc-100">
              Últimas transacciones
            </h2>
            <p className="text-[11px] text-zinc-500 font-medium">
              Tocá cualquier transacción para editar su monto o categoría
            </p>
          </div>
          <Link
            href="/transactions"
            className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            Ver todas <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-2.5">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-4 py-3.5 flex items-center gap-3 animate-pulse bg-zinc-900/40 rounded-xl border border-white/[0.02]">
                <div className="w-10 h-10 rounded-xl bg-zinc-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 rounded-lg w-2/3 bg-zinc-800" />
                  <div className="h-2 rounded-lg w-1/3 bg-zinc-800" />
                </div>
                <div className="h-4 w-20 rounded-lg bg-zinc-800" />
              </div>
            ))
          ) : transactions.length === 0 ? (
            <div className="px-4 py-8 text-center" style={{ color: "hsl(var(--muted-foreground))" }}>
              <p className="text-sm font-medium">Sin transacciones aún</p>
              <p className="text-xs mt-1">Registrá tu primer gasto o ingreso</p>
            </div>
          ) : (
            transactions.map((t) => {
              const isIncome = t.type === "income";
              const isTransfer = t.type === "transfer";
              const Icon = isTransfer ? ArrowLeftRight : isIncome ? TrendingUp : TrendingDown;
              const color = isTransfer
                ? "hsl(var(--warning))"
                : isIncome
                ? "hsl(var(--income))"
                : "hsl(var(--expense))";
              const bgColor = isTransfer
                ? "hsl(var(--warning-muted))"
                : isIncome
                ? "hsl(var(--income-muted))"
                : "hsl(var(--expense-muted))";

              // GEL-021: Safe access to nested objects and formatting
              const displayDescription = t.description || t.category?.name || "Sin descripción";
              const displayAccountName = t.account?.name || "";
              const displayDate = safeFormatDate(t.date);
              const displayAmount = isFinite(t.amount) ? t.amount : 0;

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTx(t)}
                  className="px-4 py-3.5 min-h-[44px] flex items-center gap-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.03] rounded-2xl transition-all cursor-pointer group active:scale-[0.98] card-hover"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bgColor }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate text-zinc-200">
                        {displayDescription}
                      </p>
                      {t.synced === false && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-500">
                          Local
                        </span>
                      )}
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-emerald-400 flex items-center gap-0.5">
                        <Edit3 className="w-3 h-3" /> Editar
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 font-medium">
                      {displayAccountName}{displayAccountName ? " • " : ""}{displayDate}
                    </p>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    <p className="text-sm font-extrabold drop-shadow-sm" style={{ color }}>
                      {isIncome ? "+" : isTransfer ? "" : "-"}{formatCurrency(displayAmount, t.currency, true)}
                    </p>
                    {t.currency !== "ARS" && (
                      <span className="text-[10px] font-medium text-zinc-500">
                        {t.currency}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedTx && (
        <TransactionForm
          isOpen={Boolean(selectedTx)}
          transaction={selectedTx}
          onClose={() => setSelectedTx(null)}
          onSuccess={() => {
            setSelectedTx(null);
            fetchTransactions();
          }}
        />
      )}
    </>
  );
}
