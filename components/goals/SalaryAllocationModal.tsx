"use client";

import { useState, useEffect } from "react";
import { Loader2, Briefcase, CheckCircle2, DollarSign, Target, Sparkles, AlertCircle } from "lucide-react";
import { DraggableWindow } from "../ui/DraggableWindow";
import type { SavingsGoal } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/currency";

interface SalaryAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  goals: SavingsGoal[];
  salary?: number;
}

export function SalaryAllocationModal({
  isOpen,
  onClose,
  onSuccess,
  goals,
  salary = 980000,
}: SalaryAllocationModalProps) {
  const [allocations, setAllocations] = useState<Record<string, { amount: string; priority: number }>>({});
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const init: Record<string, { amount: string; priority: number }> = {};
    goals.forEach((g) => {
      init[g.id] = {
        amount: String(g.monthly_contribution || 0),
        priority: g.priority || 2,
      };
    });
    setAllocations(init);
  }, [goals]);

  const totalAllocated = Object.values(allocations).reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0),
    0
  );

  const remainingSalary = Math.max(0, salary - totalAllocated);
  const percentAllocated = salary > 0 ? Math.min(100, Math.round((totalAllocated / salary) * 100)) : 0;

  function handleSetPercent(goalId: string, percent: number) {
    const amount = Math.round((salary * percent) / 100);
    setAllocations((prev) => ({
      ...prev,
      [goalId]: {
        ...prev[goalId],
        amount: String(amount),
      },
    }));
  }

  function handleAmountChange(goalId: string, val: string) {
    setAllocations((prev) => ({
      ...prev,
      [goalId]: {
        ...prev[goalId],
        amount: val,
      },
    }));
  }

  function handlePriorityChange(goalId: string, priority: number) {
    setAllocations((prev) => ({
      ...prev,
      [goalId]: {
        ...prev[goalId],
        priority,
      },
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const payload = Object.entries(allocations).map(([id, item]) => ({
        id,
        monthly_contribution: parseFloat(item.amount) || 0,
        priority: item.priority,
      }));

      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "distribute_salary",
          allocations: payload,
        }),
      });

      if (!res.ok) throw new Error("Error al guardar distribución");
      setSuccessMsg("¡Ahorro mensual distribuido con éxito!");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 600);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DraggableWindow
      isOpen={isOpen}
      onClose={onClose}
      title="Organizar y Asignar Sueldo a Metas"
      windowId="salary-allocation-modal"
      defaultPosition={{ x: 0, y: -40 }}
      footer={
        <div className="flex w-full gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl text-xs font-bold btn-3d-secondary">
            Cancelar
          </button>
          <button
            type="submit"
            form="salary-allocation-form"
            disabled={loading}
            className="flex-1 py-3 rounded-xl text-xs font-bold text-black gradient-primary btn-3d flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : "Guardar Asignaciones"}
          </button>
        </div>
      }
    >
      <form id="salary-allocation-form" onSubmit={handleSave} className="space-y-4 animate-fade-in">
        {/* Banner de Sueldo y Distribución */}
        <div className="rounded-2xl p-4 glass-strong border border-primary/40 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Sueldo Mensual Base
              </span>
            </div>
            <span className="text-base font-black text-foreground">{formatCurrency(salary, "ARS", true)}</span>
          </div>

          {/* Progress bar de asignación */}
          <div className="space-y-1.5 mt-2">
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-income">Destinado a Ahorro: {formatCurrency(totalAllocated, "ARS", true)} ({percentAllocated}%)</span>
              <span className="text-muted-foreground">Disponible para gastos: {formatCurrency(remainingSalary, "ARS", true)}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${percentAllocated}%`,
                  background: percentAllocated > 90 ? "hsl(var(--warning))" : "hsl(var(--income))",
                }}
              />
            </div>
          </div>
        </div>

        {/* Lista de Metas para Asignación */}
        <div className="space-y-3 max-h-[45vh] overflow-y-auto custom-scrollbar pr-1">
          {goals.length === 0 ? (
            <p className="text-xs text-center py-6 text-muted-foreground">
              No tenés metas creadas todavía. Creá una para empezar a asignar tu sueldo.
            </p>
          ) : (
            goals.map((goal) => {
              const currentAlloc = allocations[goal.id] || { amount: "0", priority: 2 };
              const monthlyAmount = parseFloat(currentAlloc.amount) || 0;
              const remainingToGoal = Math.max(0, goal.target_amount - (goal.current_amount || 0));
              const monthsToComplete = monthlyAmount > 0 ? Math.ceil(remainingToGoal / monthlyAmount) : null;

              return (
                <div
                  key={goal.id}
                  className="rounded-2xl p-3.5 bg-black/20 border border-white/10 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shadow"
                        style={{ background: `${goal.color}30`, color: goal.color }}
                      >
                        <Target className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground truncate max-w-[180px]">{goal.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Objetivo: {formatCurrency(goal.target_amount, goal.currency, true)} (Faltan {formatCurrency(remainingToGoal, goal.currency, true)})
                        </p>
                      </div>
                    </div>

                    {/* Selector de Prioridad */}
                    <select
                      value={currentAlloc.priority}
                      onChange={(e) => handlePriorityChange(goal.id, parseInt(e.target.value))}
                      className="text-[11px] font-bold px-2 py-1 rounded-lg bg-white/5 border border-white/10 cursor-pointer outline-none"
                    >
                      <option value={1} className="bg-neutral-900">⭐ Prioridad Alta</option>
                      <option value={2} className="bg-neutral-900">Prioridad Media</option>
                      <option value={3} className="bg-neutral-900">Prioridad Baja</option>
                    </select>
                  </div>

                  {/* Input de Ahorro Mensual */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <DollarSign className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-income" />
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={currentAlloc.amount}
                        onChange={(e) => handleAmountChange(goal.id, e.target.value)}
                        placeholder="Monto por mes"
                        className="w-full pl-8 pr-3 py-2 rounded-xl text-sm font-bold bg-black/30 border border-white/10 focus:border-income outline-none text-income"
                      />
                    </div>

                    {/* Botones de % rápidos */}
                    <div className="flex gap-1">
                      {[10, 20, 30].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handleSetPercent(goal.id, pct)}
                          className="px-2 py-1.5 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-income/20 hover:text-income border border-white/10 transition-colors cursor-pointer"
                          title={`Asignar ${pct}% de tu sueldo`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Proyección de Meses */}
                  {monthsToComplete !== null && (
                    <p className="text-[10px] font-semibold text-income flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> ¡A este ritmo alcanzás la meta en {monthsToComplete} {monthsToComplete === 1 ? "mes" : "meses"}!
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {error && <p className="text-xs font-medium rounded-xl p-3 bg-red-900/30 text-red-400">{error}</p>}
        {successMsg && (
          <p className="text-xs font-bold rounded-xl p-3 bg-income/20 text-income flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {successMsg}
          </p>
        )}
      </form>
    </DraggableWindow>
  );
}
