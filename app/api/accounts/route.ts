export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import {
  getAccounts,
  addAccount,
  updateAccount,
  deleteAccount,
} from "@/lib/db/supabase-store";

// GET /api/accounts
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const accounts = await getAccounts(user.id);
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
    const newAcc = await addAccount(user.id, body);
    return NextResponse.json(newAcc, { status: 201 });
  } catch (err: unknown) {
    console.error("[/api/accounts POST error]:", err);
    return NextResponse.json({ error: "Error al crear cuenta" }, { status: 500 });
  }
}

// PATCH /api/accounts
export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const body = await req.json();
    const { id, action, ...updates } = body;

    // Resetear saldos si se solicita
    if (action === "reset_all_balances") {
      const accounts = await getAccounts(user.id);
      for (const acc of accounts) {
        await updateAccount(user.id, acc.id, { balance: 0 });
      }
      const updatedAccounts = await getAccounts(user.id);
      return NextResponse.json({ success: true, accounts: updatedAccounts });
    }

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    if (updates.balance !== undefined) {
      updates.balance = parseFloat(updates.balance) || 0;
    }

    const updated = await updateAccount(user.id, id, updates);
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

    const deleted = await deleteAccount(user.id, id);
    return NextResponse.json({ success: deleted });
  } catch (err: unknown) {
    console.error("[/api/accounts DELETE error]:", err);
    return NextResponse.json({ error: "Error al eliminar cuenta" }, { status: 500 });
  }
}
