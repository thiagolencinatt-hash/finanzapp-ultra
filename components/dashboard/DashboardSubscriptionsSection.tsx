"use client";

import { useState } from "react";
import { Repeat, Plus, Calendar, Check, X, Trash2, Power, AlertCircle } from "lucide-react";
import type { Subscription } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/currency";

interface DashboardSubscriptionsSectionProps {
  subscriptions?: Subscription[];
  monthlyTotal?: number;
  onRefresh?: () => void;
}

export function DashboardSubscriptionsSection({
  subscriptions = [],
  monthlyTotal = 0,
  onRefresh,
}: DashboardSubscriptionsSectionProps) {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [renewalDay, setRenewalDay] = useState("1");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const activeSubs = subscriptions.filter((s) => s.is_active);
  const annualProjected = monthlyTotal * 12;

  async function handleToggle(id: string) {
    await fetch("/api/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "toggle" }),
    });
    if (onRefresh) onRefresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta suscripción o gasto recurrente?")) return;
    await fetch("/api/subscriptions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (onRefresh) onRefresh();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !amount) return;
    setSaving(true);
    try {
      await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          amount: Number(amount),
          renewal_day: Number(renewalDay),
          notes,
          currency: "ARS",
        }),
      });
      setShowModal(false);
      setName("");
      setAmount("");
      setNotes("");
      if (onRefresh) onRefresh();
    } catch {
      alert("Error al agregar suscripción");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl p-5 lg:p-6 glass-strong shadow-xl relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Repeat className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-foreground tracking-tight">
              Suscripciones y Servicios Fijos
            </h3>
            <p className="text-xs text-muted-foreground">
              {activeSubs.length} activas • {formatCurrency(monthlyTotal, "ARS", true)}/mes (Proyección anual: {formatCurrency(annualProjected, "ARS", true)})
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white gradient-primary cursor-pointer hover:opacity-90 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nueva Suscripción</span>
        </button>
      </div>

      {/* Grid de Suscripciones */}
      {subscriptions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-xs">
          No tienes suscripciones registradas. ¡Agrega tus servicios (Netflix, Spotify, Gym, Alquiler) para controlar tus gastos fijos!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {subscriptions.map((sub) => {
            const days = sub.days_until_renewal;
            const isSoon = days !== undefined && days <= 5 && sub.is_active;

            return (
              <div
                key={sub.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 group relative ${
                  sub.is_active
                    ? "bg-card/60 border-white/5 hover:border-white/15"
                    : "bg-card/20 border-white/5 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{
                        background: `${sub.color || "#6366F1"}20`,
                        color: sub.color || "#6366F1",
                        border: `1px solid ${sub.color || "#6366F1"}40`,
                      }}
                    >
                      {sub.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground line-clamp-1">
                        {sub.name}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Día {sub.renewal_day} de cada mes
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggle(sub.id)}
                      className={`p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                        sub.is_active
                          ? "text-emerald-400 hover:bg-emerald-500/10"
                          : "text-muted-foreground hover:bg-white/5"
                      }`}
                      title={sub.is_active ? "Pausar suscripción" : "Activar suscripción"}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(sub.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-muted-foreground hover:text-red-400 cursor-pointer"
                      title="Eliminar suscripción"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-end justify-between pt-2 border-t border-white/5">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">
                      Cuota Mensual
                    </span>
                    <span className="text-sm font-black text-foreground">
                      {formatCurrency(sub.amount, sub.currency || "ARS", true)}
                    </span>
                  </div>

                  {sub.is_active && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isSoon
                          ? "bg-red-500/15 text-red-400 border border-red-500/30"
                          : "bg-card text-muted-foreground border border-white/5"
                      }`}
                    >
                      <Calendar className="w-3 h-3" />
                      {days === 0 ? "Vence hoy" : `En ${days} días`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nueva Suscripción */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl glass-strong border border-white/10 p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-extrabold text-foreground">
                Nueva Suscripción o Gasto Fijo
              </h4>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                  Nombre del Servicio
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Netflix, Gimnasio, Alquiler, Spotify..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-white/10 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                    Monto Mensual ($ ARS)
                  </label>
                  <input
                    type="number"
                    required
                    min="100"
                    step="50"
                    placeholder="ej. 8500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-white/10 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                    Día de Cobro (1-31)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="31"
                    value={renewalDay}
                    onChange={(e) => setRenewalDay(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-white/10 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                  Notas / Plan (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="ej. Plan familiar, débito automático..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                  {saving ? "Guardando..." : "Crear Suscripción"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
