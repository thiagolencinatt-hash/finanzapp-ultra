"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, TrendingUp, TrendingDown, ArrowLeftRight, Edit3 } from "lucide-react";
import type { Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/currency";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TransactionForm } from "@/components/transactions/TransactionForm";

export function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const fetchTransactions = () => {
    fetch("/api/transactions?limit=8")
      .then((r) => r.json())
      .then((d) => setTransactions(d.data || []))
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
        className="rounded-2xl glass"
        style={{ border: "1px solid hsl(var(--border) / 0.5)" }}
      >
        <div className="flex items-center justify-between p-4 pb-2">
          <div>
            <h2 className="text-base font-bold" style={{ color: "hsl(var(--foreground))" }}>
              Últimas transacciones
            </h2>
            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
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

        <div className="divide-y" style={{ borderColor: "hsl(var(--border) / 0.4)" }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3 animate-pulse">
                <div className="w-9 h-9 rounded-xl" style={{ background: "hsl(var(--muted))" }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3 rounded-lg w-2/3" style={{ background: "hsl(var(--muted))" }} />
                  <div className="h-2 rounded-lg w-1/3" style={{ background: "hsl(var(--muted))" }} />
                </div>
                <div className="h-4 w-20 rounded-lg" style={{ background: "hsl(var(--muted))" }} />
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

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTx(t)}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-all cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bgColor }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>
                        {t.description || t.category?.name || "Sin descripción"}
                      </p>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-primary flex items-center gap-0.5">
                        <Edit3 className="w-3 h-3" /> Editar
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                      {t.account?.name} • {format(new Date(t.date + "T12:00:00"), "d MMM", { locale: es })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color }}>
                      {isIncome ? "+" : isTransfer ? "" : "-"}{formatCurrency(t.amount, t.currency, true)}
                    </p>
                    {t.currency !== "ARS" && (
                      <span className="text-[10px] font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
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
