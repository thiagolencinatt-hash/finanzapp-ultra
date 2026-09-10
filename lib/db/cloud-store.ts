import fs from "fs";
import path from "path";
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
import {
  demoAccounts,
  demoCategories,
  demoTransactions,
  demoInstallments,
  demoGoals,
  demoBudgets,
  demoSubscriptions,
} from "@/lib/demo-data";

export interface UserFinancialStore {
  user: {
    id: string;
    email: string;
    name: string;
    currency: string;
    salary: number;
    payDay: number;
  };
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  installments: Installment[];
  goals: SavingsGoal[];
  budgets: CategoryBudget[];
  subscriptions: Subscription[];
  chatMessages: ChatMessage[];
  lastUpdated: string;
}

function getDataDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join("/tmp", "users_data");
  }
  return path.join(process.cwd(), "data", "users_data");
}

const memoryCache = new Map<string, UserFinancialStore>();

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function getFilePath(userId: string): string {
  return path.join(getDataDir(), `${sanitizeId(userId)}.json`);
}

function ensureDirectory() {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createInitialUserStore(
  userId: string,
  userInfo?: { email?: string; name?: string; currency?: string; salary?: number }
): UserFinancialStore {
  const now = new Date().toISOString();
  const isDemo = userId === "demo-user";

  if (isDemo) {
    return {
      user: {
        id: "demo-user",
        email: "demo@finanzapp.com",
        name: "Usuario Demo",
        currency: "ARS",
        salary: 980000,
        payDay: 5,
      },
      accounts: JSON.parse(JSON.stringify(demoAccounts)),
      categories: JSON.parse(JSON.stringify(demoCategories)),
      transactions: JSON.parse(JSON.stringify(demoTransactions)),
      installments: JSON.parse(JSON.stringify(demoInstallments)),
      goals: JSON.parse(JSON.stringify(demoGoals)),
      budgets: JSON.parse(JSON.stringify(demoBudgets)),
      subscriptions: JSON.parse(JSON.stringify(demoSubscriptions)),
      chatMessages: [],
      lastUpdated: now,
    };
  }

  // Usuario real nuevo: Comienza en limpio con su configuración personalizada
  const defaultAccId = `acc-${Date.now()}-1`;
  const defaultAcc: Account = {
    id: defaultAccId,
    user_id: userId,
    name: "Mi Billetera Principal",
    type: "digital_wallet",
    balance: 0,
    currency: userInfo?.currency || "ARS",
    color: "#10B981",
    icon: "Wallet",
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  const initialCategories: Category[] = demoCategories.map((c, i) => ({
    ...c,
    id: `cat-user-${Date.now()}-${i}`,
    user_id: userId,
    created_at: now,
  }));

  return {
    user: {
      id: userId,
      email: userInfo?.email || "usuario@finanzapp.com",
      name: userInfo?.name || "Usuario",
      currency: userInfo?.currency || "ARS",
      salary: userInfo?.salary || 980000,
      payDay: 5,
    },
    accounts: [defaultAcc],
    categories: initialCategories,
    transactions: [],
    installments: [],
    goals: [],
    budgets: [],
    subscriptions: [],
    chatMessages: [],
    lastUpdated: now,
  };
}

export function getUserStore(
  userId: string,
  userInfo?: { email?: string; name?: string; currency?: string; salary?: number }
): UserFinancialStore {
  const cached = memoryCache.get(userId);
  if (cached) return cached;

  ensureDirectory();
  const filePath = getFilePath(userId);

  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const store: UserFinancialStore = JSON.parse(raw);
      memoryCache.set(userId, store);
      return store;
    } catch (e) {
      console.warn(`[CloudStore] Error leyendo datos de ${userId}, regenerando:`, e);
    }
  }

  const initial = createInitialUserStore(userId, userInfo);
  memoryCache.set(userId, initial);
  saveUserStore(userId);
  return initial;
}

export function saveUserStore(userId: string): void {
  const store = memoryCache.get(userId);
  if (!store) return;

  store.lastUpdated = new Date().toISOString();
  ensureDirectory();
  const filePath = getFilePath(userId);

  try {
    fs.writeFileSync(filePath, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error(`[CloudStore] Error guardando datos de ${userId} en disco:`, err);
  }
}

// ============================================================
// Métodos de lectura y mutación por usuario
// ============================================================

export function getUserSummary(
  userId: string,
  userInfo?: { email?: string; name?: string; currency?: string; salary?: number }
): FinancialSummary {
  const store = getUserStore(userId, userInfo);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysStr = thirtyDaysAgo.toISOString().split("T")[0];

  const totalBalance = store.accounts
    .filter((a) => a.is_active)
    .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  const income30d = store.transactions
    .filter((t) => t.type === "income" && t.date >= thirtyDaysStr)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const expense30d = store.transactions
    .filter((t) => t.type === "expense" && t.date >= thirtyDaysStr)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalInstallmentsMonthly = store.installments
    .filter((i) => i.is_active)
    .reduce((sum, i) => sum + (Number(i.installment_amount) || 0), 0);

  // Categorías de gastos
  const categoryMap: Record<string, { category_name: string; total: number; count: number; color?: string; icon?: string }> = {};
  store.transactions
    .filter((t) => t.type === "expense" && t.date >= thirtyDaysStr)
    .forEach((t) => {
      const cat = store.categories.find((c) => c.id === t.category_id);
      const name = cat?.name || t.category?.name || "Sin categoría";
      if (!categoryMap[name]) {
        categoryMap[name] = { category_name: name, total: 0, count: 0, color: cat?.color, icon: cat?.icon };
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

  const upcomingInstallments = store.installments
    .filter((i) => i.is_active && i.next_due_date && i.next_due_date >= todayStr && i.next_due_date <= in7DaysStr)
    .slice(0, 5)
    .map((i) => {
      const acc = store.accounts.find((a) => a.id === i.account_id);
      return {
        description: i.description,
        amount: Number(i.installment_amount) || 0,
        due_date: i.next_due_date || "",
        account_name: acc?.name || "Tarjeta",
      };
    });

  const recentTransactions = [...store.transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8)
    .map((t) => ({
      ...t,
      account: store.accounts.find((a) => a.id === t.account_id),
      category: store.categories.find((c) => c.id === t.category_id),
    }));

  return {
    total_balance: totalBalance,
    total_balance_ars: totalBalance,
    income_30d: income30d,
    expense_30d: expense30d,
    total_installments_monthly: totalInstallmentsMonthly,
    active_installments_count: store.installments.filter((i) => i.is_active).length,
    savings_goals_progress: store.goals.length > 0
      ? store.goals.reduce((acc, g) => acc + (g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0), 0) / store.goals.length
      : 0,
    top_categories: topCategories,
    upcoming_installments: upcomingInstallments,
    recent_transactions: recentTransactions,
    configured_salary: store.user.salary,
    salary_pay_day: store.user.payDay,
    accounts: store.accounts,
    savings_goals: store.goals,
    active_installments: store.installments,
    category_budgets: store.budgets,
    subscriptions: store.subscriptions,
  };
}

// ---- Transacciones ----
export function getUserTransactions(
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
): { data: Transaction[]; count: number } {
  const store = getUserStore(userId);
  let list = [...store.transactions];

  if (options?.type) list = list.filter((t) => t.type === options.type);
  if (options?.accountId) list = list.filter((t) => t.account_id === options.accountId);
  if (options?.categoryId) list = list.filter((t) => t.category_id === options.categoryId);
  if (options?.from) list = list.filter((t) => t.date >= options.from!);
  if (options?.to) list = list.filter((t) => t.date <= options.to!);

  list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const count = list.length;
  const offset = options?.offset || 0;
  const limit = options?.limit || 50;
  const paged = list.slice(offset, offset + limit).map((t) => ({
    ...t,
    account: store.accounts.find((a) => a.id === t.account_id),
    category: store.categories.find((c) => c.id === t.category_id),
  }));

  return { data: paged, count };
}

export function addUserTransaction(userId: string, input: Partial<Transaction>): Transaction {
  const store = getUserStore(userId);
  const now = new Date().toISOString();

  let targetAccount = store.accounts.find((a) => a.id === input.account_id);
  if (!targetAccount && store.accounts.length > 0) {
    targetAccount = store.accounts[0];
  }

  const amount = Number(input.amount) || 0;
  const type = input.type || "expense";

  // Actualizar saldo de cuenta automáticamente
  if (targetAccount) {
    if (type === "income") {
      targetAccount.balance += amount;
    } else if (type === "expense") {
      targetAccount.balance -= amount;
    } else if (type === "transfer" && input.transfer_to_account_id) {
      targetAccount.balance -= amount;
      const destAcc = store.accounts.find((a) => a.id === input.transfer_to_account_id);
      if (destAcc) destAcc.balance += amount;
    }
  }

  const newTx: Transaction = {
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: userId,
    account_id: targetAccount?.id || store.accounts[0]?.id || "acc-default",
    type,
    amount,
    currency: input.currency || targetAccount?.currency || "ARS",
    category_id: input.category_id || null,
    description: input.description || (type === "income" ? "Ingreso" : "Gasto"),
    date: input.date || now.split("T")[0],
    installment_id: input.installment_id || null,
    transfer_to_account_id: input.transfer_to_account_id || null,
    exchange_rate: input.exchange_rate || null,
    urgency: input.urgency || null,
    tags: input.tags || [],
    created_at: now,
    updated_at: now,
    account: targetAccount,
    category: store.categories.find((c) => c.id === input.category_id),
  };

  store.transactions.unshift(newTx);
  saveUserStore(userId);
  return newTx;
}

export function updateUserTransaction(userId: string, id: string, updates: Partial<Transaction>): Transaction | null {
  const store = getUserStore(userId);
  const idx = store.transactions.findIndex((t) => t.id === id);
  if (idx === -1) return null;

  const old = store.transactions[idx];
  const updated: Transaction = {
    ...old,
    ...updates,
    amount: updates.amount !== undefined ? Number(updates.amount) : old.amount,
    updated_at: new Date().toISOString(),
  };

  store.transactions[idx] = updated;
  saveUserStore(userId);
  return updated;
}

export function deleteUserTransaction(userId: string, id: string): boolean {
  const store = getUserStore(userId);
  const initialLen = store.transactions.length;
  store.transactions = store.transactions.filter((t) => t.id !== id);
  if (store.transactions.length !== initialLen) {
    saveUserStore(userId);
    return true;
  }
  return false;
}

// ---- Cuentas ----
export function getUserAccounts(userId: string): Account[] {
  const store = getUserStore(userId);
  return store.accounts;
}

export function addUserAccount(userId: string, input: Partial<Account>): Account {
  const store = getUserStore(userId);
  const now = new Date().toISOString();
  const newAcc: Account = {
    id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: userId,
    name: input.name || "Nueva Cuenta",
    type: input.type || "digital_wallet",
    balance: Number(input.balance) || 0,
    currency: input.currency || "ARS",
    color: input.color || "#3B82F6",
    icon: input.icon || "Wallet",
    is_active: input.is_active !== undefined ? input.is_active : true,
    created_at: now,
    updated_at: now,
  };
  store.accounts.push(newAcc);
  saveUserStore(userId);
  return newAcc;
}

export function updateUserAccount(userId: string, id: string, updates: Partial<Account>): Account | null {
  const store = getUserStore(userId);
  const acc = store.accounts.find((a) => a.id === id);
  if (!acc) return null;

  Object.assign(acc, updates);
  acc.updated_at = new Date().toISOString();
  saveUserStore(userId);
  return acc;
}

export function deleteUserAccount(userId: string, id: string): boolean {
  const store = getUserStore(userId);
  const initialLen = store.accounts.length;
  store.accounts = store.accounts.filter((a) => a.id !== id);
  if (store.accounts.length !== initialLen) {
    saveUserStore(userId);
    return true;
  }
  return false;
}

// ---- Categorías ----
export function getUserCategories(userId: string): Category[] {
  const store = getUserStore(userId);
  return store.categories;
}

export function addUserCategory(userId: string, input: Partial<Category>): Category {
  const store = getUserStore(userId);
  const newCat: Category = {
    id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: userId,
    name: input.name || "Nueva Categoría",
    icon: input.icon || "tag",
    color: input.color || "#6366F1",
    type: input.type || "expense",
    is_default: false,
    created_at: new Date().toISOString(),
  };
  store.categories.push(newCat);
  saveUserStore(userId);
  return newCat;
}

// ---- Metas de Ahorro ----
export function getUserGoals(userId: string, type?: string): SavingsGoal[] {
  const store = getUserStore(userId);
  if (type) return store.goals.filter((g) => g.type === type);
  return store.goals;
}

export function addUserGoal(userId: string, input: Partial<SavingsGoal>): SavingsGoal {
  const store = getUserStore(userId);
  const now = new Date().toISOString();
  const newGoal: SavingsGoal = {
    id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: userId,
    name: input.name || "Meta de Ahorro",
    type: input.type || "goal",
    description: input.description || null,
    target_amount: Number(input.target_amount) || 0,
    current_amount: Number(input.current_amount) || 0,
    target_date: input.target_date || null,
    monthly_contribution: Number(input.monthly_contribution) || 0,
    priority: input.priority || 1,
    icon: input.icon || "Target",
    color: input.color || "#10B981",
    currency: input.currency || "ARS",
    image_url: input.image_url || null,
    product_url: input.product_url || null,
    is_completed: Boolean(input.is_completed),
    completed_at: null,
    created_at: now,
    updated_at: now,
  };
  store.goals.push(newGoal);
  saveUserStore(userId);
  return newGoal;
}

export function updateUserGoal(userId: string, id: string, updates: Partial<SavingsGoal>): SavingsGoal | null {
  const store = getUserStore(userId);
  const goal = store.goals.find((g) => g.id === id);
  if (!goal) return null;

  Object.assign(goal, updates);
  goal.updated_at = new Date().toISOString();
  saveUserStore(userId);
  return goal;
}

export function deleteUserGoal(userId: string, id: string): boolean {
  const store = getUserStore(userId);
  const len = store.goals.length;
  store.goals = store.goals.filter((g) => g.id !== id);
  if (store.goals.length !== len) {
    saveUserStore(userId);
    return true;
  }
  return false;
}

// ---- Cuotas (Installments) ----
export function getUserInstallments(userId: string): Installment[] {
  const store = getUserStore(userId);
  return store.installments;
}

export function addUserInstallment(userId: string, input: Partial<Installment>): Installment {
  const store = getUserStore(userId);
  const now = new Date().toISOString();

  const totalAmount = Number(input.total_amount) || 0;
  const totalInstallments = Number(input.total_installments) || 1;
  const paid = Number(input.paid_installments) || 0;
  const installmentAmount = Number(input.installment_amount) || (totalInstallments > 0 ? totalAmount / totalInstallments : 0);

  const newInst: Installment = {
    id: `inst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: userId,
    account_id: input.account_id || store.accounts[0]?.id || "acc-default",
    description: input.description || "Compra en cuotas",
    category_id: input.category_id || null,
    total_amount: totalAmount,
    total_installments: totalInstallments,
    paid_installments: paid,
    installment_amount: installmentAmount,
    has_interest: Boolean(input.has_interest),
    interest_rate: Number(input.interest_rate) || 0,
    cft_total: Number(input.cft_total) || 0,
    net_amount: input.net_amount || null,
    due_day: Number(input.due_day) || 10,
    start_date: input.start_date || now.split("T")[0],
    currency: input.currency || "ARS",
    notes: input.notes || null,
    is_active: input.is_active !== undefined ? input.is_active : true,
    created_at: now,
    updated_at: now,
  };

  store.installments.unshift(newInst);
  saveUserStore(userId);
  return newInst;
}

export function updateUserInstallment(userId: string, id: string, updates: Partial<Installment>): Installment | null {
  const store = getUserStore(userId);
  const inst = store.installments.find((i) => i.id === id);
  if (!inst) return null;

  Object.assign(inst, updates);
  inst.updated_at = new Date().toISOString();
  saveUserStore(userId);
  return inst;
}

export function deleteUserInstallment(userId: string, id: string): boolean {
  const store = getUserStore(userId);
  const len = store.installments.length;
  store.installments = store.installments.filter((i) => i.id !== id);
  if (store.installments.length !== len) {
    saveUserStore(userId);
    return true;
  }
  return false;
}

// ---- Acciones directas de ajuste rápido y reset ----

export function quickAdjustUserFinances(
  userId: string,
  params: {
    totalBalance?: number;
    monthlyIncome?: number;
    accountName?: string;
    clearExpenses?: boolean;
  }
): FinancialSummary {
  const store = getUserStore(userId);

  if (params.accountName && store.accounts[0]) {
    store.accounts[0].name = params.accountName;
  }

  if (params.totalBalance !== undefined && store.accounts[0]) {
    store.accounts[0].balance = params.totalBalance;
  }

  if (params.monthlyIncome !== undefined) {
    store.user.salary = params.monthlyIncome;
  }

  if (params.clearExpenses) {
    store.transactions = store.transactions.filter((t) => t.type !== "expense");
  }

  saveUserStore(userId);
  return getUserSummary(userId);
}

export function resetUserFinances(
  userId: string,
  params: {
    initialBalanceARS: number;
    configuredSalary: number;
    primaryAccountName: string;
  }
): FinancialSummary {
  const store = getUserStore(userId);

  store.transactions = [];
  store.installments = [];
  store.goals = [];
  store.budgets = [];
  store.subscriptions = [];
  store.chatMessages = [];
  store.user.salary = params.configuredSalary;

  if (store.accounts.length === 0) {
    store.accounts.push({
      id: `acc-${Date.now()}-1`,
      user_id: userId,
      name: params.primaryAccountName,
      type: "bank",
      balance: params.initialBalanceARS,
      currency: "ARS",
      color: "#10B981",
      icon: "Building2",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } else {
    store.accounts[0].name = params.primaryAccountName;
    store.accounts[0].balance = params.initialBalanceARS;
    for (let i = 1; i < store.accounts.length; i++) {
      store.accounts[i].balance = 0;
    }
  }

  saveUserStore(userId);
  return getUserSummary(userId);
}

// ---- Chat IA con memoria persistente por usuario ----

export function getUserChatMessages(userId: string, limit: number = 30): ChatMessage[] {
  const store = getUserStore(userId);
  return store.chatMessages.slice(-limit);
}

export function addUserChatMessage(userId: string, message: ChatMessage): void {
  const store = getUserStore(userId);
  store.chatMessages.push(message);
  // Mantener últimos 100 mensajes
  if (store.chatMessages.length > 100) {
    store.chatMessages = store.chatMessages.slice(-100);
  }
  saveUserStore(userId);
}
