"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, ArrowDownRight, ArrowUpRight, Check, Loader2, Lock, Sparkles, ArrowRight } from "lucide-react";
import { DraggableWindow } from "../ui/DraggableWindow";
import type { Category, Account } from "@/lib/types";
import { isDemoUser, canPerformAction, incrementDemoTxCount } from "@/lib/freemium";

interface QuickExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function QuickExpenseModal({ isOpen, onClose, onSuccess }: QuickExpenseModalProps) {
  const router = useRouter();
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

  const isDemo = isDemoUser();
  const canAdd = canPerformAction("add_transaction").allowed;

  if (isDemo && !canAdd) {
    return (
      <DraggableWindow
        isOpen={isOpen}
        onClose={onClose}
        title="Límite alcanzado"
        windowId="quick-expense-limit"
      >
        <div className="text-center space-y-4 py-4">
          <div
            className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center border shadow-lg"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))",
              borderColor: "hsl(var(--primary) / 0.3)",
            }}
          >
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-black text-foreground">Límite de transacciones alcanzado</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              En modo demo podés registrar hasta 5 transacciones de prueba. Creá tu cuenta gratis para registrar movimientos ilimitados y guardar tus datos.
            </p>
          </div>
          <button
            onClick={() => {
              onClose();
              router.push("/login?tab=register");
            }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-black text-black gradient-primary btn-3d cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Crear Cuenta Gratis</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </DraggableWindow>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/transactions", {
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

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "Error al registrar movimiento");
        return;
      }

      if (isDemo) {
        incrementDemoTxCount();
      }

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
    <DraggableWindow
      isOpen={isOpen}
      onClose={onClose}
      title="Registro Rápido"
      windowId="quick-expense-modal"
      defaultPosition={{ x: 0, y: -40 }}
      footer={
        <div className="flex w-full gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-xs font-bold text-muted-foreground hover:bg-white/5 border border-white/10 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="quick-expense-form"
            disabled={submitting || !amount}
            className="flex-1 py-3 rounded-xl text-xs font-black text-black gradient-primary btn-3d flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-black" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Registrar Ahora</span>
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="flex flex-col space-y-4">
        {/* Toggle Gasto/Ingreso */}
        <div className="flex items-center gap-2 mb-2">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              type === "expense"
                ? "bg-red-500/20 text-red-400 border border-red-500/30 shadow-sm"
                : "text-muted-foreground hover:bg-white/5 border border-transparent"
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" /> Gasto
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              type === "income"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm"
                : "text-muted-foreground hover:bg-white/5 border border-transparent"
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" /> Ingreso
          </button>
        </div>

        <form id="quick-expense-form" onSubmit={handleSubmit} className="space-y-4">
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
                className="w-full px-3 py-2.5 rounded-xl bg-card border border-white/10 text-xs text-foreground outline-none focus:border-primary cursor-pointer"
              >
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-neutral-900">
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
                className="w-full px-3 py-2.5 rounded-xl bg-card border border-white/10 text-xs text-foreground outline-none focus:border-primary cursor-pointer"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id} className="bg-neutral-900">
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </div>
    </DraggableWindow>
  );
}
