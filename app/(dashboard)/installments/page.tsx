"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { InstallmentCard } from "@/components/installments/InstallmentCard";
import { InstallmentForm } from "@/components/installments/InstallmentForm";
import { FutureProjection } from "@/components/installments/FutureProjection";
import { InstallmentCalculator } from "@/components/installments/InstallmentCalculator";
import { Plus, CreditCard, TrendingDown, Calculator, Calendar, Trash2 } from "lucide-react";
import type { Installment } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/currency";
import { FreemiumGate } from "@/components/ui/FreemiumGate";

export default function InstallmentsPage() {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "projection" | "calculator">("active");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/installments?active=true");
      setInstallments(res.ok ? await res.json() : []);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const monthlyTotal = installments.reduce((s, i) => s + i.installment_amount, 0);
  const withInterest = installments.filter((i) => i.has_interest);
  const withoutInterest = installments.filter((i) => !i.has_interest);

  async function handlePay(id: string) {
    await fetch("/api/installments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "pay" }),
    });
    load();
  }

  async function handleClearAll() {
    if (!confirm("¿Deseas eliminar TODAS las cuotas para empezar en limpio con tus cuotas reales?")) return;
    await fetch("/api/installments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear_all" }),
    });
    load();
  }

  return (
    <FreemiumGate action="manage_installments">
    <div className="flex flex-col">
      <Header
        title="Cuotas y Deudas"
        subtitle={`${installments.length} activas • ${formatCurrency(monthlyTotal, "ARS", true)}/mes`}
      />

      <div className="flex-1 p-4 lg:p-6 space-y-6">
        {/* Summary bar */}
        {installments.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-3xl p-4.5 gradient-expense border border-expense/30 shadow-lg">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-expense" />
                <span className="text-xs font-bold text-expense">Total Comprometido por Mes</span>
              </div>
              <p className="text-2xl font-black text-foreground">
                {formatCurrency(monthlyTotal, "ARS", true)}
              </p>
            </div>

            <div className="rounded-3xl p-4.5 glass border border-white/10 shadow-lg">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-muted-foreground">Distribución de Cuotas</span>
              </div>
              <p className="text-sm font-extrabold text-foreground mt-1">
                {withoutInterest.length} sin interés • {withInterest.length} con interés
              </p>
            </div>

            <div className="rounded-3xl p-4.5 glass border border-white/10 shadow-lg flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-muted-foreground">Gestión Rápida</span>
                <p className="text-xs text-muted-foreground mt-0.5">Vaciar cuotas de prueba</p>
              </div>
              <button
                onClick={handleClearAll}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-400 bg-red-950/40 hover:bg-red-900/50 border border-red-800/40 flex items-center gap-1.5 cursor-pointer transition-all"
                title="Borrar todas las cuotas de prueba"
              >
                <Trash2 className="w-3.5 h-3.5" /> Borrar Todo
              </button>
            </div>
          </div>
        )}

        {/* Tabs & Toolbar */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "active", label: `Cuotas activas (${installments.length})`, icon: CreditCard },
              { key: "projection", label: "Proyección futura", icon: Calendar },
              { key: "calculator", label: "Calculadora vs Inflación", icon: Calculator },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as "active" | "projection" | "calculator")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === t.key ? "gradient-primary text-black shadow-md" : "btn-3d-secondary"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {installments.length === 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-400 bg-red-950/40 border border-red-800/40 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Limpiar
              </button>
            )}

            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-black gradient-primary btn-3d cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Nueva Cuota
            </button>
          </div>
        </div>

        {activeTab === "active" &&
          (loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="rounded-3xl h-40 animate-pulse glass" />
              ))}
            </div>
          ) : installments.length === 0 ? (
            <div
              className="rounded-3xl p-12 text-center border-2 border-dashed glass shadow-lg"
              style={{ borderColor: "hsl(var(--border) / 0.5)", color: "hsl(var(--muted-foreground))" }}
            >
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30 text-warning" />
              <p className="text-base font-bold text-foreground mb-1">Sin cuotas ni deudas registradas</p>
              <p className="text-xs opacity-70 mb-4">
                ¡Excelente! No tenés cuotas activas que resten de tu sueldo mensual.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="px-5 py-3 rounded-xl text-xs font-bold text-black gradient-primary btn-3d cursor-pointer"
              >
                Registrar una cuota
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {installments.map((inst) => (
                <InstallmentCard
                  key={inst.id}
                  installment={inst}
                  onPay={() => handlePay(inst.id)}
                  onRefresh={load}
                />
              ))}
            </div>
          ))}

        {activeTab === "projection" && <FutureProjection installments={installments} />}

        {activeTab === "calculator" && <InstallmentCalculator />}
      </div>

      {showForm && (
        <InstallmentForm
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
    </FreemiumGate>
  );
}
