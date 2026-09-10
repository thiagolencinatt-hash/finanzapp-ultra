import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import { getUserStore, saveUserStore } from "@/lib/db/cloud-store";
import type { CategoryBudget } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const store = getUserStore(user.id);
    return NextResponse.json(store.budgets || []);
  } catch (err: unknown) {
    console.error("[/api/budgets GET error]:", err);
    return NextResponse.json({ error: "Error al obtener presupuestos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const store = getUserStore(user.id);
    const body = await req.json();
    const { category_id, monthly_limit, currency } = body;

    if (!category_id || monthly_limit === undefined) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    if (!store.budgets) store.budgets = [];
    const existing = store.budgets.find((b) => b.category_id === category_id);
    if (existing) {
      existing.monthly_limit = Number(monthly_limit);
      if (currency) existing.currency = currency;
      saveUserStore(user.id);
      return NextResponse.json(existing);
    }

    const newBudget: CategoryBudget = {
      id: `bud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: user.id,
      category_id,
      monthly_limit: Number(monthly_limit),
      currency: currency || "ARS",
      spent_this_month: 0,
      created_at: new Date().toISOString(),
    };

    store.budgets.push(newBudget);
    saveUserStore(user.id);
    return NextResponse.json(newBudget);
  } catch (err: unknown) {
    console.error("[/api/budgets POST error]:", err);
    return NextResponse.json({ error: "Error al guardar presupuesto" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const store = getUserStore(user.id);
    const body = await req.json();
    const { id, action } = body;

    if (action === "clear_all") {
      store.budgets = [];
      saveUserStore(user.id);
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    store.budgets = (store.budgets || []).filter((b) => b.id !== id);
    saveUserStore(user.id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[/api/budgets DELETE error]:", err);
    return NextResponse.json({ error: "Error al eliminar presupuesto" }, { status: 500 });
  }
}
