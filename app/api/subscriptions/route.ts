import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import { getUserStore, saveUserStore } from "@/lib/db/cloud-store";
import type { Subscription } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const store = getUserStore(user.id);
    return NextResponse.json(store.subscriptions || []);
  } catch (err: unknown) {
    console.error("[/api/subscriptions GET error]:", err);
    return NextResponse.json({ error: "Error al obtener suscripciones" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const store = getUserStore(user.id);
    const body = await req.json();

    const newSub: Subscription = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: user.id,
      name: body.name || "Nueva Suscripción",
      amount: Number(body.amount) || 0,
      currency: body.currency || "ARS",
      billing_cycle: body.billing_cycle || (body.frequency === "yearly" ? "yearly" : "monthly"),
      renewal_day: Number(body.renewal_day) || 1,
      is_active: body.is_active !== undefined ? body.is_active : true,
      color: body.color || "#8B5CF6",
      icon: body.icon || "CreditCard",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (!store.subscriptions) store.subscriptions = [];
    store.subscriptions.push(newSub);
    saveUserStore(user.id);

    return NextResponse.json(newSub, { status: 201 });
  } catch (err: unknown) {
    console.error("[/api/subscriptions POST error]:", err);
    return NextResponse.json({ error: "Error al crear suscripción" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const store = getUserStore(user.id);
    const body = await req.json();
    const { id, action, ...updates } = body;

    const sub = (store.subscriptions || []).find((s) => s.id === id);
    if (!sub) {
      return NextResponse.json({ error: "Suscripción no encontrada" }, { status: 404 });
    }

    if (action === "toggle") {
      sub.is_active = !sub.is_active;
    } else {
      Object.assign(sub, updates);
    }

    saveUserStore(user.id);
    return NextResponse.json(sub);
  } catch (err: unknown) {
    console.error("[/api/subscriptions PATCH error]:", err);
    return NextResponse.json({ error: "Error al actualizar suscripción" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const store = getUserStore(user.id);
    const body = await req.json();
    const { id, action } = body;

    if (action === "clear_all") {
      store.subscriptions = [];
      saveUserStore(user.id);
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    store.subscriptions = (store.subscriptions || []).filter((s) => s.id !== id);
    saveUserStore(user.id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[/api/subscriptions DELETE error]:", err);
    return NextResponse.json({ error: "Error al eliminar suscripción" }, { status: 500 });
  }
}
