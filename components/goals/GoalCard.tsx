"use client";

import { useState } from "react";
import { Target, ShoppingBag, ExternalLink, PlusCircle, Trash2 } from "lucide-react";
import type { SavingsGoal } from "@/lib/types";
import { formatCurrency, formatPercent, monthsToGoal, monthsToText } from "@/lib/utils/currency";
import { AddFundsModal } from "./AddFundsModal";

interface GoalCardProps {
  goal: SavingsGoal;
  onAddFunds: (amount: number, accountId?: string) => void;
  onDelete: () => void;
  onRefresh: () => void;
}

export function GoalCard({ goal, onAddFunds, onDelete }: GoalCardProps) {
  const [showAdd, setShowAdd] = useState(false);

  const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
  const remaining = goal.target_amount - goal.current_amount;
  const months = monthsToGoal(goal.target_amount, goal.current_amount, goal.monthly_contribution);
  const isWishlist = goal.type === "wishlist";

  return (
    <div
      className="rounded-2xl p-4 card-hover"
      style={{
        background: "hsl(var(--card))",
        border: `1px solid ${goal.is_completed ? "hsl(var(--income) / 0.4)" : "hsl(var(--border))"}`,
        opacity: goal.is_completed ? 0.8 : 1,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `${goal.color}20` }}
          >
            {isWishlist
              ? <ShoppingBag className="w-4.5 h-4.5" style={{ color: goal.color }} />
              : <Target className="w-4.5 h-4.5" style={{ color: goal.color }} />}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>{goal.name}</p>
            {goal.product_url && (
              <a href={goal.product_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-[10px]" style={{ color: "hsl(var(--primary))" }}>
                Ver producto <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {goal.is_completed && (
            <span className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: "hsl(var(--income-muted))", color: "hsl(var(--income))" }}>
              ¡Completada! 🎉
            </span>
          )}
          <button type="button" onClick={onDelete} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
            style={{ color: "hsl(var(--muted-foreground))" }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Amounts */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-2xl font-bold" style={{ color: "hsl(var(--foreground))" }}>
            {formatCurrency(goal.current_amount, goal.currency, true)}
          </p>
          <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
            de {formatCurrency(goal.target_amount, goal.currency, true)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold" style={{ color: goal.color }}>{formatPercent(Math.min(progress, 100))}</p>
          {remaining > 0 && (
            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
              Faltan {formatCurrency(remaining, goal.currency, true)}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 rounded-full overflow-hidden mb-3" style={{ background: "hsl(var(--muted))" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(progress, 100)}%`,
            background: goal.is_completed
              ? "hsl(var(--income))"
              : `linear-gradient(90deg, ${goal.color}, ${goal.color}cc)`,
          }}
        />
      </div>

      {/* Months estimate */}
      {goal.monthly_contribution > 0 && !goal.is_completed && (
        <p className="text-xs mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>
          📅 A {formatCurrency(goal.monthly_contribution, goal.currency, true)}/mes → <span className="font-medium" style={{ color: "hsl(var(--foreground))" }}>{monthsToText(months)}</span>
        </p>
      )}

      {/* Add funds */}
      {!goal.is_completed && (
        <button type="button" onClick={() => setShowAdd(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors"
          style={{ background: `${goal.color}15`, color: goal.color }}>
          <PlusCircle className="w-3.5 h-3.5" /> Agregar fondos
        </button>
      )}

      <AddFundsModal
        isOpen={showAdd}
        goal={goal}
        onClose={() => setShowAdd(false)}
        onSuccess={(amount, accId) => {
          setShowAdd(false);
          onAddFunds(amount, accId);
        }}
      />
    </div>
  );
}
