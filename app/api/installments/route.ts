import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import {
  getInstallments,
  addInstallment,
  payInstallmentDue,
} from "@/lib/db/supabase-store";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const { searchParams } = new URL(req.url);
    const active = searchParams.get("active");

    let list = await getInstallments(user.id);
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

    // Pago rápido de cuota (FASE 4)
    if (body.action === "pay_due" || body.action === "pay") {
      const { id, account_id } = body;
      if (!id) {
        return NextResponse.json({ error: "ID de cuota requerido" }, { status: 400 });
      }

      const result = await payInstallmentDue(user.id, id, account_id);
      return NextResponse.json(result);
    }

    const newInst = await addInstallment(user.id, body);
    return NextResponse.json(newInst, { status: 201 });
  } catch (err: unknown) {
    console.error("[/api/installments POST error]:", err);
    const msg = err instanceof Error ? err.message : "Error al procesar cuota";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const { id, action, account_id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    if (action === "pay" || action === "pay_due") {
      const result = await payInstallmentDue(user.id, id, account_id);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
  } catch (err: unknown) {
    console.error("[/api/installments PATCH error]:", err);
    return NextResponse.json({ error: "Error al actualizar cuota" }, { status: 500 });
  }
}
