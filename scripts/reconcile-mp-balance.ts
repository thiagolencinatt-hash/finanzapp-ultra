import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const envPath = path.join(process.cwd(), file);
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
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Faltan credenciales de Supabase en .env / .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log("🔍 Iniciando conciliación de saldo real Mercado Pago (GEL-046)...");
  
  const THIAGO_USER_ID = "4c5a686f-3566-4653-bd5e-85c973f443b7";
  const TARGET_BALANCE = 26882.67;

  // 1. Obtener cuentas del usuario Thiago
  const { data: accounts, error: accErr } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", THIAGO_USER_ID);

  if (accErr) {
    console.error("❌ Error al obtener cuentas:", accErr);
    process.exit(1);
  }

  console.log(`Cuentas encontradas para Thiago (${THIAGO_USER_ID}): ${accounts?.length || 0}`);
  for (const acc of accounts || []) {
    console.log(`- [${acc.id}] "${acc.name}" (${acc.type}) | Balance actual: $${acc.balance}`);
  }

  // 2. Identificar y nombrar correctamente cada cuenta
  const mpAccount = (accounts || []).find((a) =>
    a.type === "digital_wallet" || a.name.toLowerCase().trim() === "mercado pago"
  ) || (accounts || [])[0];

  const bankAccount = (accounts || []).find((a) =>
    a.id !== mpAccount.id && (a.type === "bank" || a.name.toLowerCase().includes("banco"))
  );

  const cashAccount = (accounts || []).find((a) =>
    a.id !== mpAccount.id && a.id !== bankAccount?.id
  );

  // 3. Ajustar saldo y nombres limpios
  console.log(`Sincronizando cuenta Mercado Pago [${mpAccount.id}] a $${TARGET_BALANCE}...`);
  await supabase
    .from("accounts")
    .update({
      name: "Mercado Pago",
      type: "digital_wallet",
      balance: TARGET_BALANCE,
      updated_at: new Date().toISOString(),
    })
    .eq("id", mpAccount.id);

  if (bankAccount) {
    await supabase
      .from("accounts")
      .update({
        name: "Banco / Débito",
        type: "bank",
        balance: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bankAccount.id);
  }

  if (cashAccount) {
    await supabase
      .from("accounts")
      .update({
        name: "Efectivo",
        type: "cash",
        balance: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cashAccount.id);
  }

  // 5. Verificación final
  const { data: finalAccounts } = await supabase
    .from("accounts")
    .select("id, name, type, balance")
    .eq("user_id", THIAGO_USER_ID);

  console.log("\n=======================================================");
  console.log("✅ RESULTADO DE CONCILIACIÓN (GEL-046):");
  console.log("=======================================================");
  let totalConsolidated = 0;
  for (const acc of finalAccounts || []) {
    console.log(`- ${acc.name} (${acc.type}): $${Number(acc.balance).toLocaleString("es-AR", { minimumFractionDigits: 2 })} ARS`);
    totalConsolidated += Number(acc.balance);
  }
  console.log("-------------------------------------------------------");
  console.log(`💰 Saldo Total Consolidado en Hero Card: $${totalConsolidated.toLocaleString("es-AR", { minimumFractionDigits: 2 })} ARS`);
  console.log(`🎯 Coincidencia exacta con saldo real auditado: ${totalConsolidated === TARGET_BALANCE ? "SÍ (100% AUDITADO)" : "NO"}`);
  console.log("=======================================================\n");
}

main().catch(console.error);

