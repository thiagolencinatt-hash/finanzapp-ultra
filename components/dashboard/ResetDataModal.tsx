"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Sparkles, DollarSign, Wallet, Briefcase, RotateCcw, X, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { clearAllStoredFinances } from "@/lib/storage/local-store";

interface ResetDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ResetDataModal({ isOpen, onClose, onSuccess }: ResetDataModalProps) {
  const [initialBalance, setInitialBalance] = useState<string>("0");
  const [primaryAccountName, setPrimaryAccountName] = useState<string>("Mercado Pago / Banco");
  const [salary, setSalary] = useState<string>("0");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  async function handleConfirmReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const balanceNum = parseFloat(initialBalance) || 0;
      const salaryNum = parseFloat(salary) || 0;

      const res = await fetch("/api/finances/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initialBalanceARS: balanceNum,
          configuredSalary: salaryNum,
          primaryAccountName: primaryAccountName.trim() || "Cuenta Principal",
        }),
      });

      if (!res.ok) {
        throw new Error("No se pudo resetear la información");
      }

      // Limpiar también todo rastro en el almacenamiento local del navegador
      clearAllStoredFinances();

      // Notificar a todos los componentes de la aplicación
      window.dispatchEvent(new Event("finance-refresh"));

      setDone(true);
      setTimeout(() => {
        setDone(false);
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      alert("Ocurrió un error al reiniciar los datos. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[99990] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl glass-strong border overflow-hidden"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        {/* Glow de acento */}
        <div
          className="absolute -top-12 -right-12 w-44 h-44 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: "hsl(var(--primary))" }}
        />

        <div className="flex items-center justify-between pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-foreground">
                Empezar de Cero (Todo en $0)
              </h2>
              <p className="text-xs text-muted-foreground">
                Modo Nuevo Usuario — Carga tus números reales
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground">¡Cuenta iniciada en limpio!</h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              Todos los datos de prueba fueron borrados. Ya podés registrar tus gastos e ingresos reales.
            </p>
          </div>
        ) : (
          <form onSubmit={handleConfirmReset} className="mt-5 space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <span className="font-bold">¿Qué hace este botón?</span> Se eliminarán todas las transacciones, deudas, metas y presupuestos de prueba. Podés definir con cuánto saldo arrancás hoy.
              </div>
            </div>

            {/* Saldo inicial */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-primary" />
                Saldo inicial en tu cuenta principal (ARS)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">$</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  placeholder="0"
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border text-sm font-bold bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  style={{ borderColor: "hsl(var(--border))" }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Dejalo en 0 si no querés arrancar con saldo acumulado.
              </p>
            </div>

            {/* Nombre de la cuenta */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-primary" />
                Nombre de tu banco o billetera principal
              </label>
              <input
                type="text"
                value={primaryAccountName}
                onChange={(e) => setPrimaryAccountName(e.target.value)}
                placeholder="Ej: Santander, Mercado Pago, Galicia, etc."
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                style={{ borderColor: "hsl(var(--border))" }}
              />
            </div>

            {/* Sueldo mensual */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-primary" />
                Sueldo o ingreso mensual estimado (opcional)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">$</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="0"
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border text-sm font-bold bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  style={{ borderColor: "hsl(var(--border))" }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Se usará para calcular automáticamente tus porcentajes de ahorro y presupuesto mensual.
              </p>
            </div>

            {/* Botones de acción */}
            <div className="pt-3 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-black gradient-primary btn-3d flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Reiniciando...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>¡Dejar todo en $0 y Empezar!</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
