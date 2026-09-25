"use client";

import { useState } from "react";
import { Target, Plus, SlidersHorizontal, Trash2, CheckCircle2, DollarSign, Sparkles } from "lucide-react";
import type { SavingsGoal } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/currency";
import { GoalForm } from "@/components/goals/GoalForm";
import { SalaryAllocationModal } from "@/components/goals/SalaryAllocationModal";

interface DashboardGoalsSectionProps {
  goals: SavingsGoal[];
  salary?: number;
  onRefresh: () => void;
}

export function DashboardGoalsSection({
  goals = [],
  salary = 980000,
  onRefresh,
}: DashboardGoalsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [showAllocModal, setShowAllocModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);

  const activeGoals = goals.filter((g) => g.type === "goal");
  const totalTarget = activeGoals.reduce((s, g) => s + g.target_amount, 0);
  const totalSaved = activeGoals.reduce((s, g) => s + (g.current_amount || 0), 0);
  const totalMonthlyContribution = activeGoals.reduce((s, g) => s + (g.monthly_contribution || 0), 0);

  async function handleAddFunds(id: string, amount: number) {
    await fetch("/api/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "add_funds", amount }),
    });
    onRefresh();
  }

  async function handleClearAll() {
    if (!confirm("¿Deseas eliminar todas las metas para empezar en limpio con tus propias metas?")) return;
    await fetch("/api/goals", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear_all" }),
    });
    onRefresh();
  }

  return (
    <>
      <div
        className="rounded-3xl p-5 lg:p-6 glass shadow-xl space-y-4"
        style={{ border: "1px solid hsl(var(--border) / 0.5)" }}
      >
        {/* Header de la sección */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-income/20 text-income flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-foreground">
                Metas & Ahorros con Sueldo
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Destiná parte de tu sueldo mensual a tus metas personales
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {activeGoals.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setShowAllocModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-black gradient-primary btn-3d cursor-pointer"
                  title="Configurar qué porcentaje de tu sueldo va a cada meta"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-black" />
                  <span>Distribuir Sueldo</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearAll}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold text-red-400 bg-red-950/30 hover:bg-red-900/40 border border-red-800/30 cursor-pointer transition-all"
                  title="Borrar todas las metas"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Borrar Todo</span>
                </button>
              </>
            )}

            <button
              onClick={() => {
                setSelectedGoal(null);
                setShowForm(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-income bg-income/10 hover:bg-income/20 border border-income/30 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Meta</span>
            </button>
          </div>
        </div>

        {/* Content */}
        {activeGoals.length === 0 ? (
          <div className="rounded-2xl p-8 text-center border-2 border-dashed border-white/10 bg-black/10">
            <Target className="w-10 h-10 mx-auto mb-2 opacity-30 text-income" />
            <p className="text-sm font-bold text-foreground">Sin metas de ahorro creadas</p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Creá tu primera meta (Fondo de emergencia, vacaciones, auto) y asignale una parte de tu sueldo.
            </p>
            <button
              onClick={() => {
                setSelectedGoal(null);
                setShowForm(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-black gradient-primary btn-3d cursor-pointer"
            >
              + Crear mi primera meta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activeGoals.map((goal) => {
              const current = goal.current_amount || 0;
              const target = goal.target_amount || 1;
              const percent = Math.min(100, Math.round((current / target) * 100));
              const remaining = Math.max(0, target - current);
              const monthly = goal.monthly_contribution || 0;
              const monthsLeft = monthly > 0 ? Math.ceil(remaining / monthly) : null;

              return (
                <div
                  key={goal.id}
                  className="rounded-2xl p-4 bg-black/25 border border-white/10 flex flex-col justify-between hover:border-income/40 transition-all group relative"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
                          style={{ background: `${goal.color || "#10B981"}25`, color: goal.color || "#10B981" }}
                        >
                          <Target className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{goal.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatCurrency(current, goal.currency, true)} de {formatCurrency(target, goal.currency, true)}
                          </p>
                        </div>
                      </div>

                      <span
                        className="text-[10px] font-black px-2 py-0.5 rounded-full"
                        style={{ background: `${goal.color || "#10B981"}20`, color: goal.color || "#10B981" }}
                      >
                        {percent}%
                      </span>
                    </div>

                    {/* Barra de progreso */}
                    <div className="mt-3 space-y-1">
                      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${percent}%`,
                            background: goal.color || "hsl(var(--income))",
                          }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-0.5">
                        <span>
                          {monthly > 0 ? `Aporte: ${formatCurrency(monthly, goal.currency, true)}/mes` : "Sin aporte mensual"}
                        </span>
                        {monthsLeft !== null && (
                          <span className="text-income font-bold flex items-center gap-0.5">
                            <Sparkles className="w-3 h-3" /> Faltan {monthsLeft} {monthsLeft === 1 ? "mes" : "meses"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Acciones rápidas de sumar plata a la meta */}
                  <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-white/5 flex-wrap">
                    <span className="text-[10px] text-muted-foreground font-semibold mr-1">Sumar ahorro:</span>
                    {[20000, 50000, 100000].map((amt) => (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => handleAddFunds(goal.id, amt)}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-income/20 hover:text-income border border-white/10 transition-colors cursor-pointer"
                        title={`Sumar +$${amt.toLocaleString("es-AR")} ahorrados a esta meta`}
                      >
                        +${(amt / 1000).toFixed(0)}k
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGoal(goal);
                        setShowForm(true);
                      }}
                      className="ml-auto text-[10px] font-bold text-primary hover:underline cursor-pointer"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <GoalForm
          isOpen={showForm}
          defaultType="goal"
          goal={selectedGoal}
          onClose={() => {
            setShowForm(false);
            setSelectedGoal(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setSelectedGoal(null);
            onRefresh();
          }}
        />
      )}

      {showAllocModal && (
        <SalaryAllocationModal
          isOpen={showAllocModal}
          goals={activeGoals}
          salary={salary}
          onClose={() => setShowAllocModal(false)}
          onSuccess={() => {
            setShowAllocModal(false);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
