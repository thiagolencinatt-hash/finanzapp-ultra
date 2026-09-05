"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PieChart, Plus, AlertCircle, CheckCircle2, Sliders, Trash2, X } from "lucide-react";
import type { CategoryBudget, Category } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/currency";

interface DashboardBudgetsSectionProps {
  budgets?: CategoryBudget[];
  categories?: Category[];
  onRefresh?: () => void;
}

export function DashboardBudgetsSection({
  budgets = [],
  categories = [],
  onRefresh,
}: DashboardBudgetsSectionProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [saving, setSaving] = useState(false);

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.monthly_limit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent_this_month || 0), 0);
  const overallPercent = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

  async function handleSaveBudget(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCatId || !monthlyLimit) return;
    setSaving(true);
    try {
      await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: selectedCatId,
          monthly_limit: Number(monthlyLimit),
          currency: "ARS",
        }),
      });
      setShowModal(false);
      setSelectedCatId("");
      setMonthlyLimit("");
      if (onRefresh) onRefresh();
    } catch {
      alert("Error al guardar presupuesto");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteBudget(id: string) {
    if (!confirm("¿Eliminar este límite de presupuesto?")) return;
    await fetch("/api/budgets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (onRefresh) onRefresh();
  }

  return (
    <div className="rounded-3xl p-5 lg:p-6 glass-strong shadow-xl relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-foreground tracking-tight">
              Presupuestos Mensuales
            </h3>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(totalSpent, "ARS", true)} gastados de {formatCurrency(totalBudgeted, "ARS", true)} presupuestados
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white gradient-primary cursor-pointer hover:opacity-90 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Fijar Presupuesto</span>
        </button>
      </div>

      {/* Barra de progreso global */}
      <div className="mb-6 p-4 rounded-2xl bg-card/60 border border-white/5 space-y-2">
        <div className="flex justify-between text-xs font-bold">
          <span className="text-muted-foreground">Ejecución Total del Mes</span>
          <span
            style={{
              color:
                overallPercent > 100
                  ? "#EF4444"
                  : overallPercent > 80
                  ? "#F59E0B"
                  : "#10B981",
            }}
          >
            {overallPercent}% consumido
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, overallPercent)}%` }}
            transition={{ duration: 0.6 }}
            className="h-full rounded-full"
            style={{
              background:
                overallPercent > 100
                  ? "linear-gradient(90deg, #EF4444, #DC2626)"
                  : overallPercent > 80
                  ? "linear-gradient(90deg, #F59E0B, #D97706)"
                  : "linear-gradient(90deg, #10B981, #059669)",
            }}
          />
        </div>
      </div>

      {/* Lista de presupuestos por categoría */}
      {budgets.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-xs">
          Aún no tienes presupuestos configurados. ¡Haz clic en &quot;Fijar Presupuesto&quot; para definir límites mensuales!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {budgets.map((b) => {
            const spent = b.spent_this_month || 0;
            const limit = b.monthly_limit;
            const pct = b.percentage || 0;
            const isOver = b.is_over_budget;
            const isWarn = pct >= 80 && !isOver;

            return (
              <div
                key={b.id}
                className="p-4 rounded-2xl bg-card/50 border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between gap-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: b.category?.color || "#6366F1" }}
                    />
                    <span className="text-sm font-bold text-foreground truncate">
                      {b.category?.name || "Categoría"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className="text-[11px] font-extrabold px-2 py-0.5 rounded-full"
                      style={{
                        background: isOver
                          ? "rgba(239, 68, 68, 0.15)"
                          : isWarn
                          ? "rgba(245, 158, 11, 0.15)"
                          : "rgba(16, 185, 129, 0.15)",
                        color: isOver ? "#EF4444" : isWarn ? "#F59E0B" : "#10B981",
                      }}
                    >
                      {pct}%
                    </span>
                    <button
                      onClick={() => handleDeleteBudget(b.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-red-400 cursor-pointer"
                      title="Eliminar límite"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Mini progress bar */}
                <div className="space-y-1">
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, pct)}%`,
                        background: isOver ? "#EF4444" : isWarn ? "#F59E0B" : "#10B981",
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">
                      Gastado:{" "}
                      <strong className="text-foreground">
                        {formatCurrency(spent, "ARS", true)}
                      </strong>
                    </span>
                    <span
                      className="font-bold"
                      style={{ color: isOver ? "#EF4444" : "hsl(var(--muted-foreground))" }}
                    >
                      {isOver
                        ? `Excedido por ${formatCurrency(spent - limit, "ARS", true)}`
                        : `Quedan ${formatCurrency(limit - spent, "ARS", true)}`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para agregar/editar presupuesto */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl glass-strong border border-white/10 p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-extrabold text-foreground">
                Fijar Presupuesto Mensual
              </h4>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                  Categoría
                </label>
                <select
                  required
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-white/10 text-sm text-foreground outline-none focus:border-primary"
                >
                  <option value="">Selecciona una categoría...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type === "expense" ? "Gasto" : "Ingreso"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                  Límite Máximo Mensual ($ ARS)
                </label>
                <input
                  type="number"
                  required
                  min="1000"
                  step="500"
                  placeholder="ej. 120000"
                  value={monthlyLimit}
                  onChange={(e) => setMonthlyLimit(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-white/10 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:bg-white/5 border border-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white gradient-primary"
                >
                  {saving ? "Guardando..." : "Guardar Límite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
