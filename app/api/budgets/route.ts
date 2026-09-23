export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import { getBudgets, saveBudgets, deleteBudget, clearAllBudgets } from "@/lib/db/supabase-store";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const budgets = await getBudgets(user.id);
    return NextResponse.json(budgets);
  } catch (err: unknown) {
    console.error("[/api/budgets GET error]:", err);
    return NextResponse.json({ error: "Error al obtener presupuestos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const body = await req.json();
    const { category_id, monthly_limit, currency } = body;

    if (!category_id || monthly_limit === undefined) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    const updatedBudgets = await saveBudgets(user.id, [
      {
        category_id,
        monthly_limit: Number(monthly_limit),
        currency: currency || "ARS",
      },
    ]);

    const targetBudget = updatedBudgets.find((b) => b.category_id === category_id);
    return NextResponse.json(targetBudget || updatedBudgets[0]);
  } catch (err: unknown) {
    console.error("[/api/budgets POST error]:", err);
    return NextResponse.json({ error: "Error al guardar presupuesto" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const body = await req.json();
    const { id, action } = body;

    if (action === "clear_all") {
      await clearAllBudgets(user.id);
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ error: "Falta el ID del presupuesto" }, { status: 400 });
    }

    await deleteBudget(user.id, id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[/api/budgets DELETE error]:", err);
    return NextResponse.json({ error: "Error al eliminar presupuesto" }, { status: 500 });
  }
}
