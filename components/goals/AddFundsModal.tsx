"use client";

import { useState, useEffect } from "react";
import { X, Target, Wallet } from "lucide-react";
import type { SavingsGoal, Account } from "@/lib/types";

interface AddFundsModalProps {
  isOpen: boolean;
  goal: SavingsGoal;
  onClose: () => void;
  onSuccess: (amount: number, accountId?: string) => void;
}

export function AddFundsModal({ isOpen, goal, onClose, onSuccess }: AddFundsModalProps) {
  const [amount, setAmount] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/accounts")
        .then((res) => res.json())
        .then((data) => setAccounts(data))
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!num || num <= 0) return;
    
    setLoading(true);
    // Add small delay to let UI show loading state
    setTimeout(() => {
      onSuccess(num, selectedAccountId || undefined);
      setLoading(false);
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-3xl glass-strong border border-white/10 p-6 shadow-2xl relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5" style={{ color: goal.color }} />
            <h4 className="text-base font-extrabold text-foreground">Aportar a Meta</h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          Estás agregando fondos a la meta <strong>{goal.name}</strong>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5">
              Monto a aportar ($ {goal.currency})
            </label>
            <input
              type="number"
              required
              min="1"
              step="0.01"
              autoFocus
              placeholder="Ej. 50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-white/10 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5">
              Origen de los fondos (opcional)
            </label>
            <div className="relative">
              <Wallet className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-card border border-white/10 text-sm text-foreground outline-none focus:border-primary appearance-none"
              >
                <option value="">Ninguno - Solo registrar aporte</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    Debitar de {acc.name} (${acc.balance?.toLocaleString("es-AR")})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Si seleccionas una cuenta, el dinero se restará automáticamente de su saldo.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:bg-white/5 border border-white/10 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-opacity disabled:opacity-50"
              style={{ background: goal.color }}
            >
              {loading ? "Aportando..." : "Confirmar Aporte"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
