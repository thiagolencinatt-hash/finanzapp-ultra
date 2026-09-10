import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import {
  getUserTransactions,
  addUserTransaction,
  updateUserTransaction,
  deleteUserTransaction,
  getUserStore,
  saveUserStore,
} from "@/lib/db/cloud-store";
import type { Transaction } from "@/lib/types";

// Input validation helpers
function validateTransactionInput(body: Record<string, unknown>): string | null {
  const { type, amount } = body;
  if (type && !["income", "expense", "transfer"].includes(type as string)) {
    return "Tipo de transacción inválido. Usar: income, expense, transfer";
  }
  if (amount !== undefined) {
    const num = Number(amount);
    if (isNaN(num) || num < 0 || num > 999_999_999) {
      return "Monto inválido. Debe ser un número positivo menor a 999.999.999";
    }
  }
  return null;
}

// GET /api/transactions
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);
    const type = searchParams.get("type") || undefined;
    const categoryId = searchParams.get("category_id") || undefined;
    const accountId = searchParams.get("account_id") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    const { data, count } = getUserTransactions(user.id, {
      type,
      accountId,
      categoryId,
      from,
      to,
      limit,
      offset,
    });

    return NextResponse.json({ data, count, limit, offset });
  } catch (err: unknown) {
    console.error("[/api/transactions GET error]:", err);
    return NextResponse.json({ error: "Error al obtener transacciones" }, { status: 500 });
  }
}

// POST /api/transactions
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo de solicitud JSON inválido" }, { status: 400 });
    }

    const validationError = validateTransactionInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const newTx = addUserTransaction(user.id, body as Partial<Transaction>);
    return NextResponse.json(newTx, { status: 201 });
  } catch (err: unknown) {
    console.error("[/api/transactions POST error]:", err);
    return NextResponse.json({ error: "Error al guardar transacción" }, { status: 500 });
  }
}

// PATCH /api/transactions
export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const validationError = validateTransactionInput(updates);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const updated = updateUserTransaction(user.id, id, updates);
    if (!updated) {
      return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error("[/api/transactions PATCH error]:", err);
    return NextResponse.json({ error: "Error al actualizar transacción" }, { status: 500 });
  }
}

// DELETE /api/transactions
export async function DELETE(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const body = await req.json();
    const { id, action } = body;

    if (action === "clear_all") {
      const store = getUserStore(user.id);
      store.transactions = [];
      saveUserStore(user.id);
      return NextResponse.json({ success: true, count: 0 });
    }

    if (id) {
      const deleted = deleteUserTransaction(user.id, id);
      return NextResponse.json({ success: deleted });
    }

    return NextResponse.json({ error: "ID o acción requeridos" }, { status: 400 });
  } catch (err: unknown) {
    console.error("[/api/transactions DELETE error]:", err);
    return NextResponse.json({ error: "Error al eliminar transacción" }, { status: 500 });
  }
}
