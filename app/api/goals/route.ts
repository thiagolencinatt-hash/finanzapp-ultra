import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import {
  getUserGoals,
  addUserGoal,
  updateUserGoal,
  deleteUserGoal,
  getUserStore,
  saveUserStore,
} from "@/lib/db/cloud-store";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || undefined;
    const goals = getUserGoals(user.id, type);
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

    if (body.action === "clear_all") {
      const store = getUserStore(user.id);
      store.goals = [];
      saveUserStore(user.id);
      return NextResponse.json({ success: true, count: 0 });
    }

    if (body.action === "distribute_salary") {
      const store = getUserStore(user.id);
      const allocations: { goalId: string; amount: number }[] = body.allocations || [];
      allocations.forEach(({ goalId, amount }) => {
        const goal = store.goals.find((g) => g.id === goalId);
        if (goal) {
          goal.current_amount = (Number(goal.current_amount) || 0) + (Number(amount) || 0);
          if (goal.target_amount > 0 && goal.current_amount >= goal.target_amount) {
            goal.is_completed = true;
            goal.completed_at = new Date().toISOString();
          }
        }
      });
      saveUserStore(user.id);
      return NextResponse.json({ success: true, goals: store.goals });
    }

    const newGoal = addUserGoal(user.id, body);
    return NextResponse.json(newGoal, { status: 201 });
  } catch (err: unknown) {
    console.error("[/api/goals POST error]:", err);
    return NextResponse.json({ error: "Error al guardar meta" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const { id, action, amount, ...updates } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    if (action === "add_funds") {
      const store = getUserStore(user.id);
      const goal = store.goals.find((g) => g.id === id);
      if (goal) {
        const newAmount = (Number(goal.current_amount) || 0) + (Number(amount) || 0);
        goal.current_amount = newAmount;
        if (goal.target_amount > 0 && newAmount >= goal.target_amount) {
          goal.is_completed = true;
          goal.completed_at = new Date().toISOString();
        }
        saveUserStore(user.id);
        return NextResponse.json({ success: true, goal });
      }
      return NextResponse.json({ error: "Meta no encontrada" }, { status: 404 });
    }

    const updated = updateUserGoal(user.id, id, updates);
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
      const store = getUserStore(user.id);
      store.goals = [];
      saveUserStore(user.id);
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const deleted = deleteUserGoal(user.id, id);
    return NextResponse.json({ success: deleted });
  } catch (err: unknown) {
    console.error("[/api/goals DELETE error]:", err);
    return NextResponse.json({ error: "Error al eliminar meta" }, { status: 500 });
  }
}
