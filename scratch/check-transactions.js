const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
dotenv.config({ path: "C:/Users/thiago/Desktop/inteligencia artificial/antigravity/cosas hechas con antigravity/03_APPS-WEB/Control-gastos/finance-app/.env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o claves de Supabase");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTransactions() {
  console.log("=== AUDITORÍA FÍSICA EN SUPABASE (public.transactions) ===");
  const { data, error } = await supabase
    .from("transactions")
    .select("id, user_id, account_id, type, amount, description, category, date, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error al consultar transactions:", error);
    return;
  }

  console.log(`Total de filas recientes recuperadas: ${data.length}\n`);
  data.forEach((tx, idx) => {
    console.log(`[#${idx + 1}] ID: ${tx.id}`);
    console.log(`     User ID:     ${tx.user_id}`);
    console.log(`     Account ID:  ${tx.account_id}`);
    console.log(`     Tipo/Monto:  ${tx.type.toUpperCase()} $${tx.amount} (${tx.category || "Sin categoría"})`);
    console.log(`     Descripción: ${tx.description}`);
    console.log(`     Creado el:   ${tx.created_at}`);
    console.log("------------------------------------------------------------");
  });
}

checkTransactions();
