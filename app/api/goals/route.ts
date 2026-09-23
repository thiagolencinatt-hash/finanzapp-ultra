export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import { getGoals, addGoal, updateGoal, deleteGoal } from "@/lib/db/supabase-store";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const goals = await getGoals(user.id);
    return NextResponse.json(goals);
  } catch (err: unknown) {
    console.error("[/api/goals GET error]:", err);
    return NextResponse.json({ error: "Error al obtener metas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const body = await req.json();

    if (body.action === "distribute_salary" || body.action === "distribute_income") {
      const allocations: { goalId: string; amount: number }[] = body.allocations || [];
      const currentGoals = await getGoals(user.id);

      for (const { goalId, amount } of allocations) {
        const goal = currentGoals.find((g) => g.id === goalId);
        if (goal) {
          const newAmount = (Number(goal.current_amount) || 0) + (Number(amount) || 0);
          await updateGoal(user.id, goalId, { current_amount: newAmount });
        }
      }

      const updatedGoals = await getGoals(user.id);
      return NextResponse.json({ success: true, goals: updatedGoals });
    }

    const newGoal = await addGoal(user.id, body);
    return NextResponse.json(newGoal, { status: 201 });
  } catch (err: unknown) {
    console.error("[/api/goals POST error]:", err);
    return NextResponse.json({ error: "Error al guardar meta" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const body = await req.json();
    const { id, action, amount, account_id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    if (action === "add_funds") {
      const currentGoals = await getGoals(user.id);
      const goal = currentGoals.find((g) => g.id === id);
      if (goal) {
        const newAmount = (Number(goal.current_amount) || 0) + (Number(amount) || 0);
        const updated = await updateGoal(user.id, id, { current_amount: newAmount });
        
        if (account_id) {
          const { addTransaction } = await import("@/lib/db/supabase-store");
          await addTransaction(user.id, {
            type: "expense",
            amount: Number(amount),
            currency: goal.currency || "ARS",
            account_id: account_id,
            category_id: null,
            description: `Aporte a meta: ${goal.name}`,
            date: new Date().toISOString().split("T")[0],
          });
        }
        
        return NextResponse.json({ success: true, goal: updated });
      }
      return NextResponse.json({ error: "Meta no encontrada" }, { status: 404 });
    }

    const updated = await updateGoal(user.id, id, updates);
    if (!updated) {
      return NextResponse.json({ error: "Meta no encontrada" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error("[/api/goals PATCH error]:", err);
    return NextResponse.json({ error: "Error al actualizar meta" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const body = await req.json();
    const { id, action } = body;

    if (action === "clear_all") {
      const goals = await getGoals(user.id);
      for (const g of goals) {
        await deleteGoal(user.id, g.id);
      }
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ error: "Falta el ID de la meta" }, { status: 400 });
    }

    await deleteGoal(user.id, id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[/api/goals DELETE error]:", err);
    return NextResponse.json({ error: "Error al eliminar meta" }, { status: 500 });
  }
}
