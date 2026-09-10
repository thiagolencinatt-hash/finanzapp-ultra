import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import { getUserSummary } from "@/lib/db/cloud-store";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const summary = getUserSummary(user.id, {
      email: user.email,
      name: user.name,
      currency: user.currency,
      salary: user.salary,
    });
    return NextResponse.json(summary);
  } catch (error) {
    console.error("[/api/summary] Error getting user summary:", error);
    return NextResponse.json({ error: "Error al obtener resumen financiero" }, { status: 500 });
  }
}
