import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import { resetUserFinances } from "@/lib/db/cloud-store";
import { createAdminClient } from "@/lib/supabase/server";
import * as localStore from "@/lib/db/cloud-store";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    let body: {
      type?: "full" | "transactions" | "budgets";
      confirmWord?: string;
      initialBalanceARS?: number;
      configuredSalary?: number;
      primaryAccountName?: string;
    } = {};

    try {
      body = await req.json();
    } catch {
      //
    }

    const resetType = body.type || "full";
    const confirm = body.confirmWord?.toUpperCase();

    if (resetType === "full" && confirm !== "RESET") {
      return NextResponse.json({ error: "Debe confirmar escribiendo RESET" }, { status: 400 });
    }

    const supabase = await createAdminClient();

    if (resetType === "transactions") {
      // 1. Delete all transactions
      await supabase.from("transactions").delete().eq("user_id", user.id);
      
      // 2. Set all accounts balance to 0 in Supabase
      const { data: accounts } = await supabase.from("accounts").select("id").eq("user_id", user.id);
      if (accounts) {
        for (const acc of accounts) {
          await supabase.from("accounts").update({ balance: 0 }).eq("id", acc.id);
        }
      }
      
      // 3. Clear local transactions and zero out balances
      const store = await localStore.getUserStore(user.id);
      store.transactions = [];
      store.accounts.forEach(a => { a.balance = 0; });
      await localStore.saveUserStore(user.id);
      
      return NextResponse.json({ success: true, message: "Historial de transacciones y saldos blanqueados a 0." });
    }
    
    if (resetType === "budgets") {
      await supabase.from("budgets").delete().eq("user_id", user.id);
      const store = await localStore.getUserStore(user.id);
      store.budgets = [];
      await localStore.saveUserStore(user.id);
      return NextResponse.json({ success: true, message: "Presupuestos reseteados." });
    }

    // FULL RESET
    const initialBalance = typeof body.initialBalanceARS === "number" ? Math.max(0, body.initialBalanceARS) : 0;
    const configuredSalary = typeof body.configuredSalary === "number" ? Math.max(0, body.configuredSalary) : 0;
    const primaryAccountName = body.primaryAccountName?.trim() || "Efectivo / Banco";

    // Delete everything in Supabase except user record
    await Promise.all([
      supabase.from("transactions").delete().eq("user_id", user.id),
      supabase.from("budgets").delete().eq("user_id", user.id),
      supabase.from("goals").delete().eq("user_id", user.id),
      supabase.from("installments").delete().eq("user_id", user.id),
    ]);

    // Reset Accounts balance to 0 in Supabase (or initial balance to the first one)
    const { data: accounts } = await supabase.from("accounts").select("id").eq("user_id", user.id).order("created_at", { ascending: true });
    if (accounts && accounts.length > 0) {
      await supabase.from("accounts").update({ balance: initialBalance, name: primaryAccountName }).eq("id", accounts[0].id);
      for (let i = 1; i < accounts.length; i++) {
        await supabase.from("accounts").update({ balance: 0 }).eq("id", accounts[i].id);
      }
    }

    // Call localStore reset for UI sync
    const summary = await resetUserFinances(user.id, {
      initialBalanceARS: initialBalance,
      configuredSalary,
      primaryAccountName,
    });

    return NextResponse.json({
      success: true,
      message: "Todas las finanzas fueron reseteadas a $0 correctamente.",
      summary,
    });
  } catch (err: unknown) {
    console.error("[/api/finances/reset error]:", err);
    const msg = err instanceof Error ? err.message : "Error al reiniciar datos";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
