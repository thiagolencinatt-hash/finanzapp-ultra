"use client";

import { useState, useEffect } from "react";
import { Loader2, DollarSign, Calendar, CheckCircle2, Sparkles, AlertCircle } from "lucide-react";
import { DraggableWindow } from "../ui/DraggableWindow";

interface SalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentSalary?: number;
  currentPayDay?: number;
}

export function SalaryModal({
  isOpen,
  onClose,
  onSuccess,
  currentSalary = 980000,
  currentPayDay = 5,
}: SalaryModalProps) {
  const [salary, setSalary] = useState(String(currentSalary || ""));
  const [payDay, setPayDay] = useState(String(currentPayDay || "5"));
  const [alsoUpdateBalance, setAlsoUpdateBalance] = useState(true);
  const [clearExpenses, setClearExpenses] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (currentSalary) setSalary(String(currentSalary));
    if (currentPayDay) setPayDay(String(currentPayDay));
  }, [currentSalary, currentPayDay]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!salary || parseFloat(salary) <= 0) {
      setError("Por favor ingresá el monto de tu sueldo");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/finances/quick-adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_salary",
          salaryAmount: parseFloat(salary),
          payDay: parseInt(payDay) || 5,
          alsoUpdateBalance,
        }),
      });

      if (!res.ok) throw new Error("Error al guardar sueldo");

      if (clearExpenses) {
        await fetch("/api/finances/quick-adjust", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "clear_expenses" }),
        });
      }

      setSuccessMsg("¡Sueldo e ingresos actualizados correctamente!");
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
      title="Configurar Mi Sueldo & Ingresos"
      windowId="salary-config-modal"
      defaultPosition={{ x: 0, y: -40 }}
      footer={
        <div className="flex w-full gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl text-xs font-bold btn-3d-secondary">
            Cancelar
          </button>
          <button
            type="submit"
            form="salary-modal-form"
            disabled={loading}
            className="flex-1 py-3 rounded-xl text-xs font-bold text-black gradient-primary btn-3d flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : "Guardar mi Sueldo"}
          </button>
        </div>
      }
    >
      <form id="salary-modal-form" onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
        <div className="rounded-xl p-3 bg-income/10 border border-income/30 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-income shrink-0 mt-0.5" />
          <p className="text-xs text-foreground leading-relaxed">
            Configurá tu <strong>sueldo mensual</strong> para que tus ingresos siempre estén actualizados con el dinero real que cobrás.
          </p>
        </div>

        {/* Sueldo Input */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 text-income">
            ¿Cuánto cobrás de sueldo / ingreso mensual?
          </label>
          <div className="relative">
            <DollarSign className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-income font-bold" />
            <input
              type="number"
              step="any"
              min="0"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder="Ej: 850000"
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl text-xl font-black outline-none bg-black/20 border border-income/50 focus:border-income focus:ring-1 focus:ring-income transition-all text-income"
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Este monto será tu ingreso mensual asegurado.</p>
        </div>

        {/* Día de cobro */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5 opacity-80">
            Día habitual de cobro del mes
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select
              value={payDay}
              onChange={(e) => setPayDay(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm font-semibold outline-none bg-black/10 border border-white/10 cursor-pointer"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d} className="bg-neutral-900">
                  Día {d} de cada mes
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Opciones adicionales */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={alsoUpdateBalance}
              onChange={(e) => setAlsoUpdateBalance(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded accent-primary cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-bold text-foreground">Acreditar a mi saldo actual de la cuenta</span>
              <p className="text-muted-foreground text-[11px]">
                Marcá esto si ya tenés esta plata en tu cuenta ahora mismo.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={clearExpenses}
              onChange={(e) => setClearExpenses(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded accent-primary cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-bold text-foreground">Dejar mis gastos en $0 (No tengo gastos este mes)</span>
              <p className="text-muted-foreground text-[11px]">
                Borra los gastos de prueba ficticios para arrancar sin restar nada.
              </p>
            </div>
          </label>
        </div>

        {error && (
          <div className="text-xs font-medium rounded-xl p-3 bg-red-900/30 text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {successMsg && (
          <div className="text-xs font-bold rounded-xl p-3 bg-income/20 text-income flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {successMsg}
          </div>
        )}
      </form>
    </DraggableWindow>
  );
}
