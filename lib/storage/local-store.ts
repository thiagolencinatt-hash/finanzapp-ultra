// ============================================================
// FinanzApp Ultra — Local Storage Persistence Layer
// Persiste datos del modo demo en localStorage del navegador
// para que sobrevivan recargas de página.
// ============================================================

import type { Transaction, Installment, SavingsGoal } from "@/lib/types";

const STORAGE_KEYS = {
  TRANSACTIONS: "finanzapp_transactions",
  INSTALLMENTS: "finanzapp_installments",
  GOALS: "finanzapp_goals",
  CHAT_HISTORY: "finanzapp_chat_history",
  USER_PROFILE: "finanzapp_user_profile",
  SALARY_CONFIG: "finanzapp_salary_config",
} as const;

// ============================================================
// Generic helpers
// ============================================================
function getItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Si localStorage está lleno, limpiar datos viejos
    console.warn("[LocalStore] Error saving:", e);
    try {
      // Intentar liberar espacio borrando chat history primero
      localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Sin espacio, ignorar
    }
  }
}

// ============================================================
// Transactions
// ============================================================
export function getStoredTransactions(): Partial<Transaction>[] {
  return getItem(STORAGE_KEYS.TRANSACTIONS, []);
}

export function saveTransactions(txs: Partial<Transaction>[]): void {
  setItem(STORAGE_KEYS.TRANSACTIONS, txs);
}

export function addStoredTransaction(tx: Partial<Transaction>): Partial<Transaction> {
  const all = getStoredTransactions();
  const newTx = {
    ...tx,
    id: tx.id || `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    created_at: tx.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    date: tx.date || new Date().toISOString().split("T")[0],
  };
  all.unshift(newTx);
  saveTransactions(all);
  return newTx;
}

export function updateStoredTransaction(id: string, updates: Partial<Transaction>): Partial<Transaction> | null {
  const all = getStoredTransactions();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...updates, updated_at: new Date().toISOString() };
  saveTransactions(all);
  return all[idx];
}

export function deleteStoredTransaction(id: string): boolean {
  const all = getStoredTransactions();
  const filtered = all.filter((t) => t.id !== id);
  if (filtered.length === all.length) return false;
  saveTransactions(filtered);
  return true;
}

export function clearStoredTransactions(): void {
  saveTransactions([]);
}

// ============================================================
// Installments
// ============================================================
export function getStoredInstallments(): Partial<Installment>[] {
  return getItem(STORAGE_KEYS.INSTALLMENTS, []);
}

export function saveInstallments(items: Partial<Installment>[]): void {
  setItem(STORAGE_KEYS.INSTALLMENTS, items);
}

export function addStoredInstallment(inst: Partial<Installment>): Partial<Installment> {
  const all = getStoredInstallments();
  const newInst = {
    ...inst,
    id: inst.id || `local-inst-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    paid_installments: inst.paid_installments || 0,
    is_active: true,
    installment_amount: inst.total_amount && inst.total_installments
      ? Math.round((inst.total_amount / inst.total_installments) * 100) / 100
      : 0,
  };
  all.unshift(newInst);
  saveInstallments(all);
  return newInst;
}

export function updateStoredInstallment(id: string, updates: Partial<Installment>): Partial<Installment> | null {
  const all = getStoredInstallments();
  const idx = all.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...updates, updated_at: new Date().toISOString() };
  saveInstallments(all);
  return all[idx];
}

export function deleteStoredInstallment(id: string): boolean {
  const all = getStoredInstallments();
  const filtered = all.filter((i) => i.id !== id);
  if (filtered.length === all.length) return false;
  saveInstallments(filtered);
  return true;
}

// ============================================================
// Savings Goals
// ============================================================
export function getStoredGoals(): Partial<SavingsGoal>[] {
  return getItem(STORAGE_KEYS.GOALS, []);
}

export function saveGoals(goals: Partial<SavingsGoal>[]): void {
  setItem(STORAGE_KEYS.GOALS, goals);
}

export function addStoredGoal(goal: Partial<SavingsGoal>): Partial<SavingsGoal> {
  const all = getStoredGoals();
  const newGoal = {
    ...goal,
    id: goal.id || `local-goal-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    current_amount: goal.current_amount || 0,
    is_completed: false,
    priority: goal.priority || 1,
  };
  all.push(newGoal);
  saveGoals(all);
  return newGoal;
}

export function updateStoredGoal(id: string, updates: Partial<SavingsGoal>): Partial<SavingsGoal> | null {
  const all = getStoredGoals();
  const idx = all.findIndex((g) => g.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...updates, updated_at: new Date().toISOString() };
  saveGoals(all);
  return all[idx];
}

export function deleteStoredGoal(id: string): boolean {
  const all = getStoredGoals();
  const filtered = all.filter((g) => g.id !== id);
  if (filtered.length === all.length) return false;
  saveGoals(filtered);
  return true;
}

// ============================================================
// Chat History
// ============================================================
export interface StoredChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export function getStoredChatHistory(): StoredChatMessage[] {
  return getItem(STORAGE_KEYS.CHAT_HISTORY, []);
}

export function addStoredChatMessage(msg: StoredChatMessage): void {
  const all = getStoredChatHistory();
  all.push(msg);
  // Mantener máximo 100 mensajes
  const trimmed = all.length > 100 ? all.slice(-100) : all;
  setItem(STORAGE_KEYS.CHAT_HISTORY, trimmed);
}

export function clearStoredChatHistory(): void {
  setItem(STORAGE_KEYS.CHAT_HISTORY, []);
}

// ============================================================
// User Profile & Salary Config
// ============================================================
export interface UserProfile {
  name: string;
  email: string;
  currency: string;
  salary: number;
  loggedInAt: string;
}

export function getStoredProfile(): UserProfile | null {
  return getItem(STORAGE_KEYS.USER_PROFILE, null);
}

export function saveProfile(profile: UserProfile): void {
  setItem(STORAGE_KEYS.USER_PROFILE, profile);
}

export interface SalaryConfig {
  salary: number;
  payDay: number;
  currency: string;
}

export function getStoredSalaryConfig(): SalaryConfig | null {
  return getItem(STORAGE_KEYS.SALARY_CONFIG, null);
}

export function saveSalaryConfig(config: SalaryConfig): void {
  setItem(STORAGE_KEYS.SALARY_CONFIG, config);
}

// ============================================================
// Storage stats (for debugging)
// ============================================================
export function getStorageStats() {
  if (typeof window === "undefined") return null;
  const keys = Object.values(STORAGE_KEYS);
  let totalSize = 0;
  const breakdown: Record<string, number> = {};
  for (const key of keys) {
    const val = localStorage.getItem(key);
    const size = val ? new Blob([val]).size : 0;
    breakdown[key] = size;
    totalSize += size;
  }
  return { totalSize, breakdown, totalKB: Math.round(totalSize / 1024) };
}

// ============================================================
// Reset All Local Finances to Zero
// ============================================================
export function clearAllStoredFinances(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.INSTALLMENTS);
    localStorage.removeItem(STORAGE_KEYS.GOALS);
    localStorage.removeItem(STORAGE_KEYS.SALARY_CONFIG);
    localStorage.removeItem("finanzapp_demo_tx_count");
    localStorage.removeItem("finanzapp_tx_draft");
    localStorage.removeItem("finanzapp_inst_draft");
    localStorage.removeItem("finanzapp_goal_draft");
    localStorage.removeItem("finanzapp_acc_draft");
  } catch (e) {
    console.error("[LocalStore] Error clearing finances:", e);
  }
}

