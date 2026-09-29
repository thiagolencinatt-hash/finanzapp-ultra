"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Camera, Sparkles, Undo2 } from "lucide-react";
import type { Account, Category, Transaction } from "@/lib/types";
import { toast } from "sonner";
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
  const [scanningReceipt, setScanningReceipt] = useState(false);
  const [error, setError] = useState("");
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
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

  const [accountsLoading, setAccountsLoading] = useState(true);

  const isUUID = (str: any): boolean =>
    typeof str === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

  useEffect(() => {
    setAccountsLoading(true);
    Promise.all([
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]).then(([accs, cats]) => {
      const validAccs = (accs || []).filter((a: Account) => isUUID(a.id));
      setAccounts(validAccs);
      setCategories(cats || []);
      setAccountsLoading(false);
      if (!transaction) {
        setForm((f) => {
          if (!isUUID(f.account_id) && validAccs.length > 0) {
            const preferred = validAccs.find((a: Account) => a.name === "Mercado Pago" || a.name === "Efectivo") || validAccs[0];
            return { ...f, account_id: preferred.id };
          }
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

    const txId = isEditing && transaction?.id ? transaction.id : crypto.randomUUID();
    let sanitizedAccountId = form.account_id;
    if (sanitizedAccountId === 'default-cash' || sanitizedAccountId === 'default_cash' || !isUUID(sanitizedAccountId)) {
      sanitizedAccountId = "";
    }

    const body: Record<string, unknown> = {
      id: txId,
      type: form.type,
      amount: parseFloat(form.amount),
      currency: form.currency,
      account_id: sanitizedAccountId,
      category_id: form.category_id || null,
      description: form.description || null,
      date: form.date,
    };

    if (form.type === "transfer") {
      body.transfer_to_account_id = form.transfer_to_account_id;
    }

    const payload = body;

    setLoading(true);
    try {
      const method = isEditing ? "PATCH" : "POST";
      const res = await fetch("/api/transactions", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('[TX_ERROR]', errorData);
        throw new Error(errorData.error || errorData.details || "Error de servidor");
      }

      // Limpiar borrador local
      if (!isEditing) {
        localStorage.removeItem(draftKey);
        if (isDemoUser()) incrementDemoTxCount();
      }

      toast.success(isEditing ? "Movimiento actualizado" : "Movimiento registrado");
      window.dispatchEvent(new Event("finance-refresh"));
      router.refresh();
      onSuccess(); // Cierra el modal
    } catch (err: any) {
      console.error("Error saving transaction:", err);
      setError(err.message || "Error al guardar el movimiento");
    } finally {
      setLoading(false);
    }
  }

  async function handleReceiptScan(file: File) {
    if (!file) return;
    setScanningReceipt(true);
    setError("");
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const b64 = await base64Promise;

      const res = await fetch("/api/scan-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: b64,
          image_mime_type: file.type || "image/jpeg",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo leer el comprobante");

      if (data.data) {
        const { merchant, total, date, category, type, itemsSummary } = data.data;
        setForm((prev) => {
          let matchingCatId = prev.category_id;
          if (categories.length > 0 && category) {
            const match = categories.find(
              (c) =>
                c.name.toLowerCase().includes(category.toLowerCase()) ||
                category.toLowerCase().includes(c.name.toLowerCase())
            );
            if (match) matchingCatId = match.id;
          }

          return {
            ...prev,
            amount: total ? String(total) : prev.amount,
            description: merchant ? (itemsSummary ? `${merchant} - ${itemsSummary}` : merchant) : prev.description,
            date: date || prev.date,
            type: type || prev.type,
            category_id: matchingCatId,
          };
        });
        toast.success(`¡Comprobante escaneado! Datos de ${data.data.merchant || "compra"} autocompletados.`);
      }
    } catch (err: any) {
      console.error("Receipt scan error:", err);
      toast.error(err.message || "Error al escanear comprobante.");
    } finally {
      setScanningReceipt(false);
      if (receiptInputRef.current) receiptInputRef.current.value = "";
    }
  }

  async function handleDelete() {
    if (!transaction?.id) return;
    if (!confirm("¿Estás seguro de que deseas eliminar este movimiento? Se actualizará tu saldo automáticamente.")) return;

    const backupTx = { ...transaction };
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions?id=${transaction.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error al eliminar en la nube");

      toast.success("Movimiento eliminado", {
        action: {
          label: "Deshacer",
          onClick: async () => {
            try {
              await fetch("/api/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(backupTx),
              });
              toast.success("Movimiento restaurado correctamente");
              window.dispatchEvent(new Event("finance-refresh"));
            } catch {
              toast.error("No se pudo restaurar el movimiento");
            }
          },
        },
        duration: 6000,
      });

      window.dispatchEvent(new Event("finance-refresh"));
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error("Hubo un error al intentar eliminar el movimiento.");
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
        <div className="flex flex-col sm:flex-row w-full gap-2 sm:gap-3">
          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="w-full sm:w-auto min-h-[48px] h-12 sm:h-13 px-5 rounded-2xl text-sm font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98]"
            >
              Eliminar
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:flex-1 min-h-[48px] h-12 sm:h-13 py-3 rounded-2xl text-sm font-semibold btn-3d-secondary cursor-pointer active:scale-[0.98]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="transaction-form"
            disabled={loading}
            className="w-full sm:flex-1 min-h-[48px] h-12 sm:h-13 py-3 rounded-2xl text-sm font-extrabold text-black gradient-primary btn-3d flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.98]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : null}
            {loading ? "Guardando..." : isEditing ? "Guardar cambios" : "Registrar"}
          </button>
        </div>
      }
    >
      <form id="transaction-form" onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 animate-fade-in pb-2">
        {/* Scanner de Comprobantes con IA */}
        {!isEditing && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-200">Escanear Ticket o Factura con IA</p>
                <p className="text-[10px] text-zinc-500">Sube una foto y Gemini extrae monto y comercio</p>
              </div>
            </div>

            <button
              type="button"
              disabled={scanningReceipt}
              onClick={() => receiptInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-xl text-xs font-bold text-zinc-100 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {scanningReceipt ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span>Leyendo...</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5 text-primary" />
                  <span>Foto / Archivo</span>
                </>
              )}
            </button>

            <input
              type="file"
              ref={receiptInputRef}
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleReceiptScan(e.target.files[0]);
                }
              }}
              className="hidden"
            />
          </div>
        )}

        {/* Type selector */}
        <div className="flex rounded-2xl p-1.5 bg-black/30 border border-white/[0.08] shadow-inner gap-1">
          {TRANSACTION_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => set("type", t.value)}
              className={`flex-1 min-h-[48px] py-3 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                form.type === t.value ? "shadow-md scale-[1.02]" : "opacity-60 hover:opacity-100"
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
        <div className="flex gap-2.5 sm:gap-3">
          <div className="flex-1">
            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 text-zinc-400">
              Monto
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-2xl sm:text-3xl font-extrabold text-zinc-500 select-none">$</span>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                min="0"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                placeholder="0.00"
                required
                className="w-full pl-10 pr-4 h-14 sm:h-16 rounded-2xl outline-none text-2xl sm:text-3xl font-extrabold tracking-tight bg-black/20 border border-white/[0.1] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono tabular-nums text-foreground"
              />
            </div>
          </div>
          <div className="w-28 sm:w-32">
            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 text-zinc-400">
              Moneda
            </label>
            <select
              value={form.currency}
              onChange={(e) => set("currency", e.target.value)}
              className="w-full px-3 h-14 sm:h-16 rounded-2xl text-base font-bold outline-none bg-black/20 border border-white/[0.1] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer text-foreground"
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
          <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 text-zinc-400">
            {form.type === "transfer" ? "Desde" : "Cuenta de origen / destino"}
          </label>
          <select
            value={form.account_id}
            onChange={(e) => set("account_id", e.target.value)}
            required
            className="w-full px-4 h-12 sm:h-13 rounded-2xl text-base font-medium outline-none bg-black/20 border border-white/[0.1] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer text-foreground"
          >
            {accountsLoading ? (
              <option value="" disabled className="bg-neutral-900">
                Cargando cuentas...
              </option>
            ) : (
              <>
                <option value="" className="bg-neutral-900">
                  Seleccionar cuenta...
                </option>
                {accounts.length === 0 && (
                  <option value="" disabled className="bg-neutral-900 text-neutral-500">
                    No hay cuentas disponibles
                  </option>
                )}
                {accounts.map((a) => (
                  <option key={a.id} value={a.id} className="bg-neutral-900">
                    {a.name} — {a.currency}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        {/* Transfer to */}
        {form.type === "transfer" && (
          <div className="animate-fade-in">
            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 text-zinc-400">Hacia</label>
            <select
              value={form.transfer_to_account_id}
              onChange={(e) => set("transfer_to_account_id", e.target.value)}
              required
              className="w-full px-4 h-12 sm:h-13 rounded-2xl text-base font-medium outline-none bg-black/20 border border-white/[0.1] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer text-foreground"
            >
              {accountsLoading ? (
                <option value="" disabled className="bg-neutral-900">
                  Cargando cuentas...
                </option>
              ) : (
                <>
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
                </>
              )}
            </select>
          </div>
        )}

        {/* Category */}
        {form.type !== "transfer" && (
          <div className="animate-fade-in">
            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 text-zinc-400">
              Categoría ({form.type === "income" ? "Ingreso" : "Gasto"})
            </label>
            <select
              value={form.category_id}
              onChange={(e) => set("category_id", e.target.value)}
              className="w-full px-4 h-12 sm:h-13 rounded-2xl text-base font-medium outline-none bg-black/20 border border-white/[0.1] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer text-foreground"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 text-zinc-400">
              Descripción / Concepto
            </label>
            <input
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Ej: Sueldo, Freelance, Coto..."
              className="w-full px-4 h-12 sm:h-13 rounded-2xl text-base font-medium outline-none bg-black/20 border border-white/[0.1] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-foreground placeholder:text-zinc-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 text-zinc-400">Fecha</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              className="w-full px-4 h-12 sm:h-13 rounded-2xl text-base font-medium outline-none bg-black/20 border border-white/[0.1] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
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
