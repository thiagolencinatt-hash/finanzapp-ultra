import { createAdminClient as createClient } from "@/lib/supabase/server";
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
import * as localStore from "./cloud-store";

export async function ensureDefaultAccount(userId: string): Promise<string> {
  if (userId === "demo-user") return "default-cash";
  try {
    const supabase = await createClient();
    const { data: accounts, error } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (!error && accounts && accounts.length > 0) {
      return accounts[0].id;
    }

    // Si no hay cuentas, crear la cuenta Efectivo por defecto
    const defaultAccount = {
      user_id: userId,
      name: "Efectivo",
      type: "cash",
      balance: 0,
      currency: "ARS",
      color: "#10B981",
      icon: "Wallet",
      is_active: true,
    };
    const { data: newAcc, error: insertErr } = await supabase
      .from("accounts")
      .insert([defaultAccount])
      .select("id")
      .single();

    if (!insertErr && newAcc) {
      return newAcc.id;
    }
  } catch (err) {
    console.error("[supabase-store] ensureDefaultAccount fallback:", err);
  }
  return "default-cash";
}

/**
 * Motor de persistencia Supabase Cloud-First con tipos TypeScript estrictos.
 * Si Supabase responde, opera sobre las tablas PostgreSQL relacionales.
 * Si hay falta de conexión momentánea, recurre al almacenamiento local sincronizado.
 */

// 1. CUENTAS Y BILLETERAS
export async function getAccounts(userId: string): Promise<Account[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (!error && Array.isArray(data)) {
      if (data.length === 0 && userId !== "demo-user") {
        // Fase 1: Auto-Seed de Cuentas Predeterminadas
        const defaultAccounts = [
          { user_id: userId, name: "Efectivo", type: "cash", balance: 0, currency: "ARS", color: "#10B981", icon: "Banknote", is_active: true },
          { user_id: userId, name: "Mercado Pago", type: "digital_wallet", balance: 0, currency: "ARS", color: "#3B82F6", icon: "Smartphone", is_active: true },
          { user_id: userId, name: "Banco / Débito", type: "bank_account", balance: 0, currency: "ARS", color: "#8B5CF6", icon: "CreditCard", is_active: true }
        ];
        const { data: insertedData, error: insertError } = await supabase.from("accounts").insert(defaultAccounts).select();
        if (!insertError && insertedData) {
          return insertedData.map((a) => ({
            id: a.id,
            user_id: a.user_id,
            name: a.name,
            type: a.type || "digital_wallet",
            balance: Number(a.balance) || 0,
            currency: a.currency || "ARS",
            color: a.color || "#10B981",
            icon: a.icon || "Wallet",
            is_active: a.is_active !== false,
            created_at: a.created_at,
            updated_at: a.updated_at || a.created_at,
          }));
        }
      }

      return data.map((a) => ({
        id: a.id,
        user_id: a.user_id,
        name: a.name,
        type: a.type || "digital_wallet",
        balance: Number(a.balance) || 0,
        currency: a.currency || "ARS",
        color: a.color || "#10B981",
        icon: a.icon || "Wallet",
        is_active: a.is_active !== false,
        created_at: a.created_at,
        updated_at: a.updated_at || a.created_at,
      }));
    }
  } catch (err) {
    console.warn("[supabase-store] getAccounts fallback:", err);
  }
  
  if (userId === "demo-user") {
    return localStore.getUserAccounts(userId);
  }
  return [];
}

export async function addAccount(userId: string, account: Partial<Account>): Promise<Account> {
  try {
    const supabase = await createClient();
    const newRow = {
      user_id: userId,
      name: account.name || "Nueva Cuenta",
      type: account.type || "digital_wallet",
      balance: Number(account.balance) || 0,
      currency: account.currency || "ARS",
      color: account.color || "#10B981",
      icon: account.icon || "Wallet",
      is_active: true,
    };

    const { data, error } = await supabase.from("accounts").insert(newRow).select().single();
    if (!error && data) {
      await localStore.addUserAccount(userId, data);
      return data;
    }
  } catch (err) {
    console.warn("[supabase-store] addAccount fallback:", err);
  }
  return localStore.addUserAccount(userId, account);
}

export async function updateAccount(
  userId: string,
  accountId: string,
  updates: Partial<Account>
): Promise<Account | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("accounts")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId)
      .eq("user_id", userId)
      .select()
      .maybeSingle();

    if (!error && data) {
      await localStore.updateUserAccount(userId, accountId, updates);
      return data;
    }
  } catch (err) {
    console.warn("[supabase-store] updateAccount fallback:", err);
  }
  return localStore.updateUserAccount(userId, accountId, updates);
}

export async function deleteAccount(userId: string, accountId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("accounts")
      .update({ is_active: false })
      .eq("id", accountId)
      .eq("user_id", userId);

    if (!error) {
      await localStore.deleteUserAccount(userId, accountId);
      return true;
    }
  } catch (err) {
    console.warn("[supabase-store] deleteAccount fallback:", err);
  }
  return localStore.deleteUserAccount(userId, accountId);
}

// 2. CATEGORIAS
export async function getCategories(userId: string): Promise<Category[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", userId);

    if (!error && Array.isArray(data)) {
      return data;
    }
  } catch (err) {
    console.warn("[supabase-store] getCategories fallback:", err);
  }
  if (userId === "demo-user") {
    return localStore.getUserCategories(userId);
  }
  return [];
}

// 3. TRANSACCIONES
export async function getTransactions(userId: string): Promise<Transaction[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (!error && Array.isArray(data)) {
      return data.map((t) => ({
        id: t.id,
        user_id: t.user_id,
        account_id: t.account_id || "",
        category_id: t.category_id || null,
        type: t.type,
        amount: Number(t.amount) || 0,
        currency: t.currency || "ARS",
        description: t.description || null,
        date: t.date,
        installment_id: t.installment_id || null,
        transfer_to_account_id: t.destination_account_id || null,
        exchange_rate: null,
        urgency: null,
        tags: [],
        created_at: t.created_at,
        updated_at: t.created_at,
      }));
    }
  } catch (err) {
    console.warn("[supabase-store] getTransactions error:", err);
  }
  if (userId === "demo-user") {
    const result = await localStore.getUserTransactions(userId);
    return result.data || [];
  }
  return [];
}

export async function addTransaction(
  userId: string,
  tx: Partial<Transaction>
): Promise<Transaction> {
  const amount = Number(tx.amount) || 0;
  const type = tx.type || "expense";
  const description = tx.description || "Movimiento";
  const date = tx.date || new Date().toISOString();
  const accountId = tx.account_id || "";
  const categoryId = tx.category_id || null;

  try {
    const supabase = await createClient();
    const finalAccountId = accountId || (await ensureDefaultAccount(userId));
    
    const newRow = {
      user_id: userId,
      account_id: finalAccountId,
      category_id: categoryId,
      destination_account_id: tx.transfer_to_account_id || null,
      type,
      amount,
      description,
      date,
    };

    const { data, error } = await supabase.from("transactions").insert(newRow).select().single();
    if (!error && data) {
      if (finalAccountId) {
        const { data: acc } = await supabase
          .from("accounts")
          .select("balance")
          .eq("id", finalAccountId)
          .single();

        if (acc) {
          const currentBal = Number(acc.balance) || 0;
          const newBal = type === "income" ? currentBal + amount : currentBal - amount;
          await supabase.from("accounts").update({ balance: newBal }).eq("id", finalAccountId);
        }
      }

      await localStore.addUserTransaction(userId, tx);
      return {
        id: data.id,
        user_id: userId,
        account_id: finalAccountId,
        category_id: categoryId,
        type,
        amount,
        currency: tx.currency || "ARS",
        description,
        date,
        installment_id: null,
        transfer_to_account_id: tx.transfer_to_account_id || null,
        exchange_rate: null,
        urgency: null,
        tags: [],
        created_at: data.created_at,
        updated_at: data.created_at,
      };
    } else {
      console.error("[supabase-store] addTransaction Supabase error:", error);
    }
  } catch (err) {
    console.error("[supabase-store] addTransaction fallback:", err);
  }
  return localStore.addUserTransaction(userId, tx);
}

export async function deleteTransaction(userId: string, transactionId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", transactionId)
      .eq("user_id", userId);

    if (!error) {
      await localStore.deleteUserTransaction(userId, transactionId);
      return true;
    }
  } catch (err) {
    console.warn("[supabase-store] deleteTransaction fallback:", err);
  }
  return localStore.deleteUserTransaction(userId, transactionId);
}

// 4. COMPRAS EN CUOTAS (FASE 4: INTERESES + PAGO RÁPIDO)
export async function getInstallments(userId: string): Promise<Installment[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("installments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((i) => {
        const totalAmount = Number(i.total_amount) || 0;
        const totalInst = Number(i.total_installments) || 1;
        const paidInst = Number(i.paid_installments) || 0;
        const instAmount = Number(i.installment_amount) || totalAmount / totalInst;
        const interestRate = Number(i.interest_rate) || 0;
        const hasInterest = interestRate > 0;

        return {
          id: i.id,
          user_id: i.user_id,
          account_id: i.account_id || "",
          description: i.item_name || i.description || "Compra",
          category_id: null,
          total_amount: totalAmount,
          total_installments: totalInst,
          paid_installments: paidInst,
          installment_amount: instAmount,
          has_interest: hasInterest,
          interest_rate: interestRate,
          cft_total: interestRate,
          net_amount: totalAmount,
          due_day: 10,
          start_date: i.first_due_date || new Date().toISOString().split("T")[0],
          currency: "ARS",
          notes: null,
          is_active: i.is_active !== false,
          created_at: i.created_at,
          updated_at: i.created_at,
          account_name: i.card_name || "Tarjeta",
          remaining_installments: totalInst - paidInst,
          remaining_amount: (totalInst - paidInst) * instAmount,
          progress_percent: Math.round((paidInst / totalInst) * 100),
        };
      });
    }
  } catch (err) {
    console.warn("[supabase-store] getInstallments fallback:", err);
  }
  if (userId === "demo-user") {
    return localStore.getUserInstallments(userId);
  }
  return [];
}

export async function addInstallment(
  userId: string,
  inst: Partial<Installment> & { item_name?: string; card_name?: string }
): Promise<Installment> {
  const totalAmount = Number(inst.total_amount) || 0;
  const totalInst = Number(inst.total_installments) || 1;
  const interestRate = Number(inst.interest_rate) || 0;
  const hasInterest = interestRate > 0 || Boolean(inst.has_interest);

  const finalAmount = hasInterest ? totalAmount * (1 + interestRate / 100) : totalAmount;
  const instAmount = Math.round((finalAmount / totalInst) * 100) / 100;
  const itemName = inst.item_name || inst.description || "Compra en cuotas";
  const cardName = inst.card_name || "Tarjeta";

  try {
    const supabase = await createClient();
    const newRow = {
      user_id: userId,
      account_id: inst.account_id || null,
      card_name: cardName,
      item_name: itemName,
      total_amount: Math.round(finalAmount * 100) / 100,
      total_installments: totalInst,
      paid_installments: Number(inst.paid_installments) || 0,
      installment_amount: instAmount,
      interest_rate: interestRate,
      interest_type: hasInterest ? "fixed_percentage" : "none",
      first_due_date: inst.start_date || new Date().toISOString().split("T")[0],
      is_active: true,
    };

    const { data, error } = await supabase.from("installments").insert(newRow).select().single();
    if (!error && data) {
      await localStore.addUserInstallment(userId, {
        ...inst,
        description: itemName,
        total_amount: finalAmount,
        total_installments: totalInst,
        installment_amount: instAmount,
        has_interest: hasInterest,
        interest_rate: interestRate,
      });

      return {
        id: data.id,
        user_id: userId,
        account_id: inst.account_id || "",
        description: itemName,
        category_id: null,
        total_amount: finalAmount,
        total_installments: totalInst,
        paid_installments: 0,
        installment_amount: instAmount,
        has_interest: hasInterest,
        interest_rate: interestRate,
        cft_total: interestRate,
        net_amount: totalAmount,
        due_day: 10,
        start_date: data.first_due_date,
        currency: "ARS",
        notes: null,
        is_active: true,
        created_at: data.created_at,
        updated_at: data.created_at,
        account_name: cardName,
      };
    }
  } catch (err) {
    console.warn("[supabase-store] addInstallment fallback:", err);
  }
  return localStore.addUserInstallment(userId, inst);
}

// FASE 4: Pago rápido de cuota
export async function payInstallmentDue(
  userId: string,
  installmentId: string,
  accountId?: string
): Promise<{ success: boolean; installment: Installment; transactionId?: string }> {
  const installments = await getInstallments(userId);
  const inst = installments.find((i) => i.id === installmentId);

  if (!inst) {
    throw new Error("Plan de cuota no encontrado");
  }

  if (inst.paid_installments >= inst.total_installments) {
    throw new Error("Este plan ya está totalmente pagado");
  }

  const targetAccountId = accountId || inst.account_id;
  const newPaidCount = inst.paid_installments + 1;
  const isFullyPaid = newPaidCount >= inst.total_installments;

  // Registrar gasto en transacciones
  const tx = await addTransaction(userId, {
    account_id: targetAccountId,
    type: "expense",
    amount: inst.installment_amount,
    description: `Pago cuota ${newPaidCount}/${inst.total_installments}: ${inst.description} (${inst.account_name || "Tarjeta"})`,
    date: new Date().toISOString(),
  });

  // Actualizar la cuota
  const updatedInst: Installment = {
    ...inst,
    paid_installments: newPaidCount,
    is_active: !isFullyPaid,
    remaining_installments: inst.total_installments - newPaidCount,
    remaining_amount: (inst.total_installments - newPaidCount) * inst.installment_amount,
    progress_percent: Math.round((newPaidCount / inst.total_installments) * 100),
  };

  try {
    const supabase = await createClient();
    await supabase
      .from("installments")
      .update({
        paid_installments: newPaidCount,
        is_active: !isFullyPaid,
      })
      .eq("id", installmentId)
      .eq("user_id", userId);
  } catch (err) {
    console.warn("[supabase-store] payInstallmentDue update fallback:", err);
  }

  await localStore.updateUserInstallment(userId, installmentId, {
    paid_installments: newPaidCount,
    is_active: !isFullyPaid,
  });

  return {
    success: true,
    installment: updatedInst,
    transactionId: tx.id,
  };
}

// 5. METAS DE AHORRO (GOALS)
export async function getGoals(userId: string): Promise<SavingsGoal[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((g) => ({
        id: g.id,
        user_id: g.user_id,
        name: g.name,
        type: "goal",
        description: null,
        target_amount: Number(g.target_amount) || 0,
        current_amount: Number(g.current_amount) || 0,
        target_date: g.deadline || null,
        monthly_contribution: 0,
        priority: 1,
        icon: g.icon || "Target",
        color: g.color || "#10B981",
        currency: "ARS",
        image_url: null,
        product_url: null,
        is_completed: (Number(g.current_amount) || 0) >= (Number(g.target_amount) || 0),
        completed_at: null,
        created_at: g.created_at,
        updated_at: g.created_at,
      }));
    }
  } catch (err) {
    console.warn("[supabase-store] getGoals error:", err);
  }
  if (userId === "demo-user") {
    return localStore.getUserGoals(userId);
  }
  return [];
}

export async function addGoal(userId: string, goal: Partial<SavingsGoal>): Promise<SavingsGoal> {
  const targetAmount = Number(goal.target_amount) || 100000;
  const currentAmount = Number(goal.current_amount) || 0;
  const name = goal.name || "Nueva Meta";

  try {
    const supabase = await createClient();
    const newRow = {
      user_id: userId,
      name,
      target_amount: targetAmount,
      current_amount: currentAmount,
      deadline: goal.target_date || null,
      color: goal.color || "#10B981",
      icon: goal.icon || "Target",
    };

    const { data, error } = await supabase.from("goals").insert(newRow).select().single();
    if (!error && data) {
      await localStore.addUserGoal(userId, goal);
      return {
        id: data.id,
        user_id: userId,
        name,
        type: "goal",
        description: null,
        target_amount: targetAmount,
        current_amount: currentAmount,
        target_date: data.deadline,
        monthly_contribution: 0,
        priority: 1,
        icon: data.icon,
        color: data.color,
        currency: "ARS",
        image_url: null,
        product_url: null,
        is_completed: currentAmount >= targetAmount,
        completed_at: null,
        created_at: data.created_at,
        updated_at: data.created_at,
      };
    }
  } catch (err) {
    console.warn("[supabase-store] addGoal fallback:", err);
  }
  return localStore.addUserGoal(userId, goal);
}

export async function updateGoal(
  userId: string,
  goalId: string,
  updates: Partial<SavingsGoal>
): Promise<SavingsGoal | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("goals")
      .update(updates)
      .eq("id", goalId)
      .eq("user_id", userId)
      .select()
      .maybeSingle();

    if (!error && data) {
      await localStore.updateUserGoal(userId, goalId, updates);
      return {
        id: data.id,
        user_id: userId,
        name: data.name,
        type: "goal",
        description: null,
        target_amount: Number(data.target_amount) || 0,
        current_amount: Number(data.current_amount) || 0,
        target_date: data.deadline,
        monthly_contribution: 0,
        priority: 1,
        icon: data.icon,
        color: data.color,
        currency: "ARS",
        image_url: null,
        product_url: null,
        is_completed: Number(data.current_amount) >= Number(data.target_amount),
        completed_at: null,
        created_at: data.created_at,
        updated_at: data.created_at,
      };
    }
  } catch (err) {
    console.warn("[supabase-store] updateGoal fallback:", err);
  }
  return localStore.updateUserGoal(userId, goalId, updates);
}

// 6. PRESUPUESTOS (BUDGETS)
export async function getBudgets(userId: string): Promise<CategoryBudget[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", userId);

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((b) => ({
        id: b.id,
        user_id: b.user_id,
        category_id: b.category_id,
        monthly_limit: Number(b.monthly_limit) || 0,
        currency: "ARS",
        created_at: b.created_at,
      }));
    }
  } catch (err) {
    console.warn("[supabase-store] getBudgets error:", err);
  }
  if (userId === "demo-user") {
    const store = await localStore.getUserStore(userId);
    return store.budgets || [];
  }
  return [];
}

export async function saveBudgets(
  userId: string,
  budgets: Partial<CategoryBudget>[]
): Promise<CategoryBudget[]> {
  try {
    const supabase = await createClient();
    for (const b of budgets) {
      if (b.category_id && b.monthly_limit !== undefined) {
        await supabase.from("budgets").upsert(
          {
            user_id: userId,
            category_id: b.category_id,
            monthly_limit: Number(b.monthly_limit) || 0,
            period: "monthly",
          },
          { onConflict: "user_id,category_id,period" }
        );
      }
    }
    const { data } = await supabase.from("budgets").select("*").eq("user_id", userId);
    if (data && data.length > 0) {
      return data.map((b) => ({
        id: b.id,
        user_id: b.user_id,
        category_id: b.category_id,
        monthly_limit: Number(b.monthly_limit) || 0,
        currency: "ARS",
        created_at: b.created_at,
      }));
    }
  } catch (err) {
    console.warn("[supabase-store] saveBudgets fallback:", err);
  }
  const store = await localStore.getUserStore(userId);
  return store.budgets || [];
}

// 7. SUSCRIPCIONES
export async function getSubscriptions(userId: string): Promise<Subscription[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((s) => ({
        id: s.id,
        user_id: s.user_id,
        name: s.name,
        amount: Number(s.amount) || 0,
        currency: "ARS",
        billing_cycle: s.billing_cycle || "monthly",
        renewal_day: Number(s.billing_day) || 1,
        is_active: s.is_active !== false,
        created_at: s.created_at,
        updated_at: s.created_at,
      }));
    }
  } catch (err) {
    console.warn("[supabase-store] getSubscriptions error:", err);
  }
  if (userId === "demo-user") {
    const store = await localStore.getUserStore(userId);
    return store.subscriptions || [];
  }
  return [];
}

export async function addSubscription(
  userId: string,
  sub: Partial<Subscription>
): Promise<Subscription> {
  const name = sub.name || "Servicio";
  const amount = Number(sub.amount) || 0;
  const billingCycle = sub.billing_cycle || "monthly";
  const renewalDay = Number(sub.renewal_day) || 1;

  try {
    const supabase = await createClient();
    const newRow = {
      user_id: userId,
      name,
      amount,
      billing_cycle: billingCycle,
      billing_day: renewalDay,
      account_id: sub.account_id || null,
      category_id: sub.category_id || null,
      is_active: true,
    };

    const { data, error } = await supabase.from("subscriptions").insert(newRow).select().single();
    if (!error && data) {
      const store = await localStore.getUserStore(userId);
      const newSub: Subscription = {
        id: data.id,
        user_id: userId,
        name,
        amount,
        currency: "ARS",
        billing_cycle: billingCycle,
        renewal_day: renewalDay,
        is_active: true,
        created_at: data.created_at,
        updated_at: data.created_at,
      };
      if (!store.subscriptions) store.subscriptions = [];
      store.subscriptions.push(newSub);
      await localStore.saveUserStore(userId);
      return newSub;
    }
  } catch (err) {
    console.warn("[supabase-store] addSubscription fallback:", err);
  }
  const store = await localStore.getUserStore(userId);
  const fallbackSub: Subscription = {
    id: `sub-${Date.now()}`,
    user_id: userId,
    name,
    amount,
    currency: "ARS",
    billing_cycle: billingCycle,
    renewal_day: renewalDay,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (!store.subscriptions) store.subscriptions = [];
  store.subscriptions.push(fallbackSub);
  await localStore.saveUserStore(userId);
  return fallbackSub;
}

// 8. RESUMEN COMPLETO (FINANCIAL SUMMARY)
export async function getSummary(
  userId: string,
  userInfo?: { email?: string; name?: string; currency?: string; salary?: number }
): Promise<FinancialSummary> {
  try {
    const [accounts, transactions, installments, goals, subscriptions] =
      await Promise.all([
        getAccounts(userId),
        getTransactions(userId),
        getInstallments(userId),
        getGoals(userId),
        getSubscriptions(userId),
      ]);

    let totalBalance = accounts
      .filter((a) => a.is_active)
      .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
      
    // Anti-zero protection: si el balance es 0 pero hay transacciones, 
    // recalcular el balance desde las transacciones (en caso de que accounts esté desfasado o vacío).
    if (totalBalance === 0 && transactions.length > 0) {
      totalBalance = transactions.reduce((sum, t) => {
        return t.type === "income" ? sum + Number(t.amount) : sum - Number(t.amount);
      }, 0);
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const currentMonthTxs = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    const monthlyIncome = currentMonthTxs
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const monthlyExpenses = currentMonthTxs
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const activeInst = installments.filter((i) => i.is_active);
    const totalInstMonthly = activeInst.reduce((sum, i) => sum + (Number(i.installment_amount) || 0), 0);
    const totalSubsMonthly = subscriptions.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

    return {
      accounts,
      total_balance: totalBalance,
      total_balance_ars: totalBalance,
      income_30d: monthlyIncome,
      expense_30d: monthlyExpenses,
      configured_salary: userInfo?.salary || 800000,
      salary_pay_day: 5,
      active_installments: activeInst,
      active_installments_count: activeInst.length,
      total_installments_monthly: totalInstMonthly,
      savings_goals: goals,
      subscriptions,
      total_subscriptions_monthly: totalSubsMonthly,
      recent_transactions: transactions.slice(0, 10),
      upcoming_installments: activeInst.map((i) => ({
        description: i.description,
        amount: i.installment_amount,
        due_date: i.start_date,
        account_name: i.account_name || "Tarjeta",
      })),
      top_categories: [],
    };
  } catch (err) {
    console.warn("[supabase-store] getSummary fallback:", err);
    return localStore.getUserSummary(userId, userInfo);
  }
}

// 9. MENSAJES DE CHAT IA
export async function getChatMessages(userId: string, limit: number = 20): Promise<ChatMessage[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error && Array.isArray(data)) {
      return data.reverse().map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.created_at,
        created_at: m.created_at,
        user_id: m.user_id,
      }));
    }
  } catch (err) {
    console.warn("[supabase-store] getChatMessages fallback:", err);
  }
  return localStore.getUserChatMessages(userId, limit);
}

export async function addChatMessage(
  userId: string,
  role: "user" | "assistant",
  content: string
): Promise<ChatMessage> {
  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: userId,
    role,
    content,
    timestamp: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  try {
    const supabase = await createClient();
    await supabase.from("chat_messages").insert({
      user_id: userId,
      role,
      content,
    });
  } catch (err) {
    console.warn("[supabase-store] addChatMessage fallback:", err);
  }

  await localStore.addUserChatMessage(userId, newMsg);
  return newMsg;
}
