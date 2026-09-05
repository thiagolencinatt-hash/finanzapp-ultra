import { NextResponse } from "next/server";
import { getDemoBudgets, setDemoBudget, deleteDemoBudget } from "@/lib/demo-data";

export async function GET() {
  try {
    const budgets = getDemoBudgets();
    return NextResponse.json(budgets);
  } catch {
    return NextResponse.json({ error: "Error al obtener presupuestos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { category_id, monthly_limit, currency } = body;
    if (!category_id || monthly_limit === undefined) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }
    const budget = setDemoBudget({ category_id, monthly_limit: Number(monthly_limit), currency });
    return NextResponse.json(budget);
  } catch {
    return NextResponse.json({ error: "Error al guardar presupuesto" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }
    deleteDemoBudget(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar presupuesto" }, { status: 500 });
  }
}
