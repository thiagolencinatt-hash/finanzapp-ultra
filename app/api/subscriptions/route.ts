import { NextResponse } from "next/server";
import {
  getDemoSubscriptions,
  addDemoSubscription,
  toggleDemoSubscription,
  deleteDemoSubscription,
} from "@/lib/demo-data";

export async function GET() {
  try {
    const subscriptions = getDemoSubscriptions();
    return NextResponse.json(subscriptions);
  } catch {
    return NextResponse.json({ error: "Error al obtener suscripciones" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const newSub = addDemoSubscription(body);
    return NextResponse.json(newSub, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear suscripción" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, action } = body;
    if (action === "toggle" && id) {
      const updated = toggleDemoSubscription(id);
      return NextResponse.json(updated);
    }
    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Error al actualizar suscripción" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }
    deleteDemoSubscription(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar suscripción" }, { status: 500 });
  }
}
