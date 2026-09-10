import type { Account, Category, FinancialSummary, Installment, SavingsGoal, Transaction, CategoryBudget, Subscription, FinancialHealthMetrics } from "./types";

const nowIso = new Date().toISOString();

export let configuredSalary: number = 980000;
export let salaryPayDay: number = 5;

export let demoAccounts: Account[] = [
  {
    id: "acc-1",
    user_id: "demo-user",
    name: "Santander Río",
    type: "bank",
    balance: 685400,
    currency: "ARS",
    color: "#EF4444",
    icon: "Building2",
    is_active: true,
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: "acc-2",
    user_id: "demo-user",
    name: "Mercado Pago",
    type: "digital_wallet",
    balance: 142800,
    currency: "ARS",
    color: "#3B82F6",
    icon: "Smartphone",
    is_active: true,
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: "acc-3",
    user_id: "demo-user",
    name: "Ahorros Dólares",
    type: "cash",
    balance: 1450,
    currency: "USD",
    color: "#10B981",
    icon: "Wallet",
    is_active: true,
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: "acc-4",
    user_id: "demo-user",
    name: "Binance (Crypto)",
    type: "crypto",
    balance: 0.024,
    currency: "BTC",
    color: "#F59E0B",
    icon: "Bitcoin",
    is_active: true,
    created_at: nowIso,
    updated_at: nowIso,
  },
];

export let demoCategories: Category[] = [
  { id: "cat-1", user_id: "demo-user", name: "Sueldo Principal", type: "income", icon: "Briefcase", color: "#10B981", is_default: true, created_at: nowIso },
  { id: "cat-1b", user_id: "demo-user", name: "Trabajos Freelance / Extra", type: "income", icon: "Laptop", color: "#3B82F6", is_default: true, created_at: nowIso },
  { id: "cat-1c", user_id: "demo-user", name: "Rendimientos e Inversiones", type: "income", icon: "TrendingUp", color: "#F59E0B", is_default: true, created_at: nowIso },
  { id: "cat-2", user_id: "demo-user", name: "Supermercado y Alimentos", type: "expense", icon: "ShoppingCart", color: "#6366F1", is_default: true, created_at: nowIso },
  { id: "cat-3", user_id: "demo-user", name: "Servicios e Impuestos", type: "expense", icon: "Home", color: "#F97316", is_default: true, created_at: nowIso },
  { id: "cat-4", user_id: "demo-user", name: "Salidas y Restaurantes", type: "expense", icon: "Coffee", color: "#EC4899", is_default: true, created_at: nowIso },
  { id: "cat-5", user_id: "demo-user", name: "Transporte y Nafta", type: "expense", icon: "Car", color: "#3B82F6", is_default: true, created_at: nowIso },
  { id: "cat-6", user_id: "demo-user", name: "Salud y Gimnasio", type: "expense", icon: "Activity", color: "#14B8A6", is_default: true, created_at: nowIso },
  { id: "cat-7", user_id: "demo-user", name: "Entretenimiento y Suscripciones", type: "expense", icon: "Tv", color: "#8B5CF6", is_default: true, created_at: nowIso },
];

export let demoTransactions: Transaction[] = [
  {
    id: "tx-1",
    user_id: "demo-user",
    account_id: "acc-1",
    category_id: "cat-1",
    amount: 980000,
    type: "income",
    currency: "ARS",
    date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
    description: "Cobro de Sueldo Mensual",
    installment_id: null,
    transfer_to_account_id: null,
    exchange_rate: null,
    urgency: null,
    tags: [],
    created_at: nowIso,
    updated_at: nowIso,
    account: demoAccounts[0],
    category: demoCategories[0],
  },
  {
    id: "tx-2",
    user_id: "demo-user",
    account_id: "acc-2",
    category_id: "cat-2",
    amount: 48500,
    type: "expense",
    currency: "ARS",
    date: new Date(Date.now() - 1 * 86400000).toISOString().split("T")[0],
    description: "Supermercado Coto",
    installment_id: null,
    transfer_to_account_id: null,
    exchange_rate: null,
    urgency: "essential",
    tags: ["supermercado"],
    created_at: nowIso,
    updated_at: nowIso,
    account: demoAccounts[1],
    category: demoCategories[3],
  },
  {
    id: "tx-3",
    user_id: "demo-user",
    account_id: "acc-1",
    category_id: "cat-3",
    amount: 82000,
    type: "expense",
    currency: "ARS",
    date: new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0],
    description: "Expensas & Luz Edenor",
    installment_id: null,
    transfer_to_account_id: null,
    exchange_rate: null,
    urgency: "essential",
    tags: ["servicios"],
    created_at: nowIso,
    updated_at: nowIso,
    account: demoAccounts[0],
    category: demoCategories[4],
  },
];

export const DEMO_ACCOUNTS = demoAccounts;
export const DEMO_CATEGORIES = demoCategories;
export const DEMO_TRANSACTIONS = demoTransactions;

export let demoInstallments: Installment[] = [
  {
    id: "inst-1",
    user_id: "demo-user",
    account_id: "acc-1",
    category_id: "cat-7",
    description: "Smart TV 55'' Samsung 4K",
    total_amount: 540000,
    currency: "ARS",
    total_installments: 6,
    paid_installments: 2,
    installment_amount: 90000,
    has_interest: false,
    interest_rate: 0,
    cft_total: 0,
    net_amount: 540000,
    due_day: 10,
    start_date: new Date(Date.now() - 60 * 86400000).toISOString().split("T")[0],
    notes: null,
    is_active: true,
    created_at: nowIso,
    updated_at: nowIso,
    account: demoAccounts[0],
    category: demoCategories[8],
  },
  {
    id: "inst-2",
    user_id: "demo-user",
    account_id: "acc-1",
    category_id: "cat-6",
    description: "Zapatillas Running Nike Zoom",
    total_amount: 165000,
    currency: "ARS",
    total_installments: 3,
    paid_installments: 1,
    installment_amount: 55000,
    has_interest: false,
    interest_rate: 0,
    cft_total: 0,
    net_amount: 165000,
    due_day: 15,
    start_date: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
    notes: null,
    is_active: true,
    created_at: nowIso,
    updated_at: nowIso,
    account: demoAccounts[0],
    category: demoCategories[7],
  },
];

export const DEMO_INSTALLMENTS = demoInstallments;

export let demoGoals: SavingsGoal[] = [
  {
    id: "goal-1",
    user_id: "demo-user",
    name: "Fondo de Emergencia (6 meses)",
    type: "goal",
    description: "Respaldo financiero para imprevistos",
    target_amount: 2500000,
    current_amount: 1450000,
    currency: "ARS",
    monthly_contribution: 150000,
    target_date: new Date(Date.now() + 180 * 86400000).toISOString().split("T")[0],
    priority: 1,
    color: "#10B981",
    icon: "Shield",
    image_url: null,
    product_url: null,
    is_completed: false,
    completed_at: null,
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: "goal-2",
    user_id: "demo-user",
    name: "Vacaciones Brasil 2027",
    type: "goal",
    description: "Vuelos y estadía en Florianópolis",
    target_amount: 2000000,
    current_amount: 600000,
    currency: "ARS",
    monthly_contribution: 100000,
    target_date: new Date(Date.now() + 240 * 86400000).toISOString().split("T")[0],
    priority: 2,
    color: "#3B82F6",
    icon: "Plane",
    image_url: null,
    product_url: null,
    is_completed: false,
    completed_at: null,
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: "wish-1",
    user_id: "demo-user",
    name: "Monitor Gamer 27'' QHD",
    type: "wishlist",
    description: "Para trabajo y setup",
    target_amount: 380000,
    current_amount: 120000,
    currency: "ARS",
    monthly_contribution: 50000,
    target_date: null,
    priority: 3,
    color: "#8B5CF6",
    icon: "Monitor",
    image_url: null,
    product_url: null,
    is_completed: false,
    completed_at: null,
    created_at: nowIso,
    updated_at: nowIso,
  },
];

export const DEMO_GOALS = demoGoals;

export let demoBudgets: CategoryBudget[] = [
  {
    id: "bgt-1",
    category_id: "cat-2", // Supermercado y Alimentos
    monthly_limit: 120000,
    currency: "ARS",
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: "bgt-2",
    category_id: "cat-3", // Servicios e Impuestos
    monthly_limit: 95000,
    currency: "ARS",
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: "bgt-3",
    category_id: "cat-4", // Salidas y Restaurantes
    monthly_limit: 60000,
    currency: "ARS",
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: "bgt-4",
    category_id: "cat-5", // Transporte y Nafta
    monthly_limit: 50000,
    currency: "ARS",
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: "bgt-5",
    category_id: "cat-6", // Salud y Gimnasio
    monthly_limit: 40000,
    currency: "ARS",
    created_at: nowIso,
    updated_at: nowIso,
  },
];

export let demoSubscriptions: Subscription[] = [
  {
    id: "sub-1",
    user_id: "demo-user",
    name: "Netflix 4K HDR",
    amount: 11500,
    currency: "ARS",
    billing_cycle: "monthly",
    renewal_day: 14,
    category_id: "cat-7",
    account_id: "acc-1",
    is_active: true,
    icon: "Tv",
    color: "#E50914",
    notes: "Plan Premium 4 pantallas",
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: "sub-2",
    user_id: "demo-user",
    name: "Spotify Premium",
    amount: 4500,
    currency: "ARS",
    billing_cycle: "monthly",
    renewal_day: 8,
    category_id: "cat-7",
    account_id: "acc-2",
    is_active: true,
    icon: "Music",
    color: "#1DB954",
    notes: "Música sin anuncios",
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: "sub-3",
    user_id: "demo-user",
    name: "Gimnasio Pase Libre",
    amount: 32000,
    currency: "ARS",
    billing_cycle: "monthly",
    renewal_day: 1,
    category_id: "cat-6",
    account_id: "acc-1",
    is_active: true,
    icon: "Dumbbell",
    color: "#10B981",
    notes: "Musculación + Pileta",
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: "sub-4",
    user_id: "demo-user",
    name: "Internet Fibra 300MB",
    amount: 26000,
    currency: "ARS",
    billing_cycle: "monthly",
    renewal_day: 20,
    category_id: "cat-3",
    account_id: "acc-1",
    is_active: true,
    icon: "Wifi",
    color: "#3B82F6",
    notes: "Personal Flow / Hogar",
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: "sub-5",
    user_id: "demo-user",
    name: "Google One (2TB Cloud)",
    amount: 3200,
    currency: "ARS",
    billing_cycle: "monthly",
    renewal_day: 28,
    category_id: "cat-7",
    account_id: "acc-2",
    is_active: true,
    icon: "Cloud",
    color: "#F59E0B",
    notes: "Copia fotos y Google Drive",
    created_at: nowIso,
    updated_at: nowIso,
  },
];

export const DEMO_BUDGETS = demoBudgets;
export const DEMO_SUBSCRIPTIONS = demoSubscriptions;

// Mutaciones en memoria para Cuentas
export function getDemoAccounts() {
  return demoAccounts.filter((a) => a.is_active);
}

export function addDemoAccount(accountData: Partial<Account>): Account {
  const newAcc: Account = {
    id: "acc-" + Date.now(),
    user_id: "demo-user",
    name: accountData.name || "Nueva Cuenta",
    type: accountData.type || "bank",
    balance: Number(accountData.balance) || 0,
    currency: accountData.currency || "ARS",
    color: accountData.color || "#6366F1",
    icon: accountData.icon || "Wallet",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  demoAccounts = [newAcc, ...demoAccounts];
  return newAcc;
}

export function updateDemoAccount(id: string, updates: Partial<Account>): Account | null {
  const index = demoAccounts.findIndex((a) => a.id === id);
  if (index === -1) return null;
  demoAccounts[index] = {
    ...demoAccounts[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  return demoAccounts[index];
}

export function deleteDemoAccount(id: string) {
  demoAccounts = demoAccounts.filter((a) => a.id !== id);
}

// Mutaciones en memoria para Transacciones
let demoUserCreatedTxCount = 0;
export function getDemoCreatedTxCount(): number {
  return demoUserCreatedTxCount;
}
export function incrementDemoCreatedTxCount(): number {
  return ++demoUserCreatedTxCount;
}
export function resetDemoCreatedTxCount(): void {
  demoUserCreatedTxCount = 0;
}

export function getDemoTransactions() {
  return demoTransactions;
}

export function addDemoTransaction(txData: Partial<Transaction>): Transaction {
  incrementDemoCreatedTxCount();
  const account = demoAccounts.find((a) => a.id === txData.account_id) || demoAccounts[0];
  const category = demoCategories.find((c) => c.id === txData.category_id) || demoCategories[0];
  const amount = Number(txData.amount) || 0;

  const newTx: Transaction = {
    id: "tx-" + Date.now(),
    user_id: "demo-user",
    account_id: account?.id || "acc-1",
    category_id: category?.id || null,
    amount,
    type: txData.type || "expense",
    currency: txData.currency || account?.currency || "ARS",
    date: txData.date || new Date().toISOString().split("T")[0],
    description: txData.description || null,
    installment_id: null,
    transfer_to_account_id: txData.transfer_to_account_id || null,
    exchange_rate: null,
    urgency: txData.urgency || null,
    tags: txData.tags || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    account,
    category,
  };

  if (account) {
    if (newTx.type === "income") {
      account.balance += amount;
    } else if (newTx.type === "expense") {
      account.balance -= amount;
    } else if (newTx.type === "transfer" && newTx.transfer_to_account_id) {
      account.balance -= amount;
      const targetAcc = demoAccounts.find((a) => a.id === newTx.transfer_to_account_id);
      if (targetAcc) targetAcc.balance += amount;
    }
  }

  demoTransactions = [newTx, ...demoTransactions];
  return newTx;
}

export function updateDemoTransaction(id: string, updates: Partial<Transaction>): Transaction | null {
  const index = demoTransactions.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const prev = demoTransactions[index];
  const account = demoAccounts.find((a) => a.id === (updates.account_id || prev.account_id)) || prev.account;
  const category = demoCategories.find((c) => c.id === (updates.category_id !== undefined ? updates.category_id : prev.category_id)) || prev.category;

  demoTransactions[index] = {
    ...prev,
    ...updates,
    amount: updates.amount !== undefined ? Number(updates.amount) : prev.amount,
    account,
    category,
    updated_at: new Date().toISOString(),
  };

  return demoTransactions[index];
}

export function deleteDemoTransaction(id: string) {
  const tx = demoTransactions.find((t) => t.id === id);
  if (tx && tx.account_id) {
    const acc = demoAccounts.find((a) => a.id === tx.account_id);
    if (acc) {
      if (tx.type === "income") acc.balance -= tx.amount;
      if (tx.type === "expense") acc.balance += tx.amount;
    }
  }
  demoTransactions = demoTransactions.filter((t) => t.id !== id);
}

// Vaciar solo los gastos
export function clearAllExpenses() {
  demoTransactions = demoTransactions.filter((t) => t.type !== "expense");
  demoInstallments = [];
}

// Mutaciones para Metas de Ahorro
export function getDemoGoals() {
  return demoGoals;
}

export function addDemoGoal(goalData: Partial<SavingsGoal>): SavingsGoal {
  const newGoal: SavingsGoal = {
    id: "goal-" + Date.now(),
    user_id: "demo-user",
    name: goalData.name || "Nueva Meta",
    type: goalData.type || "goal",
    description: goalData.description || null,
    target_amount: Number(goalData.target_amount) || 0,
    current_amount: Number(goalData.current_amount) || 0,
    currency: goalData.currency || "ARS",
    monthly_contribution: Number(goalData.monthly_contribution) || 0,
    target_date: goalData.target_date || null,
    priority: Number(goalData.priority) || 2,
    color: goalData.color || "#10B981",
    icon: goalData.icon || "Target",
    image_url: goalData.image_url || null,
    product_url: goalData.product_url || null,
    is_completed: false,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  demoGoals = [newGoal, ...demoGoals];
  return newGoal;
}

export function updateDemoGoal(id: string, updates: Partial<SavingsGoal>): SavingsGoal | null {
  const index = demoGoals.findIndex((g) => g.id === id);
  if (index === -1) return null;
  demoGoals[index] = {
    ...demoGoals[index],
    ...updates,
    target_amount: updates.target_amount !== undefined ? Number(updates.target_amount) : demoGoals[index].target_amount,
    current_amount: updates.current_amount !== undefined ? Number(updates.current_amount) : demoGoals[index].current_amount,
    monthly_contribution: updates.monthly_contribution !== undefined ? Number(updates.monthly_contribution) : demoGoals[index].monthly_contribution,
    updated_at: new Date().toISOString(),
  };
  return demoGoals[index];
}

export function deleteDemoGoal(id: string) {
  demoGoals = demoGoals.filter((g) => g.id !== id);
}

export function clearAllGoals() {
  demoGoals = [];
}

// Distribuir sueldo / ingresos en metas
export function distributeSalaryToGoals(allocations: Array<{ id: string; monthly_contribution: number; priority?: number }>) {
  allocations.forEach((item) => {
    const goal = demoGoals.find((g) => g.id === item.id);
    if (goal) {
      goal.monthly_contribution = Number(item.monthly_contribution) || 0;
      if (item.priority !== undefined) goal.priority = item.priority;
    }
  });
  return demoGoals;
}

// Mutaciones para Cuotas
export function getDemoInstallments() {
  return demoInstallments;
}

export function addDemoInstallment(instData: Partial<Installment>): Installment {
  const account = demoAccounts.find((a) => a.id === instData.account_id) || demoAccounts[0];
  const category = demoCategories.find((c) => c.id === instData.category_id) || demoCategories[0];
  const totalInstallments = Number(instData.total_installments) || 1;
  const totalAmount = Number(instData.total_amount) || 0;
  const installmentAmount = Number(instData.installment_amount) || (totalAmount / totalInstallments);

  const newInst: Installment = {
    id: "inst-" + Date.now(),
    user_id: "demo-user",
    account_id: account?.id || "acc-1",
    category_id: category?.id || null,
    description: instData.description || "Nueva Cuota",
    total_amount: totalAmount,
    currency: instData.currency || "ARS",
    total_installments: totalInstallments,
    paid_installments: Number(instData.paid_installments) || 0,
    installment_amount: installmentAmount,
    has_interest: Boolean(instData.has_interest),
    interest_rate: Number(instData.interest_rate) || 0,
    cft_total: Number(instData.cft_total) || 0,
    net_amount: instData.net_amount !== undefined ? Number(instData.net_amount) : totalAmount,
    due_day: Number(instData.due_day) || 10,
    start_date: instData.start_date || new Date().toISOString().split("T")[0],
    notes: instData.notes || null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    account,
    category,
  };
  demoInstallments = [newInst, ...demoInstallments];
  return newInst;
}

export function updateDemoInstallment(id: string, updates: Partial<Installment>): Installment | null {
  const index = demoInstallments.findIndex((i) => i.id === id);
  if (index === -1) return null;
  demoInstallments[index] = {
    ...demoInstallments[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  return demoInstallments[index];
}

export function deleteDemoInstallment(id: string) {
  demoInstallments = demoInstallments.filter((i) => i.id !== id);
}

export function clearAllInstallments() {
  demoInstallments = [];
}

// Configurar sueldo mensual directo
export function setSalaryConfig({
  amount,
  payDay = 5,
  alsoUpdateCurrentBalance = false,
  accountId,
}: {
  amount: number;
  payDay?: number;
  alsoUpdateCurrentBalance?: boolean;
  accountId?: string;
}) {
  configuredSalary = Number(amount) || 0;
  salaryPayDay = Number(payDay) || 5;

  const targetAcc = demoAccounts.find((a) => a.id === accountId) || demoAccounts[0];

  if (targetAcc && alsoUpdateCurrentBalance) {
    targetAcc.balance = configuredSalary;
  }

  const existingIndex = demoTransactions.findIndex(
    (t) => t.type === "income" && (t.description?.includes("Sueldo") || t.category_id === "cat-1")
  );

  const salaryTx: Transaction = {
    id: "tx-salary-" + Date.now(),
    user_id: "demo-user",
    account_id: targetAcc?.id || "acc-1",
    category_id: "cat-1",
    amount: configuredSalary,
    type: "income",
    currency: targetAcc?.currency || "ARS",
    date: new Date().toISOString().split("T")[0],
    description: "Cobro de Sueldo Mensual",
    installment_id: null,
    transfer_to_account_id: null,
    exchange_rate: null,
    urgency: null,
    tags: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    account: targetAcc,
    category: demoCategories[0],
  };

  if (existingIndex >= 0) {
    demoTransactions[existingIndex] = salaryTx;
  } else {
    demoTransactions = [salaryTx, ...demoTransactions];
  }

  return getDemoSummary();
}

// Establecer exactamente la plata actual que tenés (Saldo total) y limpiar gastos ficticios si se desea
export function setExactCashInHand({
  totalAmount,
  accountName = "Mi Billetera Principal",
  clearExpenses = false,
  setSalaryAmount,
}: {
  totalAmount: number;
  accountName?: string;
  clearExpenses?: boolean;
  setSalaryAmount?: number;
}) {
  if (clearExpenses) {
    clearAllExpenses();
  }

  if (demoAccounts.length <= 1) {
    demoAccounts = [
      {
        id: "acc-user-1",
        user_id: "demo-user",
        name: accountName || "Billetera Principal",
        type: "bank",
        balance: Number(totalAmount) || 0,
        currency: "ARS",
        color: "#3B82F6",
        icon: "Wallet",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  } else {
    demoAccounts[0].balance = Number(totalAmount) || 0;
    demoAccounts[0].name = accountName || demoAccounts[0].name;
    for (let i = 1; i < demoAccounts.length; i++) {
      demoAccounts[i].balance = 0;
    }
  }

  if (setSalaryAmount !== undefined && setSalaryAmount > 0) {
    setSalaryConfig({
      amount: setSalaryAmount,
      alsoUpdateCurrentBalance: false,
    });
  }

  return getDemoSummary();
}

// Limpiar todas las transacciones de prueba para empezar de cero ("Cuenta Real Limpia")
export function resetToCleanAccount(initialBalance: number = 0, accountName: string = "Mi Billetera Principal"): Account {
  const newAcc: Account = {
    id: "acc-user-1",
    user_id: "demo-user",
    name: accountName || "Mi Billetera Principal",
    type: "bank",
    balance: Number(initialBalance) || 0,
    currency: "ARS",
    color: "#3B82F6",
    icon: "Wallet",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  demoAccounts = [newAcc];
  demoTransactions = [];
  demoInstallments = [];
  demoGoals = [];

  return newAcc;
}

// Establecer directamente los totales mensuales y saldos
export function setDirectFinances({
  totalBalance,
  monthlyIncome,
  monthlyExpense,
  accountName = "Mi Billetera Principal",
  clearExpenses = false,
}: {
  totalBalance?: number;
  monthlyIncome?: number;
  monthlyExpense?: number;
  accountName?: string;
  clearExpenses?: boolean;
}) {
  if (clearExpenses) {
    clearAllExpenses();
  }

  if (totalBalance !== undefined) {
    setExactCashInHand({
      totalAmount: Number(totalBalance),
      accountName,
      clearExpenses,
    });
  }

  if (monthlyIncome !== undefined && monthlyIncome > 0) {
    setSalaryConfig({
      amount: Number(monthlyIncome),
      alsoUpdateCurrentBalance: false,
    });
  }

  if (monthlyExpense !== undefined && monthlyExpense > 0) {
    const existingExpenseIndex = demoTransactions.findIndex((t) => t.type === "expense");
    const expenseTx: Transaction = {
      id: "tx-direct-expense-" + Date.now(),
      user_id: "demo-user",
      account_id: demoAccounts[0]?.id || "acc-1",
      category_id: "cat-3",
      amount: Number(monthlyExpense),
      type: "expense",
      currency: "ARS",
      date: new Date().toISOString().split("T")[0],
      description: "Gastos Mensuales",
      installment_id: null,
      transfer_to_account_id: null,
      exchange_rate: null,
      urgency: "essential",
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      account: demoAccounts[0],
      category: demoCategories[4],
    };

    if (existingExpenseIndex >= 0) {
      demoTransactions[existingExpenseIndex] = expenseTx;
    } else {
      demoTransactions = [expenseTx, ...demoTransactions.filter((t) => t.type !== "expense")];
    }
  }

  return getDemoSummary();
}

// Gestión de Presupuestos Mensuales
export function getDemoBudgets(): CategoryBudget[] {
  return demoBudgets.map((b) => {
    const cat = demoCategories.find((c) => c.id === b.category_id);
    const spentThisMonth = demoTransactions
      .filter((t) => t.type === "expense" && t.category_id === b.category_id)
      .reduce((sum, t) => sum + t.amount, 0);

    const remaining = Math.max(0, b.monthly_limit - spentThisMonth);
    const percentage = b.monthly_limit > 0 ? Math.min(200, Math.round((spentThisMonth / b.monthly_limit) * 100)) : 0;
    const isOver = spentThisMonth > b.monthly_limit;

    return {
      ...b,
      category: cat,
      spent_this_month: spentThisMonth,
      remaining,
      percentage,
      is_over_budget: isOver,
    };
  });
}

export function setDemoBudget({
  category_id,
  monthly_limit,
  currency = "ARS",
}: {
  category_id: string;
  monthly_limit: number;
  currency?: string;
}): CategoryBudget {
  const existingIndex = demoBudgets.findIndex((b) => b.category_id === category_id);
  const now = new Date().toISOString();

  if (existingIndex >= 0) {
    demoBudgets[existingIndex] = {
      ...demoBudgets[existingIndex],
      monthly_limit: Number(monthly_limit),
      currency,
      updated_at: now,
    };
    return demoBudgets[existingIndex];
  } else {
    const newBudget: CategoryBudget = {
      id: "bgt-" + Date.now(),
      category_id,
      monthly_limit: Number(monthly_limit),
      currency,
      created_at: now,
      updated_at: now,
    };
    demoBudgets.push(newBudget);
    return newBudget;
  }
}

export function deleteDemoBudget(id: string) {
  demoBudgets = demoBudgets.filter((b) => b.id !== id && b.category_id !== id);
  return { success: true };
}

// Gestión de Suscripciones y Gastos Recurrentes
export function getDemoSubscriptions(): Subscription[] {
  const today = new Date();
  const currentDay = today.getDate();

  return demoSubscriptions.map((sub) => {
    let daysUntil = sub.renewal_day - currentDay;
    if (daysUntil < 0) {
      // Siguiente mes
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      daysUntil += nextMonth.getDate();
    }

    const cat = demoCategories.find((c) => c.id === sub.category_id);
    const acc = demoAccounts.find((a) => a.id === sub.account_id);

    return {
      ...sub,
      days_until_renewal: daysUntil,
      category: cat,
      account: acc,
    };
  });
}

export function addDemoSubscription(data: Partial<Subscription>): Subscription {
  const now = new Date().toISOString();
  const newSub: Subscription = {
    id: "sub-" + Date.now(),
    user_id: "demo-user",
    name: data.name || "Nueva Suscripción",
    amount: Number(data.amount) || 0,
    currency: data.currency || "ARS",
    billing_cycle: data.billing_cycle || "monthly",
    renewal_day: Number(data.renewal_day) || 1,
    category_id: data.category_id || null,
    account_id: data.account_id || null,
    is_active: data.is_active !== undefined ? data.is_active : true,
    icon: data.icon || "CreditCard",
    color: data.color || "#6366F1",
    notes: data.notes || null,
    created_at: now,
    updated_at: now,
  };

  demoSubscriptions = [newSub, ...demoSubscriptions];
  return newSub;
}

export function toggleDemoSubscription(id: string): Subscription | null {
  const sub = demoSubscriptions.find((s) => s.id === id);
  if (!sub) return null;
  sub.is_active = !sub.is_active;
  sub.updated_at = new Date().toISOString();
  return sub;
}

export function deleteDemoSubscription(id: string) {
  demoSubscriptions = demoSubscriptions.filter((s) => s.id !== id);
  return { success: true };
}

export function clearAllDemoSubscriptions() {
  demoSubscriptions = [];
  return { success: true };
}

export function clearAllDemoBudgets() {
  demoBudgets = [];
  return { success: true };
}

export function clearAllDemoTransactions() {
  demoTransactions = [];
  return { success: true };
}

export function resetAllAccountBalances() {
  demoAccounts = demoAccounts.map((a) => ({ ...a, balance: 0 }));
  return { success: true };
}

// Reiniciar todas las finanzas a Cero (Modo Nuevo Usuario Limpio)
export function resetAllDataToZero(options?: {
  initialBalanceARS?: number;
  configuredSalary?: number;
  primaryAccountName?: string;
}) {
  demoTransactions = [];
  demoInstallments = [];
  demoGoals = [];
  demoBudgets = [];
  demoSubscriptions = [];

  const initialBalance = typeof options?.initialBalanceARS === "number" ? Math.max(0, options.initialBalanceARS) : 0;
  const primaryName = options?.primaryAccountName?.trim() || "Santander Río";

  const now = new Date().toISOString();
  demoAccounts = [
    {
      id: "acc-1",
      user_id: "demo-user",
      name: primaryName,
      type: "bank",
      balance: initialBalance,
      currency: "ARS",
      color: "#10B981",
      icon: "Building2",
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: "acc-2",
      user_id: "demo-user",
      name: "Mercado Pago",
      type: "digital_wallet",
      balance: 0,
      currency: "ARS",
      color: "#3B82F6",
      icon: "Smartphone",
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: "acc-3",
      user_id: "demo-user",
      name: "Efectivo / Billetera",
      type: "cash",
      balance: 0,
      currency: "ARS",
      color: "#F59E0B",
      icon: "Wallet",
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ];

  if (typeof options?.configuredSalary === "number") {
    configuredSalary = Math.max(0, options.configuredSalary);
  } else {
    configuredSalary = 0;
  }

  return getDemoSummary();
}

// Restauración de Copia de Seguridad completa (Import JSON)
export function restoreDatabaseBackup(backup: {
  transactions?: Transaction[];
  accounts?: Account[];
  installments?: Installment[];
  goals?: SavingsGoal[];
  budgets?: CategoryBudget[];
  subscriptions?: Subscription[];
  configuredSalary?: number;
  salaryPayDay?: number;
}) {
  if (Array.isArray(backup.accounts) && backup.accounts.length > 0) {
    demoAccounts = [...backup.accounts];
  }
  if (Array.isArray(backup.transactions)) {
    demoTransactions = [...backup.transactions];
  }
  if (Array.isArray(backup.installments)) {
    demoInstallments = [...backup.installments];
  }
  if (Array.isArray(backup.goals)) {
    demoGoals = [...backup.goals];
  }
  if (Array.isArray(backup.budgets)) {
    demoBudgets = [...backup.budgets];
  }
  if (Array.isArray(backup.subscriptions)) {
    demoSubscriptions = [...backup.subscriptions];
  }
  if (typeof backup.configuredSalary === "number") {
    configuredSalary = backup.configuredSalary;
  }
  if (typeof backup.salaryPayDay === "number") {
    salaryPayDay = backup.salaryPayDay;
  }

  return getDemoSummary();
}

// Resumen financiero dinámico con Salud Financiera, Presupuestos y Suscripciones
export function getDemoSummary(): FinancialSummary {
  const activeAccounts = getDemoAccounts();
  const totalBalance = activeAccounts.reduce((sum, a) => sum + (a.currency === "ARS" ? a.balance : 0), 0);
  
  const income30d = demoTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense30d = demoTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const monthlyInstallments = demoInstallments.reduce((s, i) => s + i.installment_amount, 0);

  const activeSubscriptions = getDemoSubscriptions().filter((s) => s.is_active);
  const totalSubscriptionsMonthly = activeSubscriptions.reduce((s, sub) => s + sub.amount, 0);

  const catMap: Record<string, { category_name: string; total: number; count: number }> = {};
  demoTransactions.filter((t) => t.type === "expense").forEach((t) => {
    const name = t.category?.name || "Sin categoría";
    if (!catMap[name]) catMap[name] = { category_name: name, total: 0, count: 0 };
    catMap[name].total += t.amount;
    catMap[name].count += 1;
  });

  const topCategories = Object.values(catMap).sort((a, b) => b.total - a.total);
  const budgetsWithProgress = getDemoBudgets();
  const allSubscriptions = getDemoSubscriptions();

  // Métricas de Salud Financiera
  const monthlyIncome = income30d > 0 ? income30d : configuredSalary;
  const monthlySavingsContributions = demoGoals.reduce((s, g) => s + (g.monthly_contribution || 0), 0);
  const monthlyBurn = expense30d + monthlyInstallments + totalSubscriptionsMonthly;
  const freeCashFlow = monthlyIncome - monthlyBurn - monthlySavingsContributions;
  const savingsRate = monthlyIncome > 0 ? Math.round(((monthlySavingsContributions + Math.max(0, freeCashFlow)) / monthlyIncome) * 100) : 0;
  const runwayMonths = monthlyBurn > 0 ? Number((totalBalance / monthlyBurn).toFixed(1)) : 12;
  const debtRatio = monthlyIncome > 0 ? Math.round((monthlyInstallments / monthlyIncome) * 100) : 0;

  let healthScore = 70;
  if (savingsRate >= 20) healthScore += 15;
  else if (savingsRate >= 10) healthScore += 8;
  else if (savingsRate < 0) healthScore -= 15;

  if (runwayMonths >= 4) healthScore += 15;
  else if (runwayMonths >= 2) healthScore += 8;
  else if (runwayMonths < 1) healthScore -= 15;

  if (debtRatio > 40) healthScore -= 20;
  else if (debtRatio > 25) healthScore -= 10;
  else healthScore += 5;

  if (freeCashFlow < 0) healthScore -= 10;
  healthScore = Math.max(15, Math.min(99, healthScore));

  const healthStatus: FinancialHealthMetrics["status"] =
    healthScore >= 80 ? "excelente" : healthScore >= 65 ? "saludable" : healthScore >= 45 ? "atencion" : "critico";

  const healthMetrics: FinancialHealthMetrics = {
    score: healthScore,
    status: healthStatus,
    savings_rate: savingsRate,
    runway_months: runwayMonths,
    free_cash_flow: freeCashFlow,
    debt_ratio: debtRatio,
  };

  return {
    accounts: activeAccounts,
    total_balance: totalBalance,
    total_balance_ars: totalBalance,
    income_30d: income30d,
    expense_30d: expense30d,
    configured_salary: configuredSalary,
    salary_pay_day: salaryPayDay,
    active_installments: demoInstallments,
    total_installments_monthly: monthlyInstallments,
    upcoming_installments: demoInstallments.length > 0 ? [
      {
        description: "Smart TV 55'' (Cuota 3/6)",
        amount: 90000,
        due_date: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
        account_name: "Santander Río",
      },
    ] : [],
    top_categories: topCategories,
    savings_goals: demoGoals,
    category_budgets: budgetsWithProgress,
    subscriptions: allSubscriptions,
    total_subscriptions_monthly: totalSubscriptionsMonthly,
    health_metrics: healthMetrics,
  };
}
