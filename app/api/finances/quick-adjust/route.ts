import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import {
  getAccounts,
  updateAccount,
  addAccount,
  getSummary,
} from "@/lib/db/supabase-store";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const body = await req.json();

    const {
      action,
      totalBalance,
      monthlyIncome,
      accountName,
      salaryAmount,
      payDay,
      alsoUpdateBalance,
      accountId,
    } = body;

    // 1. Modificar sueldo y día de cobro
    if (action === "set_salary") {
      const amount = parseFloat(salaryAmount) || 0;
      const day = parseInt(payDay) || 5;

      try {
        const supabase = await createClient();
        await supabase
          .from("profiles")
          .update({ salary: amount, pay_day: day, updated_at: new Date().toISOString() })
          .eq("id", user.id);
      } catch (err) {
        console.warn("[quick-adjust set_salary profile fallback]:", err);
      }

      if (alsoUpdateBalance) {
        const accounts = await getAccounts(user.id);
        const targetAcc = accountId
          ? accounts.find((a) => a.id === accountId)
          : accounts[0];
        if (targetAcc) {
          await updateAccount(user.id, targetAcc.id, { balance: amount });
        }
      }

      return NextResponse.json({
        success: true,
        summary: await getSummary(user.id, { salary: amount }),
      });
    }

    // 2. Establecer saldo directo
    if (action === "set_cash" || action === "set_direct") {
      const amount = parseFloat(totalBalance) || 0;
      const accounts = await getAccounts(user.id);

      if (accounts.length === 0) {
        await addAccount(user.id, {
          name: accountName || "Billetera Principal",
          balance: amount,
          type: "bank",
        });
      } else {
        await updateAccount(user.id, accounts[0].id, {
          balance: amount,
          name: accountName || accounts[0].name,
        });
      }

      if (monthlyIncome !== undefined) {
        try {
          const supabase = await createClient();
          await supabase
            .from("profiles")
            .update({ salary: parseFloat(monthlyIncome) || 0 })
            .eq("id", user.id);
        } catch {}
      }

      return NextResponse.json({
        success: true,
        summary: await getSummary(user.id),
      });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (err: unknown) {
    console.error("[/api/finances/quick-adjust error]:", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
