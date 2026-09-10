"use client";

import { useState } from "react";
import { Loader2, Sparkles, Trash2, CheckCircle2, DollarSign, Wallet, Briefcase } from "lucide-react";
import { DraggableWindow } from "../ui/DraggableWindow";

interface QuickFinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentBalance?: number;
  currentIncome?: number;
  currentExpense?: number;
}

export function QuickFinanceModal({
  isOpen,
  onClose,
  onSuccess,
  currentBalance = 0,
  currentIncome = 0,
}: QuickFinanceModalProps) {
  const [balance, setBalance] = useState(String(currentBalance || ""));
  const [salary, setSalary] = useState(String(currentIncome || ""));
  const [clearExpenses, setClearExpenses] = useState(true);
  const [accountName, setAccountName] = useState("Billetera Principal");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");

  async function handleSaveDirect(e: React.FormEvent) {
    e.preventDefault();
    if (!balance && !salary) {
      setError("Por favor ingresá al menos cuánta plata tenés o tu sueldo.");
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
          action: "set_cash",
          totalBalance: balance ? parseFloat(balance) : 0,
          monthlyIncome: salary ? parseFloat(salary) : undefined,
          accountName: accountName || "Mi Billetera Principal",
          clearExpenses,
        }),
      });

      if (!res.ok) throw new Error("Error al guardar montos");
      setSuccessMsg("¡Tus números fueron actualizados exitosamente!");
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

  async function handleResetClean() {
    if (!confirm("¿Deseas vaciar todos los gastos de prueba y arrancar de cero con tu dinero real?")) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/finances/quick-adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_clean",
          totalBalance: balance ? parseFloat(balance) : 0,
          accountName: accountName || "Mi Billetera Principal",
        }),
      });
      if (!res.ok) throw new Error("Error al reiniciar");
      setSuccessMsg("¡Cuenta limpia creada!");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 600);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al reiniciar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DraggableWindow
      isOpen={isOpen}
      onClose={onClose}
      title="Ajustar Mi Plata y Mi Sueldo"
      windowId="quick-finance-modal"
      defaultPosition={{ x: 0, y: -40 }}
      footer={
        <div className="flex w-full gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleResetClean}
            disabled={loading}
            className="flex-1 py-3 px-3 rounded-xl text-xs font-bold text-red-400 bg-red-950/40 hover:bg-red-900/50 border border-red-800/40 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            title="Borrar gastos de prueba y empezar en blanco"
          >
            <Trash2 className="w-3.5 h-3.5" /> Empezar en Limpio
          </button>

          <button
            type="submit"
            form="quick-finance-form"
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-black gradient-primary btn-3d flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-black" /> : "Guardar mis números"}
          </button>
        </div>
      }
    >
      <form id="quick-finance-form" onSubmit={handleSaveDirect} className="space-y-4 animate-fade-in">
        <div className="rounded-2xl p-3.5 bg-primary/10 border border-primary/30 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-foreground leading-relaxed">
            Acá podés ingresar <strong>exactamente la plata que tenés ahora</strong> y <strong>tu sueldo</strong>. ¡No es obligatorio tener gastos si no gastaste nada!
          </p>
        </div>

        {/* 1. Saldo Real Actual */}
        <div className="rounded-2xl p-3.5 bg-black/20 border border-primary/30">
          <div className="flex items-center gap-2 mb-1.5">
            <Wallet className="w-4 h-4 text-primary" />
            <label className="text-xs font-bold uppercase tracking-wider text-primary">
              1. ¿Cuánta plata tenés en total ahora? (Saldo Real)
            </label>
          </div>
          <div className="relative">
            <DollarSign className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-primary font-bold" />
            <input
              type="number"
              step="any"
              min="0"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="Ej: 350000"
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl text-xl font-black outline-none bg-black/30 border border-primary/40 focus:border-primary transition-all text-foreground"
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Este monto será tu saldo total en mano disponible.</p>
        </div>

        {/* 2. Sueldo / Ingreso Mensual */}
        <div className="rounded-2xl p-3.5 bg-black/20 border border-income/30">
          <div className="flex items-center gap-2 mb-1.5">
            <Briefcase className="w-4 h-4 text-income" />
            <label className="text-xs font-bold uppercase tracking-wider text-income">
              2. Tu Sueldo mensual asegurado
            </label>
          </div>
          <div className="relative">
            <DollarSign className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-income font-bold" />
            <input
              type="number"
              step="any"
              min="0"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder="Ej: 850000"
              className="w-full pl-10 pr-4 py-3 rounded-xl text-xl font-black outline-none bg-black/30 border border-income/40 focus:border-income transition-all text-income"
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Tu ingreso mensual fijo para calcular fin de mes.</p>
        </div>

        {/* Nombre de cuenta */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-1 opacity-80">
            Nombre de tu billetera o banco principal
          </label>
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Ej: Santander, Mercado Pago, Billetera Efectivo..."
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none bg-black/10 border border-white/10"
          />
        </div>

        {/* Checkbox para no forzar gastos */}
        <div className="p-3 rounded-xl bg-black/20 border border-white/5">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={clearExpenses}
              onChange={(e) => setClearExpenses(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded accent-primary cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-bold text-foreground">Limpiar gastos de prueba (No tengo gastos aún)</span>
              <p className="text-muted-foreground text-[11px]">
                Deja el contador de gastos en $0 para que no reste nada ficticio.
              </p>
            </div>
          </label>
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
