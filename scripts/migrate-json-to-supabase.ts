import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Leer variables de .env
function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || "";
        val = val.trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Faltan credenciales de Supabase en .env (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function migrate() {
  console.log("🚀 Iniciando migración de datos locales JSON a Supabase PostgreSQL...");
  console.log(`🌐 Supabase URL: ${supabaseUrl}`);

  const usersDataDir = path.join(process.cwd(), "data", "users_data");
  if (!fs.existsSync(usersDataDir)) {
    console.error(`❌ Directorio no encontrado: ${usersDataDir}`);
    return;
  }

  const files = fs.readdirSync(usersDataDir).filter((f) => f.endsWith(".json"));
  console.log(`📂 Archivos encontrados para migrar: ${files.length}`);

  let totalMigratedProfiles = 0;
  let totalMigratedAccounts = 0;
  let totalMigratedCategories = 0;
  let totalMigratedTransactions = 0;
  let totalMigratedInstallments = 0;
  let totalMigratedGoals = 0;
  let totalMigratedBudgets = 0;
  let totalMigratedSubscriptions = 0;

  for (const file of files) {
    const filePath = path.join(usersDataDir, file);
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      const user = data.user;

      if (!user || !user.id) {
        console.warn(`⚠️ Archivo sin usuario válido: ${file}`);
        continue;
      }

      console.log(`\n👤 Procesando usuario: ${user.name || user.email} (${user.id})`);

      // 1. Migrar Perfil
      const { error: profileErr } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email || `${user.id}@finanzapp.com`,
          name: user.name || "Usuario",
          salary: Number(user.salary) || 800000,
          currency: user.currency || "ARS",
          pay_day: Number(user.payDay) || 5,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      if (profileErr) {
        console.warn(`  ⚠️ Error en perfil: ${profileErr.message}`);
      } else {
        totalMigratedProfiles++;
        console.log(`  ✓ Perfil sincronizado`);
      }

      // 2. Migrar Categorías
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        for (const cat of data.categories) {
          const { error: catErr } = await supabase.from("categories").upsert(
            {
              id: cat.id,
              user_id: user.id,
              name: cat.name,
              type: cat.type,
              icon: cat.icon || "Tag",
              color: cat.color || "#6366F1",
              is_default: Boolean(cat.is_default),
            },
            { onConflict: "id" }
          );
          if (!catErr) totalMigratedCategories++;
        }
        console.log(`  ✓ ${data.categories.length} categorías sincronizadas`);
      }

      // 3. Migrar Cuentas
      if (Array.isArray(data.accounts) && data.accounts.length > 0) {
        for (const acc of data.accounts) {
          const { error: accErr } = await supabase.from("accounts").upsert(
            {
              id: acc.id,
              user_id: user.id,
              name: acc.name,
              type: acc.type || "digital_wallet",
              balance: Number(acc.balance) || 0,
              currency: acc.currency || "ARS",
              color: acc.color || "#10B981",
              icon: acc.icon || "Wallet",
              is_active: acc.is_active !== false,
            },
            { onConflict: "id" }
          );
          if (!accErr) totalMigratedAccounts++;
        }
        console.log(`  ✓ ${data.accounts.length} cuentas sincronizadas`);
      }

      // 4. Migrar Transacciones
      if (Array.isArray(data.transactions) && data.transactions.length > 0) {
        for (const tx of data.transactions) {
          const { error: txErr } = await supabase.from("transactions").upsert(
            {
              id: tx.id,
              user_id: user.id,
              account_id: tx.account_id || null,
              category_id: tx.category_id || null,
              destination_account_id: tx.destination_account_id || null,
              type: tx.type,
              amount: Number(tx.amount) || 0,
              description: tx.description || "Sin descripción",
              date: tx.date || new Date().toISOString(),
              receipt_url: tx.receipt_url || null,
            },
            { onConflict: "id" }
          );
          if (!txErr) totalMigratedTransactions++;
        }
        console.log(`  ✓ ${data.transactions.length} transacciones sincronizadas`);
      }

      // 5. Migrar Cuotas (Installments)
      if (Array.isArray(data.installments) && data.installments.length > 0) {
        for (const inst of data.installments) {
          const { error: instErr } = await supabase.from("installments").upsert(
            {
              id: inst.id,
              user_id: user.id,
              account_id: inst.account_id || null,
              card_name: inst.card_name || inst.cardName || "Tarjeta",
              item_name: inst.item_name || inst.itemName || "Compra en cuotas",
              total_amount: Number(inst.total_amount || inst.totalAmount) || 0,
              total_installments: Number(inst.total_installments || inst.totalInstallments) || 1,
              paid_installments: Number(inst.paid_installments || inst.paidInstallments) || 0,
              installment_amount: Number(inst.installment_amount || inst.installmentAmount) || 0,
              interest_rate: Number(inst.interest_rate || inst.interestRate) || 0,
              interest_type: inst.interest_type || "none",
              first_due_date: inst.first_due_date || inst.firstDueDate || new Date().toISOString().split("T")[0],
              is_active: inst.is_active !== false,
            },
            { onConflict: "id" }
          );
          if (!instErr) totalMigratedInstallments++;
        }
        console.log(`  ✓ ${data.installments.length} planes de cuotas sincronizados`);
      }

      // 6. Migrar Metas (Goals)
      if (Array.isArray(data.goals) && data.goals.length > 0) {
        for (const g of data.goals) {
          const { error: goalErr } = await supabase.from("goals").upsert(
            {
              id: g.id,
              user_id: user.id,
              name: g.name,
              target_amount: Number(g.target_amount || g.targetAmount) || 0,
              current_amount: Number(g.current_amount || g.currentAmount) || 0,
              deadline: g.deadline || null,
              color: g.color || "#10B981",
              icon: g.icon || "Target",
            },
            { onConflict: "id" }
          );
          if (!goalErr) totalMigratedGoals++;
        }
        console.log(`  ✓ ${data.goals.length} metas de ahorro sincronizadas`);
      }

      // 7. Migrar Presupuestos (Budgets)
      if (Array.isArray(data.budgets) && data.budgets.length > 0) {
        for (const b of data.budgets) {
          const { error: bErr } = await supabase.from("budgets").upsert(
            {
              id: b.id,
              user_id: user.id,
              category_id: b.category_id || b.categoryId,
              monthly_limit: Number(b.monthly_limit || b.monthlyLimit) || 0,
              period: b.period || "monthly",
            },
            { onConflict: "id" }
          );
          if (!bErr) totalMigratedBudgets++;
        }
        console.log(`  ✓ ${data.budgets.length} presupuestos sincronizados`);
      }

      // 8. Migrar Suscripciones
      if (Array.isArray(data.subscriptions) && data.subscriptions.length > 0) {
        for (const s of data.subscriptions) {
          const { error: sErr } = await supabase.from("subscriptions").upsert(
            {
              id: s.id,
              user_id: user.id,
              name: s.name,
              amount: Number(s.amount) || 0,
              billing_cycle: s.billing_cycle || s.billingCycle || "monthly",
              billing_day: Number(s.billing_day || s.billingDay) || 1,
              account_id: s.account_id || null,
              category_id: s.category_id || null,
              is_active: s.is_active !== false,
            },
            { onConflict: "id" }
          );
          if (!sErr) totalMigratedSubscriptions++;
        }
        console.log(`  ✓ ${data.subscriptions.length} suscripciones sincronizadas`);
      }
    } catch (err: unknown) {
      console.error(`❌ Error procesando ${file}:`, err);
    }
  }

  console.log("\n==================================================");
  console.log("🎉 RESUMEN DE MIGRACION A SUPABASE POSTGRESQL:");
  console.log(`  - Perfiles creados/actualizados: ${totalMigratedProfiles}`);
  console.log(`  - Cuentas migradas             : ${totalMigratedAccounts}`);
  console.log(`  - Categorías migradas          : ${totalMigratedCategories}`);
  console.log(`  - Transacciones migradas       : ${totalMigratedTransactions}`);
  console.log(`  - Planes de cuotas migrados    : ${totalMigratedInstallments}`);
  console.log(`  - Metas de ahorro migradas     : ${totalMigratedGoals}`);
  console.log(`  - Presupuestos migrados        : ${totalMigratedBudgets}`);
  console.log(`  - Suscripciones migradas       : ${totalMigratedSubscriptions}`);
  console.log("==================================================\n");
}

migrate()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
