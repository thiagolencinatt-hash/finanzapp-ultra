export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import { addTransactionsBatch } from "@/lib/db/supabase-store";
import type { Transaction } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const transactions = body?.transactions as Array<Partial<Transaction>>;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: "Debe enviar un arreglo con transacciones a importar" },
        { status: 400 }
      );
    }

    if (transactions.length > 500) {
      return NextResponse.json(
        { error: "El límite de importación por lote es de 500 movimientos a la vez." },
        { status: 400 }
      );
    }

    const result = await addTransactionsBatch(user.id, transactions);

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count} movimientos importados correctamente.`,
    });
  } catch (err: any) {
    console.error("[POST /api/transactions/batch error]:", err);
    return NextResponse.json(
      { error: err.message || "Error al procesar el lote de transacciones" },
      { status: 500 }
    );
  }
}
