"use client";

import { useState } from "react";
import { CreditCard, Plus, Trash2, CheckCircle2, Calendar, TrendingDown } from "lucide-react";
import type { Installment } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/currency";
import { InstallmentForm } from "@/components/installments/InstallmentForm";

interface DashboardInstallmentsSectionProps {
  installments: Installment[];
  monthlyTotal: number;
  onRefresh: () => void;
}

export function DashboardInstallmentsSection({
  installments = [],
  monthlyTotal = 0,
  onRefresh,
}: DashboardInstallmentsSectionProps) {
  const [showForm, setShowForm] = useState(false);

  async function handlePay(id: string) {
    await fetch("/api/installments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "pay" }),
    });
    onRefresh();
  }

  async function handleClearAll() {
    if (!confirm("¿Deseas eliminar todas las compras en cuotas para empezar en limpio?")) return;
    await fetch("/api/installments", {
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-warning/20 text-warning flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-foreground">
                Compras en Cuotas & Tarjetas
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {installments.length > 0
                ? `${installments.length} compras activas • ${formatCurrency(monthlyTotal, "ARS", true)} comprometido por mes`
                : "Control de pagos en cuotas mensuales"}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {installments.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold text-red-400 bg-red-950/30 hover:bg-red-900/40 border border-red-800/30 cursor-pointer transition-all"
                title="Borrar todas las cuotas"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Borrar Todo</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-warning bg-warning/10 hover:bg-warning/20 border border-warning/30 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Cuota</span>
            </button>
          </div>
        </div>

        {/* List */}
        {installments.length === 0 ? (
          <div className="rounded-2xl p-8 text-center border-2 border-dashed border-white/10 bg-black/10">
            <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30 text-warning" />
            <p className="text-sm font-bold text-foreground">Sin cuotas ni deudas registradas</p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              ¡Excelente! No tenés pagos mensuales pendientes que resten de tu sueldo.
            </p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-black gradient-primary btn-3d cursor-pointer"
            >
              + Registrar una compra en cuotas
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {installments.map((inst) => {
              const paid = inst.paid_installments || 0;
              const total = inst.total_installments || 1;
              const pct = Math.min(100, Math.round((paid / total) * 100));

              return (
                <div
                  key={inst.id}
                  className="rounded-2xl p-4 bg-black/25 border border-white/10 flex flex-col justify-between hover:border-warning/40 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-foreground truncate max-w-[200px]">
                          {inst.description}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {inst.account?.name || "Tarjeta"} • Día {inst.due_day} de vencimiento
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-black text-warning">
                          {formatCurrency(inst.installment_amount, inst.currency, true)}
                        </p>
                        <span className="text-[10px] text-muted-foreground">por cuota</span>
                      </div>
                    </div>

                    {/* Barra de progreso de cuotas */}
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                        <span>
                          Cuota {paid} de {total} ({total - paid} restantes)
                        </span>
                        <span className="text-primary font-bold">{pct}% pagado</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-warning transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/5">
                    <span className="text-[10px] text-muted-foreground">
                      Total: {formatCurrency(inst.total_amount, inst.currency, true)}
                    </span>

                    <button
                      type="button"
                      onClick={() => handlePay(inst.id)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-income/20 hover:text-income border border-white/10 transition-colors cursor-pointer flex items-center gap-1"
                      title="Registrar pago de 1 cuota"
                    >
                      <CheckCircle2 className="w-3 h-3 text-income" />
                      <span>Marcar 1 cuota paga</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <InstallmentForm
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
