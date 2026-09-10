"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import type { Account } from "@/lib/types";
import { DraggableWindow } from "../ui/DraggableWindow";

const ACCOUNT_TYPES = [
  { value: "cash", label: "Efectivo" },
  { value: "bank", label: "Banco" },
  { value: "digital_wallet", label: "Billetera Digital (MP, etc)" },
  { value: "investment", label: "Inversiones" },
  { value: "crypto", label: "Cripto" },
  { value: "other", label: "Otro" },
];

const COLORS = [
  "#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#3B82F6", "#F97316", "#14B8A6", "#84CC16",
];

const CURRENCIES = ["ARS", "USD", "EUR", "BTC", "USDT", "USDC"];

interface AccountFormProps {
  onClose: () => void;
  onSuccess: () => void;
  account?: Account | null;
  isOpen?: boolean;
}

export function AccountForm({ onClose, onSuccess, account, isOpen = true }: AccountFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isEditing = Boolean(account);
  const draftKey = "financeAI_account_draft";

  const [form, setForm] = useState({
    name: account?.name || "",
    type: account?.type || "bank",
    balance: account ? String(account.balance) : "0",
    currency: account?.currency || "ARS",
    color: account?.color || "#3B82F6",
  });

  // Restaurar borrador de localStorage solo si estamos creando
  useEffect(() => {
    if (!account) {
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
        name: account.name,
        type: account.type,
        balance: String(account.balance),
        currency: account.currency,
        color: account.color,
      });
    }
  }, [account]);

  // Guardar en localStorage cada vez que cambia el form
  useEffect(() => {
    if (!account) {
      localStorage.setItem(draftKey, JSON.stringify(form));
    }
  }, [form, account]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("El nombre de la cuenta es obligatorio");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const url = "/api/accounts";
      const method = isEditing ? "PATCH" : "POST";
      const payload = isEditing
        ? { id: account?.id, ...form, balance: parseFloat(form.balance) || 0 }
        : { ...form, balance: parseFloat(form.balance) || 0 };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      title={isEditing ? `Editar Cuenta (${account?.name})` : "Nueva Cuenta / Billetera"}
      windowId="account-form-window"
      defaultPosition={{ x: 0, y: -40 }}
      footer={
        <div className="flex w-full gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-bold btn-3d-secondary">
            Cancelar
          </button>
          <button
            type="submit"
            form="account-form"
            disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-black gradient-primary btn-3d flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : null}
            {loading ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear cuenta"}
          </button>
        </div>
      }
    >
      <form id="account-form" onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
        {/* Name */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5 opacity-80">
            Nombre de la cuenta
          </label>
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Ej: Mercado Pago, Galicia, Billetera Efectivo..."
            required
            className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none bg-black/10 border focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            style={{ borderColor: "hsl(var(--border) / 0.5)", color: "hsl(var(--foreground))" }}
          />
        </div>

        {/* Type + Currency */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5 opacity-80">Tipo</label>
            <select
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              className="w-full px-3 py-3 rounded-xl text-sm font-semibold outline-none bg-black/10 border focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
              style={{ borderColor: "hsl(var(--border) / 0.5)", color: "hsl(var(--foreground))" }}
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value} className="bg-neutral-900">
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5 opacity-80">Moneda</label>
            <select
              value={form.currency}
              onChange={(e) => set("currency", e.target.value)}
              className="w-full px-3 py-3 rounded-xl text-sm font-semibold outline-none bg-black/10 border focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
              style={{ borderColor: "hsl(var(--border) / 0.5)", color: "hsl(var(--foreground))" }}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c} className="bg-neutral-900">
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Balance / Saldo editable */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider opacity-80">
              {isEditing ? "Saldo actual (Balance)" : "Saldo inicial"}
            </label>
            <span className="text-[11px] font-bold text-primary">Editable directamente</span>
          </div>
          <input
            type="number"
            step="any"
            value={form.balance}
            onChange={(e) => set("balance", e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-xl font-bold outline-none bg-black/10 border focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            style={{ borderColor: "hsl(var(--border) / 0.5)", color: "hsl(var(--foreground))" }}
          />
        </div>

        {/* Color */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-2 opacity-80">Color identificador</label>
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

        {error && (
          <p className="text-sm font-medium rounded-xl p-3 bg-red-900/30 text-red-400 border border-red-900/50">
            {error}
          </p>
        )}
      </form>
    </DraggableWindow>
  );
}
