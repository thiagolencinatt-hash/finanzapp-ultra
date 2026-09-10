// ============================================================
// FinanzApp Ultra — Hook de persistencia local para modo demo
// Usa localStorage para CRUD sin depender del servidor
// ============================================================
"use client";

import { useState, useCallback, useEffect } from "react";
import {
  getStoredTransactions,
  addStoredTransaction,
  updateStoredTransaction,
  deleteStoredTransaction,
  clearStoredTransactions,
  getStoredInstallments,
  addStoredInstallment,
  updateStoredInstallment,
  deleteStoredInstallment,
  getStoredGoals,
  addStoredGoal,
  updateStoredGoal,
  deleteStoredGoal,
  getStoredChatHistory,
  addStoredChatMessage,
  getStoredProfile,
  type StoredChatMessage,
} from "@/lib/storage/local-store";
import type { Transaction, Installment, SavingsGoal } from "@/lib/types";

export function useLocalFinance() {
  const [transactions, setTransactions] = useState<Partial<Transaction>[]>([]);
  const [installments, setInstallments] = useState<Partial<Installment>[]>([]);
  const [goals, setGoals] = useState<Partial<SavingsGoal>[]>([]);
  const [chatHistory, setChatHistory] = useState<StoredChatMessage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Cargar datos desde localStorage al montar
  useEffect(() => {
    setTransactions(getStoredTransactions());
    setInstallments(getStoredInstallments());
    setGoals(getStoredGoals());
    setChatHistory(getStoredChatHistory());
    setIsLoaded(true);
  }, []);

  // Transactions
  const addTransaction = useCallback((tx: Partial<Transaction>) => {
    const newTx = addStoredTransaction(tx);
    setTransactions(getStoredTransactions());
    // Notificar a otras partes de la app
    window.dispatchEvent(new Event("finance-refresh"));
    return newTx;
  }, []);

  const editTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    const updated = updateStoredTransaction(id, updates);
    setTransactions(getStoredTransactions());
    window.dispatchEvent(new Event("finance-refresh"));
    return updated;
  }, []);

  const removeTransaction = useCallback((id: string) => {
    deleteStoredTransaction(id);
    setTransactions(getStoredTransactions());
    window.dispatchEvent(new Event("finance-refresh"));
  }, []);

  const clearTransactions = useCallback(() => {
    clearStoredTransactions();
    setTransactions([]);
    window.dispatchEvent(new Event("finance-refresh"));
  }, []);

  // Installments
  const addInstallment = useCallback((inst: Partial<Installment>) => {
    const newInst = addStoredInstallment(inst);
    setInstallments(getStoredInstallments());
    window.dispatchEvent(new Event("finance-refresh"));
    return newInst;
  }, []);

  const editInstallment = useCallback((id: string, updates: Partial<Installment>) => {
    const updated = updateStoredInstallment(id, updates);
    setInstallments(getStoredInstallments());
    window.dispatchEvent(new Event("finance-refresh"));
    return updated;
  }, []);

  const removeInstallment = useCallback((id: string) => {
    deleteStoredInstallment(id);
    setInstallments(getStoredInstallments());
    window.dispatchEvent(new Event("finance-refresh"));
  }, []);

  // Goals
  const addGoal = useCallback((goal: Partial<SavingsGoal>) => {
    const newGoal = addStoredGoal(goal);
    setGoals(getStoredGoals());
    window.dispatchEvent(new Event("finance-refresh"));
    return newGoal;
  }, []);

  const editGoal = useCallback((id: string, updates: Partial<SavingsGoal>) => {
    const updated = updateStoredGoal(id, updates);
    setGoals(getStoredGoals());
    window.dispatchEvent(new Event("finance-refresh"));
    return updated;
  }, []);

  const removeGoal = useCallback((id: string) => {
    deleteStoredGoal(id);
    setGoals(getStoredGoals());
    window.dispatchEvent(new Event("finance-refresh"));
  }, []);

  // Chat
  const addChatMsg = useCallback((msg: StoredChatMessage) => {
    addStoredChatMessage(msg);
    setChatHistory(getStoredChatHistory());
  }, []);

  // Computed summaries
  const profile = getStoredProfile();

  const summary = {
    totalBalance: transactions.reduce((sum, t) => {
      if (t.type === "income") return sum + (t.amount || 0);
      if (t.type === "expense") return sum - (t.amount || 0);
      return sum;
    }, profile?.salary || 0),
    income30d: transactions
      .filter((t) => {
        if (t.type !== "income") return false;
        const d = new Date(t.date || "");
        const ago = new Date();
        ago.setDate(ago.getDate() - 30);
        return d >= ago;
      })
      .reduce((sum, t) => sum + (t.amount || 0), 0),
    expense30d: transactions
      .filter((t) => {
        if (t.type !== "expense") return false;
        const d = new Date(t.date || "");
        const ago = new Date();
        ago.setDate(ago.getDate() - 30);
        return d >= ago;
      })
      .reduce((sum, t) => sum + (t.amount || 0), 0),
    monthlyInstallments: installments
      .filter((i) => i.is_active)
      .reduce((sum, i) => sum + (i.installment_amount || 0), 0),
  };

  return {
    // State
    transactions,
    installments,
    goals,
    chatHistory,
    summary,
    isLoaded,
    // Actions
    addTransaction,
    editTransaction,
    removeTransaction,
    clearTransactions,
    addInstallment,
    editInstallment,
    removeInstallment,
    addGoal,
    editGoal,
    removeGoal,
    addChatMsg,
  };
}
