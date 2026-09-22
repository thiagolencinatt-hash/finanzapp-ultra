export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import { getSubscriptions, addSubscription } from "@/lib/db/supabase-store";

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
