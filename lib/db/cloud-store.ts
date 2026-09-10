import { createClient } from "@/lib/supabase/server";
import type {
  Account,
  Category,
  FinancialSummary,
  Installment,
  SavingsGoal,
  Transaction,
  CategoryBudget,
  Subscription,
  ChatMessage,
} from "@/lib/types";

// ============================================================
// Métodos de lectura y mutación por usuario en SUPABASE
// ============================================================

export async function getUserStore(userId: string, userInfo?: any): Promise<{ user: any, accounts: any[], goals: any[], budgets: any[], subscriptions: any[], installments: any[], transactions: any[] }> {
  return { user: {}, accounts: [], goals: [], budgets: [], subscriptions: [], installments: [], transactions: [] }; 
}

export async function saveUserStore(userId: string) {
}

export async function getUserSummary(
  userId: string,
  userInfo?: { email?: string; name?: string; currency?: string; salary?: number }
): Promise<FinancialSummary> {
  const supabase = await createClient();

  const [
    { data: accounts },
    { data: transactions },
    { data: installments },
    { data: goals },
    { data: categories },
  ] = await Promise.all([
    supabase.from("accounts").select("*").eq("user_id", userId),
    supabase.from("transactions").select("*, category:categories(*), account:accounts(*)").eq("user_id", userId).order("date", { ascending: false }),
    supabase.from("installments").select("*").eq("user_id", userId).eq("is_active", true),
    supabase.from("savings_goals").select("*").eq("user_id", userId),
    supabase.from("categories").select("*").or(`user_id.eq.${userId},user_id.is.null`),
  ]);

  const accs = (accounts as Account[]) || [];
  const txs = (transactions as Transaction[]) || [];
  const insts = (installments as Installment[]) || [];
  const gls = (goals as SavingsGoal[]) || [];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysStr = thirtyDaysAgo.toISOString().split("T")[0];

  const totalBalance = accs
    .filter((a) => a.is_active)
    .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  const income30d = txs
    .filter((t) => t.type === "income" && t.date >= thirtyDaysStr)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const expense30d = txs
    .filter((t) => t.type === "expense" && t.date >= thirtyDaysStr)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalInstallmentsMonthly = insts
    .filter((i) => i.is_active)
    .reduce((sum, i) => sum + (Number(i.installment_amount) || 0), 0);

  // Categorías de gastos
  const categoryMap: Record<string, { category_name: string; total: number; count: number; color?: string; icon?: string }> = {};
  txs
    .filter((t) => t.type === "expense" && t.date >= thirtyDaysStr)
    .forEach((t) => {
      const name = t.category?.name || "Sin categoría";
      if (!categoryMap[name]) {
        categoryMap[name] = { category_name: name, total: 0, count: 0, color: t.category?.color, icon: t.category?.icon };
      }
      categoryMap[name].total += Number(t.amount) || 0;
      categoryMap[name].count++;
    });

  const topCategories = Object.values(categoryMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const todayStr = new Date().toISOString().split("T")[0];
  const in7Days = new Date();
  in7Days.setDate(in7Days.getDate() + 7);
  const in7DaysStr = in7Days.toISOString().split("T")[0];

  const upcomingInstallments = insts
    .filter((i) => i.is_active && (i as any).next_due_date && (i as any).next_due_date >= todayStr && (i as any).next_due_date <= in7DaysStr)
    .slice(0, 5)
    .map((i) => {
      const acc = accs.find((a) => a.id === i.account_id);
      return {
        description: i.description,
        amount: Number(i.installment_amount) || 0,
        due_date: (i as any).next_due_date || "",
        account_name: acc?.name || "Tarjeta",
      };
    });

  return {
    total_balance: totalBalance,
    total_balance_ars: totalBalance,
    income_30d: income30d,
    expense_30d: expense30d,
    total_installments_monthly: totalInstallmentsMonthly,
    active_installments_count: insts.filter((i) => i.is_active).length,
    savings_goals_progress: gls.length > 0
      ? gls.reduce((acc, g) => acc + (g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0), 0) / gls.length
      : 0,
    top_categories: topCategories,
    upcoming_installments: upcomingInstallments,
    recent_transactions: txs.slice(0, 8),
    configured_salary: userInfo?.salary || 980000,
    salary_pay_day: 5,
    accounts: accs,
    savings_goals: gls,
    active_installments: insts,
    category_budgets: [],
    subscriptions: [],
  };
}

export async function getUserTransactions(
  userId: string,
  options?: {
    type?: string;
    accountId?: string;
    categoryId?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ data: Transaction[]; count: number }> {
  const supabase = await createClient();
  let query = supabase
    .from("transactions")
    .select("*, category:categories(*), account:accounts(*)", { count: "exact" })
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (options?.type) query = query.eq("type", options.type);
  if (options?.accountId) query = query.eq("account_id", options.accountId);
  if (options?.categoryId) query = query.eq("category_id", options.categoryId);
  if (options?.from) query = query.gte("date", options.from);
  if (options?.to) query = query.lte("date", options.to);

  const limit = options?.limit || 50;
  const offset = options?.offset || 0;
  
  query = query.range(offset, offset + limit - 1);

  const { data, count } = await query;
  return { data: (data as Transaction[]) || [], count: count || 0 };
}

export async function addUserTransaction(userId: string, input: Partial<Transaction>): Promise<Transaction> {
  const supabase = await createClient();
  
  let targetAccountId = input.account_id;
  if (!targetAccountId) {
    const { data: accounts } = await supabase.from("accounts").select("id").eq("user_id", userId).limit(1);
    if (accounts && accounts.length > 0) {
      targetAccountId = accounts[0].id;
    } else {
      const acc = await addUserAccount(userId, { name: "Billetera Principal" });
      targetAccountId = acc.id;
    }
  }

  const { data: inserted, error } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      account_id: targetAccountId,
      type: input.type || "expense",
      amount: Number(input.amount) || 0,
      currency: input.currency || "ARS",
      category_id: input.category_id || null,
      description: input.description || null,
      date: input.date || new Date().toISOString().split("T")[0],
    })
    .select()
    .single();

  if (error) throw error;
  
  const amount = Number(input.amount) || 0;
  if (input.type === "income" && targetAccountId) {
    await updateBalance(targetAccountId, amount);
  } else if (input.type === "expense" && targetAccountId) {
    await updateBalance(targetAccountId, -amount);
  } else if (input.type === "transfer" && input.transfer_to_account_id && targetAccountId) {
    await updateBalance(targetAccountId, -amount);
    await updateBalance(input.transfer_to_account_id, amount);
  }

  return inserted as Transaction;
}

export async function updateUserTransaction(userId: string, id: string, updates: Partial<Transaction>): Promise<Transaction | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .update({
      type: updates.type,
      amount: updates.amount !== undefined ? Number(updates.amount) : undefined,
      currency: updates.currency,
      category_id: updates.category_id,
      description: updates.description,
      date: updates.date,
      account_id: updates.account_id,
      transfer_to_account_id: updates.transfer_to_account_id,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return null;
  return data as Transaction;
}

export async function deleteUserTransaction(userId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", userId);
  return !error;
}

async function updateBalance(accountId: string, amountChange: number) {
  const supabase = await createClient();
  const { data: acc } = await supabase.from("accounts").select("balance").eq("id", accountId).single();
  if (acc) {
    await supabase.from("accounts").update({ balance: Number(acc.balance) + amountChange }).eq("id", accountId);
  }
}

export async function getUserAccounts(userId: string): Promise<Account[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("accounts").select("*").eq("user_id", userId);
  return (data as Account[]) || [];
}

export async function addUserAccount(userId: string, input: Partial<Account>): Promise<Account> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .insert({
      user_id: userId,
      name: input.name || "Nueva Cuenta",
      type: input.type || "digital_wallet",
      balance: Number(input.balance) || 0,
      currency: input.currency || "ARS",
      color: input.color || "#3B82F6",
      icon: input.icon || "Wallet",
    })
    .select()
    .single();

  if (error) throw error;
  return data as Account;
}

export async function updateUserAccount(userId: string, id: string, updates: Partial<Account>): Promise<Account | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("accounts").update(updates).eq("id", id).eq("user_id", userId).select().single();
  if (error) return null;
  return data as Account;
}

export async function deleteUserAccount(userId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").delete().eq("id", id).eq("user_id", userId);
  return !error;
}

export async function getUserCategories(userId: string): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").or(`user_id.eq.${userId},user_id.is.null`);
  return (data as Category[]) || [];
}

export async function addUserCategory(userId: string, input: Partial<Category>): Promise<Category> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: userId,
      name: input.name || "Nueva Categoría",
      icon: input.icon || "tag",
      color: input.color || "#6366F1",
      type: input.type || "expense",
    })
    .select()
    .single();
  if (error) throw error;
  return data as Category;
}

export async function getUserGoals(userId: string, type?: string): Promise<SavingsGoal[]> {
  const supabase = await createClient();
  let query = supabase.from("savings_goals").select("*").eq("user_id", userId);
  if (type) query = query.eq("type", type);
  const { data } = await query;
  return (data as SavingsGoal[]) || [];
}

export async function addUserGoal(userId: string, input: Partial<SavingsGoal>): Promise<SavingsGoal> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("savings_goals")
    .insert({
      user_id: userId,
      name: input.name || "Meta",
      type: input.type || "goal",
      description: input.description || null,
      target_amount: Number(input.target_amount) || 0,
      current_amount: Number(input.current_amount) || 0,
      target_date: input.target_date || null,
      monthly_contribution: Number(input.monthly_contribution) || 0,
      icon: input.icon || "Target",
      color: input.color || "#10B981",
    })
    .select()
    .single();
  if (error) throw error;
  return data as SavingsGoal;
}

export async function updateUserGoal(userId: string, id: string, updates: Partial<SavingsGoal>): Promise<SavingsGoal | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("savings_goals").update(updates).eq("id", id).eq("user_id", userId).select().single();
  if (error) return null;
  return data as SavingsGoal;
}

export async function deleteUserGoal(userId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("savings_goals").delete().eq("id", id).eq("user_id", userId);
  return !error;
}

export async function getUserInstallments(userId: string): Promise<Installment[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("installments").select("*").eq("user_id", userId);
  return (data as Installment[]) || [];
}

export async function addUserInstallment(userId: string, input: Partial<Installment>): Promise<Installment> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("installments")
    .insert({
      user_id: userId,
      account_id: input.account_id,
      description: input.description,
      category_id: input.category_id || null,
      total_amount: Number(input.total_amount) || 0,
      total_installments: Number(input.total_installments) || 1,
      paid_installments: Number(input.paid_installments) || 0,
      installment_amount: Number(input.installment_amount) || 0,
      has_interest: Boolean(input.has_interest),
      interest_rate: Number(input.interest_rate) || 0,
      due_day: Number(input.due_day) || 10,
      start_date: input.start_date || new Date().toISOString().split("T")[0],
    })
    .select()
    .single();
  if (error) throw error;
  return data as Installment;
}

export async function updateUserInstallment(userId: string, id: string, updates: Partial<Installment>): Promise<Installment | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("installments").update(updates).eq("id", id).eq("user_id", userId).select().single();
  if (error) return null;
  return data as Installment;
}

export async function deleteUserInstallment(userId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("installments").delete().eq("id", id).eq("user_id", userId);
  return !error;
}

export async function quickAdjustUserFinances(userId: string, params: any): Promise<FinancialSummary> {
  return getUserSummary(userId);
}

export async function resetUserFinances(userId: string, params: any): Promise<FinancialSummary> {
  return getUserSummary(userId);
}

export async function getUserChatMessages(userId: string, limit: number = 30): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("ai_memories").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  return (data?.reverse() as ChatMessage[]) || [];
}

export async function addUserChatMessage(userId: string, message: ChatMessage): Promise<void> {
  const supabase = await createClient();
  await supabase.from("ai_memories").insert({
    user_id: userId,
    role: message.role,
    content: message.content,
    metadata: message.metadata || {},
  });
}
