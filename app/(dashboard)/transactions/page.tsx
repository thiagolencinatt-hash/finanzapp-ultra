"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { Plus, TrendingUp, TrendingDown, ArrowLeftRight, Filter, Download, Edit3, Trash2 } from "lucide-react";
import type { Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/currency";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ExportExcelButton } from "@/components/dashboard/ExportExcelButton";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ type: "", from: "", to: "", account_id: "" });
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  const loadTransactions = useCallback(async (reset = false) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(reset ? 0 : offset) });
    if (filters.type) params.set("type", filters.type);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.account_id) params.set("account_id", filters.account_id);

    try {
      const res = await fetch(`/api/transactions?${params}`);
      const data = await res.json();
      if (reset) {
        setTransactions(data.data || []);
        setOffset(LIMIT);
      } else {
        setTransactions((prev) => [...prev, ...(data.data || [])]);
        setOffset((o) => o + LIMIT);
      }
      setTotal(data.count || 0);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, [filters, offset]);

  useEffect(() => {
    loadTransactions(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm("¿Eliminar este movimiento?")) return;
    await fetch("/api/transactions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadTransactions(true);
  }

  function handleEdit(tx: Transaction) {
    setSelectedTx(tx);
    setShowForm(true);
  }

  function handleNew() {
    setSelectedTx(null);
    setShowForm(true);
  }

  function handleExportCSV() {
    if (transactions.length === 0) return;
    const headers = ["Fecha", "Tipo", "Descripción", "Categoría", "Cuenta", "Monto", "Moneda"];
    const rows = transactions.map((t) => [
      t.date,
      t.type,
      `"${(t.description || "").replace(/"/g, '""')}"`,
      `"${(t.category?.name || "Sin categoría").replace(/"/g, '""')}"`,
      `"${(t.account?.name || "Sin cuenta").replace(/"/g, '""')}"`,
      t.amount,
      t.currency,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transacciones_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const incomeTotal = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenseTotal = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="flex flex-col">
      <Header title="Transacciones & Gastos" subtitle={`${total} movimientos registrados`} />

      <div className="flex-1 p-4 lg:p-6">
        {/* Quick summary stats */}
        {transactions.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <div className="p-3.5 rounded-xl gradient-income">
              <span className="text-[11px] font-bold text-income">Ingresos listados</span>
              <p className="text-lg font-black mt-0.5 text-income">+{formatCurrency(incomeTotal, "ARS", true)}</p>
            </div>
            <div className="p-3.5 rounded-xl gradient-expense">
              <span className="text-[11px] font-bold text-expense">Gastos listados</span>
              <p className="text-lg font-black mt-0.5 text-expense">-{formatCurrency(expenseTotal, "ARS", true)}</p>
            </div>
            <div className="hidden sm:block p-3.5 rounded-xl glass">
              <span className="text-[11px] font-bold" style={{ color: "hsl(var(--muted-foreground))" }}>Total registros</span>
              <p className="text-lg font-black mt-0.5" style={{ color: "hsl(var(--foreground))" }}>{total} movimientos</p>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all btn-3d-secondary cursor-pointer"
            style={{
              background: showFilters ? "hsl(var(--primary) / 0.2)" : undefined,
              color: showFilters ? "hsl(var(--primary))" : undefined,
            }}
          >
            <Filter className="w-4 h-4" /> Filtros
          </button>

          <ExportExcelButton variant="outline" label="Exportar Excel" />

          {transactions.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all btn-3d-secondary cursor-pointer"
              title="Descargar lista en CSV"
            >
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
          )}

          <div className="flex-1" />
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-black gradient-primary btn-3d cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nuevo Movimiento
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="mb-4 animate-slide-up">
            <TransactionFilters filters={filters} onChange={(f) => { setFilters(f); }} />
          </div>
        )}

        {/* Transaction list */}
        <div
          className="rounded-2xl overflow-hidden glass shadow-xl"
          style={{ border: "1px solid hsl(var(--border) / 0.5)" }}
        >
          {transactions.length === 0 && !loading ? (
            <div className="p-12 text-center" style={{ color: "hsl(var(--muted-foreground))" }}>
              <p className="text-base font-semibold">Sin transacciones</p>
              <p className="text-xs mt-1">Registrá tu primer movimiento con el botón "Nuevo Movimiento"</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "hsl(var(--border) / 0.4)" }}>
              {transactions.map((t) => {
                const isIncome = t.type === "income";
                const isTransfer = t.type === "transfer";
                const Icon = isTransfer ? ArrowLeftRight : isIncome ? TrendingUp : TrendingDown;
                const color = isTransfer
                  ? "hsl(var(--warning))"
                  : isIncome ? "hsl(var(--income))" : "hsl(var(--expense))";
                const bg = isTransfer
                  ? "hsl(var(--warning-muted))"
                  : isIncome ? "hsl(var(--income-muted))" : "hsl(var(--expense-muted))";

                return (
                  <div
                    key={t.id}
                    onClick={() => handleEdit(t)}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-all group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner" style={{ background: bg }}>
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "hsl(var(--foreground))" }}>
                        {t.description || t.category?.name || "Sin descripción"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {t.category && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: `${t.category.color || "#6366F1"}25`, color: t.category.color || "#6366F1" }}>
                            {t.category.name}
                          </span>
                        )}
                        <span className="text-xs opacity-70" style={{ color: "hsl(var(--muted-foreground))" }}>
                          {t.account?.name} • {format(new Date(t.date + "T12:00:00"), "d MMM yyyy", { locale: es })}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="text-base font-extrabold" style={{ color }}>
                          {isIncome ? "+" : isTransfer ? "" : "-"}{formatCurrency(t.amount, t.currency, true)}
                        </p>
                      </div>

                      {/* Action buttons on hover */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEdit(t); }}
                          className="p-1.5 rounded-lg transition-all opacity-80 hover:opacity-100 hover:bg-primary/20 text-primary"
                          title="Editar movimiento"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, t.id)}
                          className="p-1.5 rounded-lg transition-all opacity-80 hover:opacity-100 hover:bg-red-500/20 text-red-400"
                          title="Eliminar movimiento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load more */}
          {transactions.length < total && (
            <div className="p-4 text-center border-t border-white/10">
              <button
                onClick={() => loadTransactions(false)}
                className="text-sm font-bold text-primary hover:underline cursor-pointer"
              >
                {loading ? "Cargando..." : `Ver más (${total - transactions.length} restantes)`}
              </button>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <TransactionForm
          isOpen={showForm}
          transaction={selectedTx}
          onClose={() => {
            setShowForm(false);
            setSelectedTx(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setSelectedTx(null);
            loadTransactions(true);
          }}
        />
      )}
    </div>
  );
}
