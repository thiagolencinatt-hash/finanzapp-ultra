import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import { getUserStore, saveUserStore, getUserSummary } from "@/lib/db/cloud-store";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const store = getUserStore(user.id);
    const body = await req.json();

    const {
      action,
      totalBalance,
      monthlyIncome,
      monthlyExpense,
      accountName,
      clearExpenses,
      salaryAmount,
      payDay,
      alsoUpdateBalance,
      accountId,
    } = body;

    if (action === "set_salary") {
      const amount = parseFloat(salaryAmount) || 0;
      store.user.salary = amount;
      if (payDay) store.user.payDay = parseInt(payDay) || 5;

      if (alsoUpdateBalance) {
        const targetAcc = accountId
          ? store.accounts.find((a) => a.id === accountId)
          : store.accounts[0];
        if (targetAcc) {
          targetAcc.balance = amount;
        }
      }

      saveUserStore(user.id);
      return NextResponse.json({ success: true, summary: getUserSummary(user.id) });
    }

    if (action === "set_cash") {
      const amount = parseFloat(totalBalance) || 0;
      if (store.accounts.length === 0) {
        store.accounts.push({
          id: `acc-${Date.now()}-1`,
          user_id: user.id,
          name: accountName || "Mi Billetera Principal",
          type: "bank",
          balance: amount,
          currency: store.user.currency || "ARS",
          color: "#10B981",
          icon: "Wallet",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        if (accountName) store.accounts[0].name = accountName;
        store.accounts[0].balance = amount;
      }

      if (monthlyIncome !== undefined) {
        store.user.salary = parseFloat(monthlyIncome) || store.user.salary;
      }

      if (clearExpenses) {
        store.transactions = store.transactions.filter((t) => t.type !== "expense");
      }

      saveUserStore(user.id);
      return NextResponse.json({ success: true, summary: getUserSummary(user.id) });
    }

    if (action === "clear_expenses") {
      store.transactions = store.transactions.filter((t) => t.type !== "expense");
      saveUserStore(user.id);
      return NextResponse.json({ success: true, summary: getUserSummary(user.id) });
    }

    if (action === "reset_clean") {
      const amount = parseFloat(totalBalance) || 0;
      store.transactions = [];
      store.installments = [];
      store.goals = [];

      if (store.accounts.length === 0) {
        store.accounts.push({
          id: `acc-${Date.now()}-1`,
          user_id: user.id,
          name: accountName || "Mi Billetera Principal",
          type: "bank",
          balance: amount,
          currency: store.user.currency || "ARS",
          color: "#10B981",
          icon: "Wallet",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        store.accounts[0].name = accountName || "Mi Billetera Principal";
        store.accounts[0].balance = amount;
        for (let i = 1; i < store.accounts.length; i++) {
          store.accounts[i].balance = 0;
        }
      }

      saveUserStore(user.id);
      return NextResponse.json({ success: true, account: store.accounts[0], summary: getUserSummary(user.id) });
    }

    if (action === "set_direct") {
      if (store.accounts.length === 0) {
        store.accounts.push({
          id: `acc-${Date.now()}-1`,
          user_id: user.id,
          name: accountName || "Mi Billetera Principal",
          type: "bank",
          balance: totalBalance !== undefined ? parseFloat(totalBalance) : 0,
          currency: store.user.currency || "ARS",
          color: "#10B981",
          icon: "Wallet",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        if (accountName) store.accounts[0].name = accountName;
        if (totalBalance !== undefined) store.accounts[0].balance = parseFloat(totalBalance) || 0;
      }

      if (monthlyIncome !== undefined) {
        store.user.salary = parseFloat(monthlyIncome) || 0;
      }

      if (clearExpenses) {
        store.transactions = store.transactions.filter((t) => t.type !== "expense");
      }

      saveUserStore(user.id);
      return NextResponse.json({ success: true, summary: getUserSummary(user.id) });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (err: unknown) {
    console.error("[/api/finances/quick-adjust error]:", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
