"use client";

import { useState, useEffect } from "react";
import { Loader2, Lock } from "lucide-react";
import type { Account, Category, Transaction } from "@/lib/types";
import { DraggableWindow } from "../ui/DraggableWindow";
import { isDemoUser, canPerformAction, incrementDemoTxCount } from "@/lib/freemium";

const TRANSACTION_TYPES = [
  { value: "expense", label: "Gasto" },
  { value: "income", label: "Ingreso" },
  { value: "transfer", label: "Transferencia" },
];

const CURRENCIES = ["ARS", "USD", "EUR", "BTC", "USDT"];

interface TransactionFormProps {
  onClose: () => void;
  onSuccess: () => void;
  defaultType?: "income" | "expense" | "transfer";
  isOpen?: boolean;
  transaction?: Transaction | null;
}

export function TransactionForm({
  onClose,
  onSuccess,
  defaultType = "expense",
  isOpen = true,
  transaction,
}: TransactionFormProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isEditing = Boolean(transaction);

  // Clave para persistir el borrador en localStorage sólo al crear nuevas transacciones
  const draftKey = "financeAI_transaction_draft";

  const [form, setForm] = useState({
    type: transaction?.type || defaultType,
    amount: transaction ? String(transaction.amount) : "",
    currency: transaction?.currency || "ARS",
    account_id: transaction?.account_id || "",
    transfer_to_account_id: transaction?.transfer_to_account_id || "",
    category_id: transaction?.category_id || "",
    description: transaction?.description || "",
    date: transaction?.date || new Date().toISOString().split("T")[0],
  });

  // Restaurar borrador de localStorage solo si estamos creando una nueva
  useEffect(() => {
    if (!transaction) {
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
        type: transaction.type,
        amount: String(transaction.amount),
        currency: transaction.currency,
        account_id: transaction.account_id,
        transfer_to_account_id: transaction.transfer_to_account_id || "",
        category_id: transaction.category_id || "",
        description: transaction.description || "",
        date: transaction.date,
      });
    }
  }, [transaction]);

  // Guardar en localStorage cada vez que cambia el form (solo si no estamos editando)
  useEffect(() => {
    if (!transaction) {
      localStorage.setItem(draftKey, JSON.stringify(form));
    }
  }, [form, transaction]);

  useEffect(() => {
    Promise.all([
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]).then(([accs, cats]) => {
      setAccounts(accs || []);
      setCategories(cats || []);
      if (!transaction) {
        setForm((f) => {
          if (!f.account_id && accs?.[0]) return { ...f, account_id: accs[0].id };
          return f;
        });
      }
    });
  }, [transaction]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const filteredCategories = categories.filter(
    (c) => c.type === form.type || c.type === "both"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError("El monto debe ser mayor a 0");
      return;
    }

    if (isDemoUser() && !isEditing && !canPerformAction("add_transaction").allowed) {
      setError("Has alcanzado el límite de 5 transacciones en modo demo. Creá tu cuenta gratis para continuar sin límites.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const body: Record<string, unknown> = {
        type: form.type,
        amount: parseFloat(form.amount),
        currency: form.currency,
        account_id: form.account_id,
        category_id: form.category_id || null,
        description: form.description || null,
        date: form.date,
      };

      if (form.type === "transfer") {
        body.transfer_to_account_id = form.transfer_to_account_id;
      }

      const method = isEditing ? "PATCH" : "POST";
      const payload = isEditing ? { id: transaction?.id, ...body } : body;

      const res = await fetch("/api/transactions", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error((await res.json()).error || "Error al guardar");

      // Limpiar borrador si fue exitoso
      if (!isEditing) {
        localStorage.removeItem(draftKey);
        if (isDemoUser()) {
          incrementDemoTxCount();
        }
      }
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
      title={isEditing ? `Editar Movimiento (${form.type === "income" ? "Ingreso" : "Gasto"})` : "Nueva Transacción"}
      windowId="transaction-form-window"
      defaultPosition={{ x: 0, y: 0 }}
      footer={
        <div className="flex w-full gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-bold btn-3d-secondary">
            Cancelar
          </button>
          <button
            type="submit"
            form="transaction-form"
            disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-black gradient-primary btn-3d flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : null}
            {loading ? "Guardando..." : isEditing ? "Guardar cambios" : "Registrar"}
          </button>
        </div>
      }
    >
      <form id="transaction-form" onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
        {/* Type selector */}
        <div className="flex rounded-xl p-1 bg-black/20 shadow-inner">
          {TRANSACTION_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => set("type", t.value)}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all duration-300 cursor-pointer ${
                form.type === t.value ? "shadow-lg scale-[1.02]" : "opacity-60 hover:opacity-100"
              }`}
              style={{
                background:
                  form.type === t.value
                    ? t.value === "income"
                      ? "linear-gradient(135deg, hsl(var(--income)), hsl(142 70% 35%))"
                      : t.value === "expense"
                      ? "linear-gradient(135deg, hsl(var(--expense)), hsl(348 80% 45%))"
                      : "linear-gradient(135deg, hsl(var(--warning)), hsl(38 90% 45%))"
                    : "transparent",
                color: form.type === t.value ? "white" : "hsl(var(--foreground))",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Amount + Currency */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5 opacity-80">Monto</label>
            <input
              type="number"
              step="any"
              min="0"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              placeholder="0.00"
              required
              className="w-full px-4 py-3 rounded-xl outline-none text-xl font-bold bg-black/10 border focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              style={{ borderColor: "hsl(var(--border) / 0.5)", color: "hsl(var(--foreground))" }}
            />
          </div>
          <div className="w-28">
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

        {/* Account */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5 opacity-80">
            {form.type === "transfer" ? "Desde" : "Cuenta de origen / destino"}
          </label>
          <select
            value={form.account_id}
            onChange={(e) => set("account_id", e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none bg-black/10 border focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
            style={{ borderColor: "hsl(var(--border) / 0.5)", color: "hsl(var(--foreground))" }}
          >
            <option value="" className="bg-neutral-900">
              Seleccionar cuenta...
            </option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id} className="bg-neutral-900">
                {a.name} — {a.currency}
              </option>
            ))}
          </select>
        </div>

        {/* Transfer to */}
        {form.type === "transfer" && (
          <div className="animate-fade-in">
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5 opacity-80">Hacia</label>
            <select
              value={form.transfer_to_account_id}
              onChange={(e) => set("transfer_to_account_id", e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none bg-black/10 border focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
              style={{ borderColor: "hsl(var(--border) / 0.5)", color: "hsl(var(--foreground))" }}
            >
              <option value="" className="bg-neutral-900">
                Seleccionar destino...
              </option>
              {accounts
                .filter((a) => a.id !== form.account_id)
                .map((a) => (
                  <option key={a.id} value={a.id} className="bg-neutral-900">
                    {a.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Category */}
        {form.type !== "transfer" && (
          <div className="animate-fade-in">
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5 opacity-80">
              Categoría ({form.type === "income" ? "Ingreso" : "Gasto"})
            </label>
            <select
              value={form.category_id}
              onChange={(e) => set("category_id", e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none bg-black/10 border focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
              style={{ borderColor: "hsl(var(--border) / 0.5)", color: "hsl(var(--foreground))" }}
            >
              <option value="" className="bg-neutral-900">
                Sin categoría
              </option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id} className="bg-neutral-900">
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Description & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5 opacity-80">
              Descripción / Concepto
            </label>
            <input
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Ej: Sueldo, Freelance, Coto..."
              className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none bg-black/10 border focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              style={{ borderColor: "hsl(var(--border) / 0.5)", color: "hsl(var(--foreground))" }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5 opacity-80">Fecha</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none bg-black/10 border focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              style={{ borderColor: "hsl(var(--border) / 0.5)", color: "hsl(var(--foreground))" }}
            />
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
