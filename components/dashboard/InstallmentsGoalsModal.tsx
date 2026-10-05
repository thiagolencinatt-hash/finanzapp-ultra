"use client";

import { useState, useEffect } from "react";
import { 
  CreditCard, 
  Target, 
  Plus, 
  X, 
  Check, 
  Loader2, 
  Trash2, 
  Calendar, 
  CheckCircle2, 
  TrendingDown,
  ShoppingBag,
  Sparkles,
  DollarSign,
  AlertCircle
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { toast } from "sonner";
import type { Installment, SavingsGoal, Account } from "@/lib/types";
import { DashboardGoalsSection } from "./DashboardGoalsSection";

interface InstallmentsGoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  installments: Installment[];
  monthlyTotal: number;
  goals: SavingsGoal[];
  salary?: number;
  onRefresh: () => void;
  defaultTab?: "installments" | "goals";
}

export function InstallmentsGoalsModal({
  isOpen,
  onClose,
  installments = [],
  monthlyTotal = 0,
  goals = [],
  salary = 980000,
  onRefresh,
  defaultTab = "installments",
}: InstallmentsGoalsModalProps) {
  const [activeTab, setActiveTab] = useState<"installments" | "goals">(defaultTab);
  const [showNewForm, setShowNewForm] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Formulario de nueva cuota
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [totalInstallments, setTotalInstallments] = useState("6");
  const [accountId, setAccountId] = useState("");
  const [cardName, setCardName] = useState("Tarjeta de Crédito");
  const [firstDueDate, setFirstDueDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    if (isOpen) {
      fetch("/api/accounts")
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setAccounts(data);
            const cc = data.find((a) => a.type === "credit_card") || data[0];
            setAccountId(cc.id);
            setCardName(cc.name);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Cálculo en vivo de la cuota
  const numTotal = parseFloat(totalAmount) || 0;
  const numCuotas = parseInt(totalInstallments, 10) || 1;
  const installmentValue = numTotal > 0 ? numTotal / numCuotas : 0;

  // Registrar nueva compra en cuotas
  const handleCreateInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Ingresa el nombre del gasto o comercio");
      return;
    }
    if (numTotal <= 0) {
      toast.error("Ingresa un monto total válido");
      return;
    }
    if (numCuotas < 1) {
      toast.error("La cantidad de cuotas debe ser al menos 1");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/installments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          item_name: description.trim(),
          card_name: cardName,
          total_amount: numTotal,
          total_installments: numCuotas,
          installment_amount: Math.round((numTotal / numCuotas) * 100) / 100,
          account_id: accountId || null,
          start_date: firstDueDate,
          due_day: parseInt(firstDueDate.split("-")[2], 10) || 10,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al registrar la compra en cuotas");
      }

      toast.success(`¡Compra "${description}" en ${numCuotas} cuotas registrada!`);
      setDescription("");
      setTotalAmount("");
      setTotalInstallments("6");
      setShowNewForm(false);
      onRefresh();
      window.dispatchEvent(new CustomEvent("finance-refresh"));
    } catch (err: any) {
      toast.error(err.message || "No se pudo guardar la compra en cuotas");
    } finally {
      setSubmitting(false);
    }
  };

  // Marcar una cuota como pagada
  const handlePayInstallment = async (inst: Installment) => {
    setPayingId(inst.id);
    try {
      const res = await fetch("/api/installments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: inst.id, action: "pay" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al actualizar la cuota");
      }

      const nextPaid = (inst.paid_installments || 0) + 1;
      const totalInst = inst.total_installments || 1;

      if (nextPaid >= totalInst) {
        toast.success(`🎉 ¡Felicidades! Completaste el 100% de "${inst.description}". Compra liquidada.`);
      } else {
        toast.success(`¡Cuota ${nextPaid} de ${totalInst} marcada como pagada!`);
      }

      onRefresh();
      window.dispatchEvent(new CustomEvent("finance-refresh"));
    } catch (err: any) {
      toast.error(err.message || "Error al procesar el pago");
    } finally {
      setPayingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[85dvh] flex flex-col rounded-3xl bg-neutral-950 border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden z-10 animate-slide-up">
        {/* Header Fijo */}
        <div className="sticky top-0 bg-neutral-900/95 backdrop-blur-md z-10 px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/25 text-amber-400 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
              <CreditCard className="w-5 h-5 stroke-[2.4]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Mis Cuotas & Metas Financieras
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  GESTIÓN
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Planificación de compras a plazo y objetivos de ahorro con sueldo
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-400 hover:text-white bg-white/[0.04] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Switcher de Pestañas */}
        <div className="px-5 pt-3 pb-2 border-b border-white/[0.06] flex gap-2 w-full shrink-0 bg-neutral-950/80">
          <button
            type="button"
            onClick={() => setActiveTab("installments")}
            className={`flex-1 min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "installments"
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm"
                : "text-neutral-400 hover:text-white bg-white/[0.02]"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Compras en Cuotas ({installments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("goals")}
            className={`flex-1 min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "goals"
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm"
                : "text-neutral-400 hover:text-white bg-white/[0.02]"
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Metas de Ahorro ({goals.length})</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4 pb-12 pr-1">
          {activeTab === "installments" ? (
            <div className="space-y-4">
              {/* Métricas Resumen */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/[0.08] via-neutral-900/90 to-neutral-950/90 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                    Compromiso Mensual en Cuotas
                  </p>
                  <p className="text-2xl sm:text-3xl font-black text-amber-300 font-mono tabular-nums tracking-tight">
                    {formatCurrency(monthlyTotal, "ARS", true)}
                    <span className="text-xs text-neutral-400 font-normal"> / mes</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowNewForm(!showNewForm)}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 text-black font-extrabold text-xs uppercase tracking-wider hover:bg-amber-400 transition-all cursor-pointer active:scale-95 shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>{showNewForm ? "Ocultar Formulario" : "Nueva Compra en Cuotas"}</span>
                </button>
              </div>

              {/* Formulario Inline para Registrar Compra en Cuotas */}
              {showNewForm && (
                <form
                  onSubmit={handleCreateInstallment}
                  className="p-4 sm:p-5 rounded-2xl bg-neutral-900/90 border border-amber-500/30 space-y-3.5 animate-slide-up"
                >
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-amber-400" />
                      Registrar Compra en Cuotas
                    </h4>
                    <span className="text-[11px] font-mono text-neutral-400">Persistente en BD</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                      Nombre del Gasto / Comercio *
                    </label>
                    <input
                      type="text"
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ej: Mercado Libre - Zapatillas, Celular, Smart TV"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-white font-bold text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                        Monto Total de la Compra ($) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">$</span>
                        <input
                          type="number"
                          step="any"
                          required
                          value={totalAmount}
                          onChange={(e) => setTotalAmount(e.target.value)}
                          placeholder="120000"
                          className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                        Cantidad de Cuotas *
                      </label>
                      <div className="flex items-center gap-1.5">
                        {[3, 6, 12].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setTotalInstallments(String(n))}
                            className={`px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                              totalInstallments === String(n)
                                ? "bg-amber-500 text-black shadow-sm"
                                : "bg-neutral-950 border border-white/10 text-neutral-300 hover:text-white"
                            }`}
                          >
                            {n}x
                          </button>
                        ))}
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={totalInstallments}
                          onChange={(e) => setTotalInstallments(e.target.value)}
                          className="w-16 px-2 py-2 rounded-xl bg-neutral-950 border border-white/10 text-white font-mono font-bold text-xs text-center focus:outline-none focus:border-amber-500"
                          placeholder="Otra"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Valor por cuota auto-calculado */}
                  {numTotal > 0 && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs font-mono">
                      <span className="text-neutral-300">Valor de cada cuota:</span>
                      <span className="text-sm font-black text-amber-300">
                        {numCuotas} cuotas de {formatCurrency(installmentValue, "ARS", true)}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                        Fecha Primera Cuota / Vencimiento
                      </label>
                      <input
                        type="date"
                        value={firstDueDate}
                        onChange={(e) => setFirstDueDate(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                        Medio / Tarjeta
                      </label>
                      <input
                        type="text"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="Ej: Visa Santander, MP Tarjeta"
                        className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowNewForm(false)}
                      className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-neutral-300 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2 rounded-xl bg-amber-500 text-black font-extrabold text-xs uppercase tracking-wider hover:bg-amber-400 transition-all cursor-pointer active:scale-95 shadow-md flex items-center gap-1.5"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                      <span>Guardar Compra</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de Compras en Cuotas Activas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-neutral-400 font-medium uppercase tracking-wider px-1">
                  <span>Planes de Cuotas Activos ({installments.length})</span>
                  <span>Progreso de Pago</span>
                </div>

                {installments.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02]">
                    <CreditCard className="w-10 h-10 mx-auto mb-2 text-neutral-500 opacity-40" />
                    <p className="text-sm font-bold text-white">No tienes compras en cuotas pendientes</p>
                    <p className="text-xs text-neutral-400 mt-1 mb-3">
                      Tu sueldo está 100% libre de deudas a plazo. Puedes registrar una si vas a comprar algo financiado.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowNewForm(true)}
                      className="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs uppercase tracking-wider hover:bg-amber-400 transition-all cursor-pointer"
                    >
                      + Registrar Compra
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {installments.map((inst) => {
                      const paid = inst.paid_installments || 0;
                      const total = inst.total_installments || 1;
                      const remaining = Math.max(0, total - paid);
                      const pct = Math.min(100, Math.round((paid / total) * 100));
                      const isPaying = payingId === inst.id;

                      return (
                        <div
                          key={inst.id}
                          className="p-4 rounded-2xl bg-neutral-900/80 border border-white/10 hover:border-amber-500/30 transition-all flex flex-col gap-3 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="text-sm sm:text-base font-bold text-white truncate">
                                {inst.description}
                              </h4>
                              <p className="text-xs text-neutral-400 flex items-center gap-1.5 mt-0.5">
                                <span className="font-semibold text-neutral-300">
                                  {inst.account_name || "Tarjeta"}
                                </span>
                                <span>•</span>
                                <span>Total: {formatCurrency(inst.total_amount, inst.currency, true)}</span>
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="text-base sm:text-lg font-black font-mono text-amber-300 tabular-nums">
                                {formatCurrency(inst.installment_amount, inst.currency, true)}
                              </p>
                              <span className="text-[10px] font-mono text-neutral-400">por cuota</span>
                            </div>
                          </div>

                          {/* Barra de Progreso */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="font-bold text-white">
                                Cuota {paid} de {total} ({remaining} {remaining === 1 ? "restante" : "restantes"})
                              </span>
                              <span className="font-bold text-amber-400">{pct}% pagado</span>
                            </div>

                            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>

                          {/* Acciones de la cuota */}
                          <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                            <span className="text-[11px] font-mono text-neutral-400">
                              Saldo pendiente: {formatCurrency(remaining * inst.installment_amount, inst.currency, true)}
                            </span>

                            <button
                              type="button"
                              onClick={() => handlePayInstallment(inst)}
                              disabled={isPaying || paid >= total}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-bold text-emerald-300 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                            >
                              {isPaying ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              )}
                              <span>Marcar cuota {paid + 1} como pagada</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Pestaña: Metas de Ahorro */
            <div className="space-y-4">
              <DashboardGoalsSection
                goals={goals}
                salary={salary}
                onRefresh={onRefresh}
              />
            </div>
          )}
        </div>

        {/* Footer Fijo */}
        <div className="sticky bottom-0 bg-neutral-900/95 backdrop-blur-md pt-3 pb-3 px-5 border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-neutral-400 font-mono">
            {activeTab === "installments"
              ? `${installments.length} compras activas · Compromiso: ${formatCurrency(monthlyTotal, "ARS", true)}/mes`
              : `${goals.length} metas de ahorro configuradas`}
          </p>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-bold text-white transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
