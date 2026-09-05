"use client";

import { useState, useEffect } from "react";
import { X, ArrowDownRight, ArrowUpRight, Check, Loader2 } from "lucide-react";
import type { Category, Account } from "@/lib/types";

interface QuickExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function QuickExpenseModal({ isOpen, onClose, onSuccess }: QuickExpenseModalProps) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
    ])
      .then(([cats, accs]) => {
        if (Array.isArray(cats)) {
          setCategories(cats);
          const firstMatching = cats.find((c) => c.type === type || c.type === "both");
          if (firstMatching) setCategoryId(firstMatching.id);
        }
        if (Array.isArray(accs) && accs.length > 0) {
          setAccounts(accs);
          setAccountId(accs[0].id);
        }
      })
      .catch(() => {});
  }, [isOpen, type]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    setSubmitting(true);

    try {
      await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount: Number(amount),
          currency: "ARS",
          category_id: categoryId,
          account_id: accountId,
          description: description.trim() || (type === "expense" ? "Gasto Rápido" : "Ingreso Rápido"),
          date: new Date().toISOString().split("T")[0],
        }),
      });

      onClose();
      setAmount("");
      setDescription("");
      if (onSuccess) onSuccess();
    } catch {
      alert("Error al registrar movimiento");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredCategories = categories.filter((c) => c.type === type || c.type === "both");

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl glass-strong border border-white/10 p-5 sm:p-6 shadow-2xl relative animate-slide-up pb-safe">
        {/* Drag handle for mobile */}
        <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-4 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                type === "expense"
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "text-muted-foreground hover:bg-white/5"
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" /> Gasto
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                type === "income"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "text-muted-foreground hover:bg-white/5"
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" /> Ingreso
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Input de Monto Grande estilo Fintech */}
          <div className="text-center py-2">
            <span className="text-xs font-bold text-muted-foreground block mb-1">
              Monto a registrar ($ ARS)
            </span>
            <div className="flex items-center justify-center gap-1">
              <span className="text-2xl font-black text-muted-foreground">$</span>
              <input
                type="number"
                inputMode="decimal"
                autoFocus
                required
                min="1"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-56 text-3xl sm:text-4xl font-black text-center bg-transparent border-b-2 border-primary/50 focus:border-primary outline-none text-foreground tracking-tight"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">
              Descripción o Comercio
            </label>
            <input
              type="text"
              placeholder="ej. Café, Uber, Supermercado..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-white/10 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">
                Categoría
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-card border border-white/10 text-xs text-foreground outline-none focus:border-primary"
              >
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">
                Cuenta / Billetera
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-card border border-white/10 text-xs text-foreground outline-none focus:border-primary"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-xs font-bold text-muted-foreground hover:bg-white/5 border border-white/10"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !amount}
              className="flex-1 py-3 rounded-xl text-xs font-black text-black gradient-primary btn-3d flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Registrar Ahora</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
