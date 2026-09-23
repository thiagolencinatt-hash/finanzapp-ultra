export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import { getTransactions, getCategories, getAccounts, getBudgets } from "@/lib/db/supabase-store";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const [transactions, categories, accounts, budgets] = await Promise.all([
      getTransactions(user.id),
      getCategories(user.id),
      getAccounts(user.id),
      getBudgets(user.id),
    ]);
    return NextResponse.json({ transactions, categories, accounts, budgets });
  } catch (err: unknown) {
    console.error("[/api/analytics GET error]:", err);
    return NextResponse.json({ error: "Error al obtener datos de analíticas" }, { status: 500 });
  }
}
