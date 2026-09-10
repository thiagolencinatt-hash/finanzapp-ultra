"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import type { Account } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/currency";
import { DraggableWindow } from "../ui/DraggableWindow";

interface InstallmentFormProps {
  onClose: () => void;
  onSuccess: () => void;
  isOpen?: boolean;
}

export function InstallmentForm({ onClose, onSuccess, isOpen = true }: InstallmentFormProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const draftKey = "financeAI_installment_draft";
  const [form, setForm] = useState({
    description: "",
    total_amount: "",
    total_installments: "3",
    has_interest: false,
    interest_rate: "",
    account_id: "",
    category_id: "",
    due_day: "10",
    start_date: new Date().toISOString().split("T")[0],
    currency: "ARS",
    notes: "",
  });

  // Restaurar borrador
  useEffect(() => {
    const draft = localStorage.getItem(draftKey);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setForm((prev) => ({ ...prev, ...parsed }));
      } catch {
        // ignore
      }
    }
  }, []);

  // Guardar borrador
  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => {
        setAccounts(data || []);
        if (data?.[0]) {
          setForm((f) => {
            if (!f.account_id) return { ...f, account_id: data[0].id };
            return f;
          });
        }
      });
  }, []);

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const totalAmount = parseFloat(form.total_amount) || 0;
  const totalInstallments = parseInt(form.total_installments) || 1;
  const installmentAmount = totalAmount / totalInstallments;
  const totalWithInterest = form.has_interest && form.interest_rate
    ? installmentAmount * (1 + parseFloat(form.interest_rate) / 100) * totalInstallments
    : totalAmount;
  const cft = totalAmount > 0 ? ((totalWithInterest / totalAmount) - 1) * 100 : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim()) {
      setError("Por favor escribí la descripción de la compra");
      return;
    }
    if (!form.total_amount || parseFloat(form.total_amount) <= 0) {
      setError("El monto total debe ser mayor a 0");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const effectiveInstallmentAmount = form.has_interest && form.interest_rate
        ? installmentAmount * (1 + parseFloat(form.interest_rate) / 100)
        : installmentAmount;

      const res = await fetch("/api/installments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          total_amount: totalAmount,
          total_installments: totalInstallments,
          installment_amount: effectiveInstallmentAmount,
          interest_rate: parseFloat(form.interest_rate) || 0,
          due_day: parseInt(form.due_day),
          category_id: form.category_id || null,
          notes: form.notes || null,
        }),
      });

      if (!res.ok) throw new Error((await res.json()).error);
      
      localStorage.removeItem(draftKey);
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
      title="Registrar Compra en Cuotas"
      windowId="installment-form-modal"
      defaultPosition={{ x: 0, y: -40 }}
      footer={
        <div className="flex w-full gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl text-xs font-bold btn-3d-secondary">
            Cancelar
          </button>
          <button
            type="submit"
            form="installment-form"
            disabled={loading}
            className="flex-1 py-3 rounded-xl text-xs font-bold text-black gradient-primary btn-3d flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : "Registrar cuota"}
          </button>
        </div>
      }
    >
      <form id="installment-form" onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-1 opacity-80">
            Descripción de la compra
          </label>
          <input
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Ej: Smart TV Samsung 55'', Zapatillas Nike, Pasajes..."
            required
            className="w-full px-4 py-2.5 rounded-xl text-sm font-medium outline-none bg-black/10 border border-white/10 focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1 opacity-80">
              Monto total ($)
            </label>
            <input
              type="number"
              step="any"
              min="1"
              value={form.total_amount}
              onChange={(e) => set("total_amount", e.target.value)}
              placeholder="0.00"
              required
              className="w-full px-4 py-2.5 rounded-xl text-base font-bold outline-none bg-black/10 border border-white/10 focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1 opacity-80">
              Cantidad de cuotas
            </label>
            <input
              type="number"
              min="1"
              max="120"
              value={form.total_installments}
              onChange={(e) => set("total_installments", e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl text-base font-bold outline-none bg-black/10 border border-white/10 focus:border-primary"
            />
          </div>
        </div>

        {/* Interés toggle */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/20 border border-white/10">
          <button
            type="button"
            onClick={() => set("has_interest", !form.has_interest)}
            className="w-11 h-6 rounded-full transition-all relative flex-shrink-0 cursor-pointer"
            style={{
              background: form.has_interest ? "hsl(var(--expense))" : "hsl(var(--income))",
            }}
          >
            <div
              className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all"
              style={{ left: form.has_interest ? "calc(100% - 20px)" : "4px" }}
            />
          </button>
          <div>
            <p className="text-xs font-bold text-foreground">
              {form.has_interest ? "Con interés / recargo" : "Cuotas sin interés"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {form.has_interest ? "Permite calcular el CFT real" : "El valor de cada cuota es precio dividido cuotas"}
            </p>
          </div>
        </div>

        {form.has_interest && (
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1 opacity-80">
              Tasa de interés mensual / CFT (%)
            </label>
            <input
              type="number"
              step="any"
              value={form.interest_rate}
              onChange={(e) => set("interest_rate", e.target.value)}
              placeholder="Ej: 5.5"
              className="w-full px-4 py-2.5 rounded-xl text-sm font-bold outline-none bg-black/10 border border-white/10 focus:border-primary text-expense"
            />
          </div>
        )}

        {/* Preview */}
        {totalAmount > 0 && (
          <div className="rounded-2xl p-3 space-y-1 bg-black/30 border border-white/10">
            <p className="text-[11px] font-bold text-primary">Resumen de Cuota</p>
            <div className="flex justify-between text-xs text-foreground">
              <span>Valor por cada cuota:</span>
              <span className="font-extrabold text-income">{formatCurrency(installmentAmount, form.currency, true)}</span>
            </div>
            {form.has_interest && (
              <div className="flex justify-between text-xs text-expense">
                <span>Total final a pagar:</span>
                <span className="font-extrabold">{formatCurrency(totalWithInterest, form.currency, true)} (+{cft.toFixed(1)}% CFT)</span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1 opacity-80">Cuenta / Tarjeta</label>
            <select
              value={form.account_id}
              onChange={(e) => set("account_id", e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold outline-none bg-black/10 border border-white/10 cursor-pointer"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id} className="bg-neutral-900">
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1 opacity-80">Día de vencimiento</label>
            <input
              type="number"
              min="1"
              max="31"
              value={form.due_day}
              onChange={(e) => set("due_day", e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold outline-none bg-black/10 border border-white/10"
            />
          </div>
        </div>

        {error && <p className="text-xs font-medium rounded-xl p-3 bg-red-900/30 text-red-400">{error}</p>}
      </form>
    </DraggableWindow>
  );
}
