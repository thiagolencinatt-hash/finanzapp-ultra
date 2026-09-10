import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import {
  getUserAccounts,
  addUserAccount,
  updateUserAccount,
  deleteUserAccount,
  getUserStore,
  saveUserStore,
} from "@/lib/db/cloud-store";

// GET /api/accounts
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const accounts = getUserAccounts(user.id);
    return NextResponse.json(accounts);
  } catch (err: unknown) {
    console.error("[/api/accounts GET error]:", err);
    return NextResponse.json({ error: "Error al obtener cuentas" }, { status: 500 });
  }
}

// POST /api/accounts
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const body = await req.json();
    const newAcc = addUserAccount(user.id, body);
    return NextResponse.json(newAcc, { status: 201 });
  } catch (err: unknown) {
    console.error("[/api/accounts POST error]:", err);
    return NextResponse.json({ error: "Error al crear cuenta" }, { status: 500 });
  }
}

// PATCH /api/accounts (Edición de saldos / cuentas)
export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const body = await req.json();
    const { id, action, ...updates } = body;

    // Acción especial: resetear todos los saldos a 0
    if (action === "reset_all_balances") {
      const store = getUserStore(user.id);
      store.accounts.forEach((a) => {
        a.balance = 0;
      });
      saveUserStore(user.id);
      return NextResponse.json({ success: true, accounts: store.accounts });
    }

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    if (updates.balance !== undefined) {
      updates.balance = parseFloat(updates.balance) || 0;
    }

    const updated = updateUserAccount(user.id, id, updates);
    if (!updated) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error("[/api/accounts PATCH error]:", err);
    return NextResponse.json({ error: "Error al actualizar cuenta" }, { status: 500 });
  }
}

// DELETE /api/accounts
export async function DELETE(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const deleted = deleteUserAccount(user.id, id);
    return NextResponse.json({ success: deleted });
  } catch (err: unknown) {
    console.error("[/api/accounts DELETE error]:", err);
    return NextResponse.json({ error: "Error al eliminar cuenta" }, { status: 500 });
  }
}
