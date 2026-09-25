import type { Transaction } from "@/lib/types";

/**
 * Normaliza un objeto de transacción para garantizar que todos los campos
 * obligatorios existan con valores válidos antes de inyectarlo al estado de React.
 * 
 * GEL-021: Previene crashes del dashboard por campos faltantes o tipos inválidos
 * en transacciones creadas por la IA, formularios o sincronización.
 */
export function normalizeTransaction(raw: Record<string, unknown>): Transaction {
  const amount = Number(raw.amount);
  const rawDate = String(raw.date || raw.created_at || new Date().toISOString());
  
  // Normalizar la fecha: si es ISO completa, extraer solo la parte YYYY-MM-DD
  let date: string;
  try {
    const parsed = new Date(rawDate);
    if (isNaN(parsed.getTime())) {
      date = new Date().toISOString().split("T")[0];
    } else {
      date = parsed.toISOString().split("T")[0];
    }
  } catch {
    date = new Date().toISOString().split("T")[0];
  }

  return {
    id: String(raw.id || crypto.randomUUID()),
    user_id: String(raw.user_id || ""),
    account_id: String(raw.account_id || ""),
    type: (raw.type === "income" || raw.type === "expense" || raw.type === "transfer")
      ? raw.type
      : "expense",
    amount: isFinite(amount) && amount >= 0 ? amount : 0,
    currency: String(raw.currency || "ARS"),
    category_id: raw.category_id != null ? String(raw.category_id) : null,
    description: raw.description != null ? String(raw.description) : null,
    date,
    installment_id: raw.installment_id != null ? String(raw.installment_id) : null,
    transfer_to_account_id: raw.transfer_to_account_id != null ? String(raw.transfer_to_account_id) : null,
    exchange_rate: raw.exchange_rate != null ? Number(raw.exchange_rate) : null,
    urgency: (raw.urgency === "essential" || raw.urgency === "important" || raw.urgency === "nice_to_have" || raw.urgency === "unnecessary")
      ? raw.urgency
      : null,
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    created_at: String(raw.created_at || new Date().toISOString()),
    updated_at: String(raw.updated_at || raw.created_at || new Date().toISOString()),
    // Joins (optional, provide safe defaults)
    account: raw.account && typeof raw.account === "object" ? raw.account as Transaction["account"] : undefined,
    category: raw.category && typeof raw.category === "object" ? raw.category as Transaction["category"] : undefined,
    transfer_to_account: raw.transfer_to_account && typeof raw.transfer_to_account === "object" ? raw.transfer_to_account as Transaction["transfer_to_account"] : undefined,
    synced: typeof raw.synced === "boolean" ? raw.synced : undefined,
  };
}

/**
 * Normaliza un array de transacciones, filtrando las que tengan datos irrecuperables.
 */
export function normalizeTransactions(rawList: unknown[]): Transaction[] {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .filter((item): item is Record<string, unknown> => item != null && typeof item === "object")
    .map(normalizeTransaction);
}
