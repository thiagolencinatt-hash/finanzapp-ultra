export const dynamic = "force-dynamic";
export const revalidate = 0;
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import { getSummary } from "@/lib/db/supabase-store";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const summary = await getSummary(user.id, {
      email: user.email,
      name: user.name,
      currency: user.currency,
      salary: user.salary,
    });
    return NextResponse.json(summary, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (error) {
    console.error("[/api/summary] Error getting user summary:", error);
    return NextResponse.json({ error: "Error al obtener resumen financiero" }, { status: 500 });
  }
}
