import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import {
  getUserInstallments,
  addUserInstallment,
  updateUserInstallment,
  deleteUserInstallment,
  getUserStore,
  saveUserStore,
} from "@/lib/db/cloud-store";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const { searchParams } = new URL(req.url);
    const active = searchParams.get("active");

    let list = getUserInstallments(user.id);
    if (active !== null) {
      list = list.filter((i) => i.is_active === (active === "true"));
    }

    return NextResponse.json(list);
  } catch (err: unknown) {
    console.error("[/api/installments GET error]:", err);
    return NextResponse.json({ error: "Error al obtener cuotas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const body = await req.json();

    if (body.action === "clear_all") {
      const store = getUserStore(user.id);
      store.installments = [];
      saveUserStore(user.id);
      return NextResponse.json({ success: true, count: 0 });
    }

    const newInst = addUserInstallment(user.id, body);
    return NextResponse.json(newInst, { status: 201 });
  } catch (err: unknown) {
    console.error("[/api/installments POST error]:", err);
    return NextResponse.json({ error: "Error al guardar cuota" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const { id, action, ...updates } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    if (action === "pay") {
      const store = getUserStore(user.id);
      const inst = store.installments.find((i) => i.id === id);
      if (inst) {
        const newPaid = (inst.paid_installments || 0) + 1;
        inst.paid_installments = newPaid;
        inst.is_active = newPaid < inst.total_installments;
        saveUserStore(user.id);
        return NextResponse.json({ success: true, installment: inst });
      }
      return NextResponse.json({ error: "Cuota no encontrada" }, { status: 404 });
    }

    const updated = updateUserInstallment(user.id, id, updates);
    if (!updated) {
      return NextResponse.json({ error: "Cuota no encontrada" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error("[/api/installments PATCH error]:", err);
    return NextResponse.json({ error: "Error al actualizar cuota" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const body = await req.json();
    const { id, action } = body;

    if (action === "clear_all") {
      const store = getUserStore(user.id);
      store.installments = [];
      saveUserStore(user.id);
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const deleted = deleteUserInstallment(user.id, id);
    return NextResponse.json({ success: deleted });
  } catch (err: unknown) {
    console.error("[/api/installments DELETE error]:", err);
    return NextResponse.json({ error: "Error al eliminar cuota" }, { status: 500 });
  }
}
