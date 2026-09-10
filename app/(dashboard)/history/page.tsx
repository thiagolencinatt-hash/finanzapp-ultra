"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Download, Calendar, TrendingUp, TrendingDown, ArrowLeftRight, ChevronLeft, ChevronRight, AlertCircle, Search } from "lucide-react";
import type { Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/currency";
import { FreemiumGate } from "@/components/ui/FreemiumGate";
import { ExportExcelButton } from "@/components/dashboard/ExportExcelButton";

const URGENCY_CONFIG = {
  essential: { label: "Esencial", emoji: "🔴", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  important: { label: "Importante", emoji: "🟡", color: "#eab308", bg: "rgba(234,179,8,0.12)" },
  nice_to_have: { label: "Opcional", emoji: "🟢", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  unnecessary: { label: "Prescindible", emoji: "⚪", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
} as const;

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "expense" | "income">("all");
  const [filterUrgency, setFilterUrgency] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Previous month for comparison
  const getPrevMonth = (month: string) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const [prevMonthData, setPrevMonthData] = useState<{ income: number; expense: number }>({ income: 0, expense: 0 });

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    const [year, month] = currentMonth.split("-").map(Number);
    const from = `${currentMonth}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${currentMonth}-${String(lastDay).padStart(2, "0")}`;

    try {
      const res = await fetch(`/api/transactions?limit=100&offset=0&from=${from}&to=${to}`);
      const data = await res.json();
      setTransactions(data.data || []);

      // Cargar mes anterior para comparación
      const prevMonth = getPrevMonth(currentMonth);
      const [py, pm] = prevMonth.split("-").map(Number);
      const prevFrom = `${prevMonth}-01`;
      const prevLastDay = new Date(py, pm, 0).getDate();
      const prevTo = `${prevMonth}-${String(prevLastDay).padStart(2, "0")}`;

      const prevRes = await fetch(`/api/transactions?limit=100&offset=0&from=${prevFrom}&to=${prevTo}`);
      const prevData = await prevRes.json();
      const prevTxs = prevData.data || [];
      setPrevMonthData({
        income: prevTxs.filter((t: Transaction) => t.type === "income").reduce((s: number, t: Transaction) => s + t.amount, 0),
        expense: prevTxs.filter((t: Transaction) => t.type === "expense").reduce((s: number, t: Transaction) => s + t.amount, 0),
      });
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Navigate months
  const goMonth = (direction: -1 | 1) => {
    const [y, m] = currentMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + direction, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const monthLabel = new Date(Number(currentMonth.split("-")[0]), Number(currentMonth.split("-")[1]) - 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  // Filtered transactions
  const filteredTransactions = transactions.filter((t) => {
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterUrgency !== "all" && t.urgency !== filterUrgency) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const descMatch = (t.description || "").toLowerCase().includes(q);
      const catMatch = (t.category?.name || "").toLowerCase().includes(q);
      if (!descMatch && !catMatch) return false;
    }
    return true;
  });

  // Calculated stats based on all transactions of month
  const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const net = income - expense;

  // Urgency breakdown
  const unnecessarySpend = transactions
    .filter((t) => t.type === "expense" && (t.urgency === "unnecessary" || t.urgency === "nice_to_have"))
    .reduce((s, t) => s + t.amount, 0);

  // Comparison with previous month
  const expenseDiff = prevMonthData.expense > 0 ? ((expense - prevMonthData.expense) / prevMonthData.expense) * 100 : 0;

  // Group by date
  const grouped: Record<string, Transaction[]> = {};
  filteredTransactions.forEach((t) => {
    const day = t.date;
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(t);
  });
  const sortedDays = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // Export to CSV
  function handleExportCSV() {
    if (transactions.length === 0) return;
    const headers = ["Fecha", "Tipo", "Urgencia", "Descripción", "Categoría", "Monto", "Moneda"];
    const rows = transactions.map((t) => [
      t.date,
      t.type,
      t.urgency || "sin-clasificar",
      `"${(t.description || "").replace(/"/g, '""')}"`,
      `"${(t.category?.name || "Sin categoría").replace(/"/g, '""')}"`,
      t.amount,
      t.currency,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historial_${currentMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <FreemiumGate action="view_history">
    <div className="flex flex-col">
      <Header
        title="Historial Financiero"
        subtitle="Tu línea de tiempo de gastos e ingresos"
        actionButton={
          <div className="flex items-center gap-2">
            <ExportExcelButton variant="outline" label="Excel (.xlsx)" className="py-1.5 px-3" />
            {transactions.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all btn-3d-secondary cursor-pointer"
                title="Exportar CSV de este mes"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            )}
          </div>
        }
      />

      <div className="flex-1 p-4 lg:p-6 space-y-5">
        {/* Month Navigator */}
        <div className="flex items-center justify-between gap-4 animate-slide-up">
          <button
            onClick={() => goMonth(-1)}
            className="p-2 rounded-xl transition-all hover:bg-white/10 cursor-pointer"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
            <span className="text-lg font-bold capitalize" style={{ color: "hsl(var(--foreground))" }}>
              {monthLabel}
            </span>
          </div>
          <button
            onClick={() => goMonth(1)}
            className="p-2 rounded-xl transition-all hover:bg-white/10 cursor-pointer"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-slide-up">
          <div className="p-3.5 rounded-xl gradient-income">
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "hsl(var(--income))" }}>Ingresos</span>
            <p className="text-lg font-black mt-1" style={{ color: "hsl(var(--income))" }}>
              +{formatCurrency(income, "ARS", true)}
            </p>
          </div>
          <div className="p-3.5 rounded-xl gradient-expense">
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "hsl(var(--expense))" }}>Gastos</span>
            <p className="text-lg font-black mt-1" style={{ color: "hsl(var(--expense))" }}>
              -{formatCurrency(expense, "ARS", true)}
            </p>
          </div>
          <div className="p-3.5 rounded-xl glass">
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "hsl(var(--muted-foreground))" }}>Flujo neto</span>
            <p className="text-lg font-black mt-1" style={{ color: net >= 0 ? "hsl(var(--income))" : "hsl(var(--expense))" }}>
              {net >= 0 ? "+" : ""}{formatCurrency(Math.abs(net), "ARS", true)}
            </p>
          </div>
          <div className="p-3.5 rounded-xl glass">
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "hsl(var(--muted-foreground))" }}>vs mes anterior</span>
            <p className="text-lg font-black mt-1" style={{ color: expenseDiff > 0 ? "hsl(var(--expense))" : "hsl(var(--income))" }}>
              {expenseDiff > 0 ? "+" : ""}{Math.round(expenseDiff)}%
            </p>
          </div>
        </div>

        {/* Avoidable spend alert */}
        {unnecessarySpend > 0 && (
          <div
            className="flex items-center gap-3 p-3.5 rounded-xl animate-slide-up"
            style={{
              background: "linear-gradient(135deg, hsl(var(--warning) / 0.1), transparent)",
              border: "1px solid hsl(var(--warning) / 0.3)",
            }}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "hsl(var(--warning))" }} />
            <div>
              <p className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>
                Gastos evitables: {formatCurrency(unnecessarySpend, "ARS", true)}
              </p>
              <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                Gastos marcados como "opcionales" o "prescindibles" que podrías haber ahorrado este mes.
              </p>
            </div>
          </div>
        )}

        {/* Filters & Search */}
        <div className="space-y-3 animate-slide-up">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por descripción o categoría..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-card border border-white/10 text-foreground outline-none focus:border-primary placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Type filters */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-card border border-white/10">
              {(["all", "expense", "income"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterType === t
                      ? "bg-primary text-black font-extrabold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "all" ? "Todos" : t === "expense" ? "Gastos" : "Ingresos"}
                </button>
              ))}
            </div>

            {/* Urgency filters */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-card border border-white/10 overflow-x-auto max-w-full">
              <button
                onClick={() => setFilterUrgency("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterUrgency === "all"
                    ? "bg-white/15 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Todas las urgencias
              </button>
              {Object.entries(URGENCY_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setFilterUrgency(filterUrgency === key ? "all" : key)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    filterUrgency === key
                      ? "border text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  style={filterUrgency === key ? { background: cfg.bg, borderColor: cfg.color, color: cfg.color } : {}}
                >
                  <span>{cfg.emoji}</span>
                  <span className="hidden sm:inline">{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline by day */}
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : sortedDays.length === 0 ? (
          <div className="p-12 text-center rounded-2xl glass">
            <p className="text-base font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>
              Sin movimientos este mes
            </p>
            <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
              Registrá gastos desde el dashboard o el chat IA
            </p>
          </div>
        ) : (
          <div className="space-y-4 animate-slide-up">
            {sortedDays.map((day) => {
              const dayTxs = grouped[day];
              const dayTotal = dayTxs.reduce((sum, t) => t.type === "expense" ? sum - t.amount : sum + t.amount, 0);
              const dayDate = new Date(day + "T12:00:00");
              const dayLabel = dayDate.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });

              return (
                <div key={day}>
                  {/* Day header */}
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-xs font-bold uppercase tracking-wide capitalize" style={{ color: "hsl(var(--muted-foreground))" }}>
                      {dayLabel}
                    </span>
                    <span
                      className="text-xs font-bold"
                      style={{ color: dayTotal >= 0 ? "hsl(var(--income))" : "hsl(var(--expense))" }}
                    >
                      {dayTotal >= 0 ? "+" : ""}{formatCurrency(Math.abs(dayTotal), "ARS", true)}
                    </span>
                  </div>

                  {/* Transactions list */}
                  <div className="rounded-xl overflow-hidden" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.4)" }}>
                    {dayTxs.map((t, i) => {
                      const isIncome = t.type === "income";
                      const isTransfer = t.type === "transfer";
                      const Icon = isTransfer ? ArrowLeftRight : isIncome ? TrendingUp : TrendingDown;
                      const color = isTransfer ? "hsl(var(--warning))" : isIncome ? "hsl(var(--income))" : "hsl(var(--expense))";
                      const urgencyInfo = t.urgency ? URGENCY_CONFIG[t.urgency] : null;

                      return (
                        <div
                          key={t.id}
                          className="flex items-center gap-3 px-3.5 py-3 transition-all"
                          style={i < dayTxs.length - 1 ? { borderBottom: "1px solid hsl(var(--border) / 0.3)" } : {}}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{
                              background: isTransfer ? "hsl(var(--warning-muted))" : isIncome ? "hsl(var(--income-muted))" : "hsl(var(--expense-muted))",
                            }}
                          >
                            <Icon className="w-4 h-4" style={{ color }} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: "hsl(var(--foreground))" }}>
                              {t.description || t.category?.name || "Sin descripción"}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {urgencyInfo && (
                                <span
                                  className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                  style={{ background: urgencyInfo.bg, color: urgencyInfo.color }}
                                >
                                  {urgencyInfo.emoji} {urgencyInfo.label}
                                </span>
                              )}
                              {t.category && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${t.category.color || "#6366F1"}20`, color: t.category.color || "#6366F1" }}>
                                  {t.category.name}
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-sm font-extrabold flex-shrink-0" style={{ color }}>
                            {isIncome ? "+" : isTransfer ? "" : "-"}{formatCurrency(t.amount, t.currency, true)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </FreemiumGate>
  );
}
