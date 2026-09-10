"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import type { GoalType, SavingsGoal } from "@/lib/types";
import { DraggableWindow } from "../ui/DraggableWindow";

const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#84CC16"];
const CURRENCIES = ["ARS", "USD", "EUR"];

interface GoalFormProps {
  defaultType: GoalType;
  onClose: () => void;
  onSuccess: () => void;
  goal?: SavingsGoal | null;
  isOpen?: boolean;
}

export function GoalForm({ defaultType, onClose, onSuccess, goal, isOpen = true }: GoalFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isEditing = Boolean(goal);
  const draftKey = "financeAI_goal_draft";

  const [form, setForm] = useState({
    name: goal?.name || "",
    type: goal?.type || defaultType,
    description: goal?.description || "",
    target_amount: goal ? String(goal.target_amount) : "",
    current_amount: goal ? String(goal.current_amount) : "0",
    target_date: goal?.target_date || "",
    monthly_contribution: goal ? String(goal.monthly_contribution) : "",
    priority: goal ? String(goal.priority) : "2",
    color: goal?.color || "#10B981",
    currency: goal?.currency || "ARS",
    product_url: goal?.product_url || "",
  });

  // Restaurar borrador de localStorage solo si estamos creando
  useEffect(() => {
    if (!goal) {
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setForm((prev) => ({ ...prev, ...parsed }));
        } catch {
          // ignore
        }
      }
    } else {
      setForm({
        name: goal.name,
        type: goal.type,
        description: goal.description || "",
        target_amount: String(goal.target_amount),
        current_amount: String(goal.current_amount),
        target_date: goal.target_date || "",
        monthly_contribution: String(goal.monthly_contribution),
        priority: String(goal.priority),
        color: goal.color,
        currency: goal.currency,
        product_url: goal.product_url || "",
      });
    }
  }, [goal]);

  // Guardar en localStorage cada vez que cambia el form
  useEffect(() => {
    if (!goal) {
      localStorage.setItem(draftKey, JSON.stringify(form));
    }
  }, [form, goal]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Por favor escribí el nombre de la meta");
      return;
    }
    if (!form.target_amount || parseFloat(form.target_amount) <= 0) {
      setError("El objetivo debe ser mayor a 0");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const payload = {
        ...form,
        target_amount: parseFloat(form.target_amount),
        current_amount: parseFloat(form.current_amount) || 0,
        monthly_contribution: parseFloat(form.monthly_contribution) || 0,
        priority: parseInt(form.priority) || 2,
        target_date: form.target_date || null,
        product_url: form.product_url || null,
        description: form.description || null,
      };

      const url = "/api/goals";
      const method = isEditing ? "PATCH" : "POST";
      const body = isEditing ? { id: goal?.id, ...payload } : payload;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error((await res.json()).error || "Error al guardar");
      
      if (!isEditing) localStorage.removeItem(draftKey);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DraggableWindow
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Editar (${form.name})` : form.type === "goal" ? "Nueva Meta de Ahorro" : "Agregar a Wishlist"}
      windowId="goal-form-modal"
      defaultPosition={{ x: 0, y: -40 }}
      footer={
        <div className="flex w-full gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl text-xs font-bold btn-3d-secondary">
            Cancelar
          </button>
          <button
            type="submit"
            form="goal-form"
            disabled={loading}
            className="flex-1 py-3 rounded-xl text-xs font-bold text-black gradient-primary btn-3d flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : isEditing ? "Guardar cambios" : "Crear meta"}
          </button>
        </div>
      }
    >
      <form id="goal-form" onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
        {/* Type toggle */}
        <div className="flex rounded-xl p-1 bg-black/20 shadow-inner">
          {[
            { v: "goal", l: "🎯 Meta de Ahorro" },
            { v: "wishlist", l: "🛍️ Wishlist (Deseo)" },
          ].map((t) => (
            <button
              key={t.v}
              type="button"
              onClick={() => set("type", t.v)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                form.type === t.v ? "bg-primary text-black shadow-md font-extrabold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>

        {/* Nombre */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-1 opacity-80">
            Nombre de la meta
          </label>
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Ej: Fondo de emergencia, Vacaciones Brasil, Auto nuevo..."
            required
            className="w-full px-4 py-2.5 rounded-xl text-sm font-medium outline-none bg-black/10 border border-white/10 focus:border-primary"
          />
        </div>

        {/* Objetivo y Monto actual */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1 opacity-80">
              Objetivo total ($)
            </label>
            <input
              type="number"
              step="any"
              min="1"
              value={form.target_amount}
              onChange={(e) => set("target_amount", e.target.value)}
              placeholder="0.00"
              required
              className="w-full px-4 py-2.5 rounded-xl text-base font-bold outline-none bg-black/10 border border-white/10 focus:border-primary text-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1 opacity-80">
              Ya tengo ahorrado ($)
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={form.current_amount}
              onChange={(e) => set("current_amount", e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-base font-bold outline-none bg-black/10 border border-white/10 focus:border-primary text-income"
            />
          </div>
        </div>

        {/* Ahorro mensual y Moneda */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1 opacity-80">
              Ahorro mensual previsto ($)
            </label>
            <input
              type="number"
              step="any"
              value={form.monthly_contribution}
              onChange={(e) => set("monthly_contribution", e.target.value)}
              placeholder="Ej: 50000"
              className="w-full px-4 py-2.5 rounded-xl text-sm font-bold outline-none bg-black/10 border border-white/10 focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1 opacity-80">
              Moneda
            </label>
            <select
              value={form.currency}
              onChange={(e) => set("currency", e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm font-bold outline-none bg-black/10 border border-white/10 cursor-pointer"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c} className="bg-neutral-900">
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Prioridad y Fecha */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1 opacity-80">
              Prioridad
            </label>
            <select
              value={form.priority}
              onChange={(e) => set("priority", e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold outline-none bg-black/10 border border-white/10 cursor-pointer"
            >
              <option value="1" className="bg-neutral-900">⭐ Alta</option>
              <option value="2" className="bg-neutral-900">Media</option>
              <option value="3" className="bg-neutral-900">Baja</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1 opacity-80">
              Fecha objetivo (opcional)
            </label>
            <input
              type="date"
              value={form.target_date}
              onChange={(e) => set("target_date", e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none bg-black/10 border border-white/10"
            />
          </div>
        </div>

        {/* Color */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-2 opacity-80">Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set("color", c)}
                className="w-8 h-8 rounded-xl transition-all cursor-pointer"
                style={{
                  background: c,
                  transform: form.color === c ? "scale(1.2)" : "scale(1)",
                  boxShadow: form.color === c ? `0 0 0 2px hsl(var(--background)), 0 0 0 4px ${c}` : "none",
                }}
              />
            ))}
          </div>
        </div>

        {error && <p className="text-xs font-medium rounded-xl p-3 bg-red-900/30 text-red-400">{error}</p>}
      </form>
    </DraggableWindow>
  );
}
