export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import { 
  getSubscriptions, 
  addSubscription, 
  updateSubscription, 
  deleteSubscription 
} from "@/lib/db/supabase-store";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const subs = await getSubscriptions(user.id);
    return NextResponse.json(subs || []);
  } catch (err: unknown) {
    console.error("[/api/subscriptions GET error]:", err);
    return NextResponse.json({ error: "Error al obtener suscripciones" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const body = await req.json();

    const newSub = await addSubscription(user.id, {
      name: body.name || "Nueva Suscripción",
      amount: Number(body.amount) || 0,
      currency: body.currency || "ARS",
      billing_cycle: body.billing_cycle || (body.frequency === "yearly" ? "yearly" : "monthly"),
      renewal_day: Number(body.renewal_day || body.billing_day) || 1,
      is_active: body.is_active !== undefined ? body.is_active : true,
      color: body.color || "#8B5CF6",
      icon: body.icon || "CreditCard",
    });

    return NextResponse.json(newSub, { status: 201 });
  } catch (err: unknown) {
    console.error("[/api/subscriptions POST error]:", err);
    return NextResponse.json({ error: "Error al crear suscripción" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const body = await req.json();
    const id = body.id;

    if (!id) {
      return NextResponse.json({ error: "ID de suscripción requerido" }, { status: 400 });
    }

    const updated = await updateSubscription(user.id, id, {
      name: body.name,
      amount: body.amount !== undefined ? Number(body.amount) : undefined,
      renewal_day: body.renewal_day || body.billing_day ? Number(body.renewal_day || body.billing_day) : undefined,
      billing_cycle: body.billing_cycle,
      is_active: body.is_active,
    });

    if (!updated) {
      return NextResponse.json({ error: "Suscripción no encontrada o no actualizada" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error("[/api/subscriptions PUT error]:", err);
    return NextResponse.json({ error: "Error al actualizar suscripción" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await req.json();
        id = body.id;
      } catch {
        // ignore
      }
    }

    if (!id) {
      return NextResponse.json({ error: "ID de suscripción requerido" }, { status: 400 });
    }

    const ok = await deleteSubscription(user.id, id);
    return NextResponse.json({ success: ok });
  } catch (err: unknown) {
    console.error("[/api/subscriptions DELETE error]:", err);
    return NextResponse.json({ error: "Error al eliminar suscripción" }, { status: 500 });
  }
}
