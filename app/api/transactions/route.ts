export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import {
  getTransactions,
  addTransaction,
  deleteTransaction,
  getAccounts,
} from "@/lib/db/supabase-store";
import type { Transaction } from "@/lib/types";

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
    const type = searchParams.get("type");
    const categoryId = searchParams.get("category_id");
    const accountId = searchParams.get("account_id");

    let allTxs = await getTransactions(user.id);

    if (type) {
      allTxs = allTxs.filter((t) => t.type === type);
    }
    if (categoryId) {
      allTxs = allTxs.filter((t) => t.category_id === categoryId);
    }
    if (accountId) {
      allTxs = allTxs.filter((t) => t.account_id === accountId);
    }

    const totalCount = allTxs.length;
    const paginated = allTxs.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginated,
      count: totalCount,
      limit,
      offset,
    });
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

    if (!body.account_id || body.account_id === "default_cash" || body.account_id === "") {
      const accounts = await getAccounts(user.id);
      const cashAcc = accounts.find(a => a.name === "Efectivo") || accounts[0];
      if (cashAcc) {
        body.account_id = cashAcc.id;
      }
    }

    const newTx = await addTransaction(user.id, body as unknown as Omit<Transaction, "id" | "created_at">);
    return NextResponse.json(newTx, { status: 201 });
  } catch (err: unknown) {
    console.error("[/api/transactions POST error]:", err);
    return NextResponse.json({ error: "Error al guardar transacción" }, { status: 500 });
  }
}

// DELETE /api/transactions
export async function DELETE(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const body = await req.json();
    const { id } = body;

    if (id) {
      const deleted = await deleteTransaction(user.id, id);
      return NextResponse.json({ success: deleted });
    }

    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  } catch (err: unknown) {
    console.error("[/api/transactions DELETE error]:", err);
    return NextResponse.json({ error: "Error al eliminar transacción" }, { status: 500 });
  }
}
