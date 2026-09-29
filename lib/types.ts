// ============================================================
// FinanceAI — Tipos TypeScript compartidos
// ============================================================

export type TransactionType = "income" | "expense" | "transfer";
export type AccountType = "cash" | "bank" | "digital_wallet" | "investment" | "crypto" | "other";
export type GoalType = "goal" | "wishlist";
export type CategoryType = "income" | "expense" | "both";
export type MessageRole = "user" | "assistant" | "system";
export type UrgencyLevel = "essential" | "important" | "nice_to_have" | "unnecessary";

// ---- Supabase Row Types ----

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  color: string;
  icon: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
  is_default: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  category_id: string | null;
  description: string | null;
  date: string;
  installment_id: string | null;
  transfer_to_account_id: string | null;
  exchange_rate: number | null;
  urgency: UrgencyLevel | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  // Joins
  account?: Account;
  category?: Category;
  transfer_to_account?: Account;
  synced?: boolean;
}

export interface Installment {
  id: string;
  user_id: string;
  account_id: string;
  description: string;
  category_id: string | null;
  total_amount: number;
  total_installments: number;
  paid_installments: number;
  installment_amount: number;
  has_interest: boolean;
  interest_rate: number;
  cft_total: number;
  net_amount: number | null;
  due_day: number;
  start_date: string;
  currency: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joins
  account?: Account;
  category?: Category;
  // Computed (from view)
  remaining_installments?: number;
  remaining_amount?: number;
  progress_percent?: number;
  next_due_date?: string;
  account_name?: string;
  category_name?: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  type: GoalType;
  description: string | null;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  monthly_contribution: number;
  priority: number;
  icon: string;
  color: string;
  currency: string;
  image_url: string | null;
  product_url: string | null;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiMemory {
  id: string;
  user_id: string;
  role: MessageRole;
  content: string;
  metadata: Record<string, unknown>;
  session_id: string | null;
  created_at: string;
}

export interface CategoryBudget {
  id: string;
  user_id?: string;
  category_id: string;
  monthly_limit: number;
  currency: string;
  created_at: string;
  updated_at?: string;
  // Computed
  category?: Category;
  spent_this_month?: number;
  remaining?: number;
  percentage?: number;
  is_over_budget?: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  currency: string;
  billing_cycle: "monthly" | "yearly";
  renewal_day: number;
  category_id?: string | null;
  account_id?: string | null;
  is_active: boolean;
  icon?: string;
  color?: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Computed
  days_until_renewal?: number;
  category?: Category;
  account?: Account;
}

export interface FinancialHealthMetrics {
  score: number; // 0 - 100
  status: "excelente" | "saludable" | "atencion" | "critico";
  savings_rate: number; // percentage
  runway_months: number; // months of survival
  free_cash_flow: number; // income - expenses - installments - savings
  debt_ratio: number; // monthly debt / monthly income
}

// ---- API Response Types ----

export interface FinancialSummary {
  accounts: Account[];
  total_balance: number;
  total_balance_ars: number;
  income_30d: number;
  expense_30d: number;
  configured_salary?: number;
  salary_pay_day?: number;
  active_installments: Installment[];
  active_installments_count?: number;
  total_installments_monthly: number;
  savings_goals_progress?: number;
  recent_transactions?: Transaction[];
  upcoming_installments: Array<{
    description: string;
    amount: number;
    due_date: string;
    account_name: string;
  }>;
  top_categories: Array<{
    category_name: string;
    total: number;
    count: number;
  }>;
  savings_goals: SavingsGoal[];
  category_budgets?: CategoryBudget[];
  subscriptions?: Subscription[];
  total_subscriptions_monthly?: number;
  health_metrics?: FinancialHealthMetrics;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp?: Date | string;
  created_at?: string;
  user_id?: string;
  actions?: ExecutedAction[];
  metadata?: Record<string, unknown>;
  isLoading?: boolean;
  imagePreview?: string; // data URI para mostrar imagen enviada por el usuario
}

export interface ExecutedAction {
  tool: string;
  status: "success" | "error";
  summary: string;
  data?: unknown;
}

// ---- Form Types ----

export interface TransactionFormData {
  type: TransactionType;
  amount: string;
  currency: string;
  category_id: string;
  account_id: string;
  description: string;
  date: string;
  transfer_to_account_id?: string;
}

export interface InstallmentFormData {
  description: string;
  total_amount: string;
  total_installments: string;
  has_interest: boolean;
  interest_rate: string;
  account_id: string;
  category_id: string;
  due_day: string;
  start_date: string;
  currency: string;
  notes: string;
}

export interface SavingsGoalFormData {
  name: string;
  type: GoalType;
  description: string;
  target_amount: string;
  current_amount: string;
  target_date: string;
  monthly_contribution: string;
  priority: string;
  icon: string;
  color: string;
  currency: string;
  product_url: string;
}

// ---- GEL-042: Mi Sueldo & Mis Horarios ----

export interface SalaryRecord {
  id: string;
  user_id: string;
  period: string; // ej: "Marzo 2026"
  net_salary: number; // Sueldo en mano
  gross_salary: number | null;
  total_hours: number; // Horas base mensuales (ej: 160 o 200)
  hourly_rate_normal: number;
  hourly_rate_night: number;
  created_at: string;
}

export interface CoworkerOverlap {
  name: string;
  overlap_hours: number;
  their_shift?: string;
}

export interface WorkShift {
  id: string;
  user_id: string;
  shift_date: string; // YYYY-MM-DD
  day_name?: string; // "Lunes"
  start_time: string; // "14:00"
  end_time: string; // "22:00"
  total_hours: number;
  night_hours: number; // Horas entre las 21:00 y las 06:00
  coworkers_overlap: CoworkerOverlap[];
  notes?: string | null;
  created_at: string;
}

export interface SalaryFormData {
  period: string;
  net_salary: number;
  gross_salary?: number;
  total_hours: number;
}

