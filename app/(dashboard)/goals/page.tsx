"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalForm } from "@/components/goals/GoalForm";
import { SalaryAllocationModal } from "@/components/goals/SalaryAllocationModal";
import { Plus, Target, ShoppingBag, Trash2, SlidersHorizontal, Briefcase } from "lucide-react";
import type { SavingsGoal } from "@/lib/types";
import { FreemiumGate } from "@/components/ui/FreemiumGate";

export default function GoalsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [wishlist, setWishlist] = useState<SavingsGoal[]>([]);
  const [salary, setSalary] = useState(980000);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSalaryAlloc, setShowSalaryAlloc] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [defaultType, setDefaultType] = useState<"goal" | "wishlist">("goal");
  const [activeTab, setActiveTab] = useState<"goals" | "wishlist">("goals");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [resGoals, resSummary] = await Promise.all([
        fetch("/api/goals"),
        fetch("/api/summary"),
      ]);

      const all: SavingsGoal[] = resGoals.ok ? await resGoals.json() : [];
      setGoals(all.filter((g) => g.type === "goal"));
      setWishlist(all.filter((g) => g.type === "wishlist"));

      if (resSummary.ok) {
        const sum = await resSummary.json();
        if (sum.configured_salary) setSalary(sum.configured_salary);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openForm(type: "goal" | "wishlist", goalToEdit?: SavingsGoal) {
    setDefaultType(type);
    setSelectedGoal(goalToEdit || null);
    setShowForm(true);
  }

  async function handleAddFunds(id: string, amount: number) {
    await fetch("/api/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "add_funds", amount }),
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta meta?")) return;
    await fetch("/api/goals", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  async function handleClearAll() {
    if (!confirm("¿Deseas eliminar TODAS las metas de ahorro y wishlist para empezar en limpio con tus propias metas?")) return;
    await fetch("/api/goals", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear_all" }),
    });
    load();
  }

  const currentList = activeTab === "goals" ? goals : wishlist;
  const totalTarget = currentList.reduce((s, g) => s + g.target_amount, 0);
  const totalSaved = currentList.reduce((s, g) => s + (g.current_amount || 0), 0);
  const totalMonthlySavings = goals.reduce((s, g) => s + (g.monthly_contribution || 0), 0);

  return (
    <FreemiumGate action="manage_goals">
    <div className="flex flex-col">
      <Header
        title="Metas y Ahorros"
        subtitle={`${goals.length} metas activas • ${wishlist.length} en wishlist`}
      />

      <div className="flex-1 p-4 lg:p-6 space-y-6">
        {/* Banner de resumen y asignador de sueldo */}
        {goals.length > 0 && (
          <div className="rounded-3xl p-5 lg:p-6 glass-strong shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-income/30">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="w-4 h-4 text-income" />
                <span className="text-xs font-bold uppercase tracking-wider text-income">
                  Plan de Ahorro con Mi Sueldo
                </span>
              </div>
              <p className="text-lg font-black text-foreground">
                Ahorro mensual comprometido: <span className="text-income">${totalMonthlySavings.toLocaleString("es-AR")}</span> / mes
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Total acumulado en metas: ${totalSaved.toLocaleString("es-AR")} de ${totalTarget.toLocaleString("es-AR")}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowSalaryAlloc(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-black gradient-primary btn-3d cursor-pointer"
                title="Distribuir tu sueldo entre varias metas según prioridad"
              >
                <SlidersHorizontal className="w-4 h-4 text-black" />
                <span>Distribuir Sueldo en Metas</span>
              </button>

              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-red-400 bg-red-950/40 hover:bg-red-900/50 border border-red-800/40 cursor-pointer transition-all"
                title="Borrar todas las metas de prueba"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Borrar Todo</span>
              </button>
            </div>
          </div>
        )}

        {/* Toolbar & Tabs */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("goals")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "goals" ? "gradient-primary text-black shadow-md" : "btn-3d-secondary"
              }`}
            >
              <Target className="w-4 h-4" /> Metas de Ahorro ({goals.length})
            </button>
            <button
              onClick={() => setActiveTab("wishlist")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "wishlist" ? "gradient-primary text-black shadow-md" : "btn-3d-secondary"
              }`}
            >
              <ShoppingBag className="w-4 h-4" /> Wishlist ({wishlist.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {currentList.length === 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-400 bg-red-950/40 border border-red-800/40 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Limpiar
              </button>
            )}

            <button
              onClick={() => openForm(activeTab === "goals" ? "goal" : "wishlist")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-black gradient-primary btn-3d cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Nueva {activeTab === "goals" ? "Meta" : "Wishlist"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-3xl h-44 animate-pulse glass" />
            ))}
          </div>
        ) : currentList.length === 0 ? (
          <div
            className="rounded-3xl p-12 text-center border-2 border-dashed glass shadow-lg"
            style={{ borderColor: "hsl(var(--border) / 0.5)", color: "hsl(var(--muted-foreground))" }}
          >
            {activeTab === "goals" ? (
              <>
                <Target className="w-12 h-12 mx-auto mb-3 opacity-30 text-income" />
                <p className="text-base font-bold text-foreground mb-1">Sin metas de ahorro creadas</p>
                <p className="text-xs opacity-70 mb-4">
                  Creá tus propias metas personales y configurá cuánto de tu sueldo querés destinarles.
                </p>
              </>
            ) : (
              <>
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30 text-primary" />
                <p className="text-base font-bold text-foreground mb-1">Tu Wishlist está vacía</p>
                <p className="text-xs opacity-70 mb-4">Anotá los gustos y compras que querés darte a futuro.</p>
              </>
            )}
            <button
              onClick={() => openForm(activeTab === "goals" ? "goal" : "wishlist")}
              className="px-5 py-3 rounded-xl text-xs font-bold text-black gradient-primary btn-3d cursor-pointer"
            >
              {activeTab === "goals" ? "Crear mi primera meta" : "Agregar a wishlist"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentList.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onAddFunds={(amount) => handleAddFunds(goal.id, amount)}
                onDelete={() => handleDelete(goal.id)}
                onRefresh={load}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <GoalForm
          isOpen={showForm}
          defaultType={defaultType}
          goal={selectedGoal}
          onClose={() => {
            setShowForm(false);
            setSelectedGoal(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setSelectedGoal(null);
            load();
          }}
        />
      )}

      {showSalaryAlloc && (
        <SalaryAllocationModal
          isOpen={showSalaryAlloc}
          goals={goals}
          salary={salary}
          onClose={() => setShowSalaryAlloc(false)}
          onSuccess={() => {
            setShowSalaryAlloc(false);
            load();
          }}
        />
      )}
    </div>
    </FreemiumGate>
  );
}
