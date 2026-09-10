import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import { resetUserFinances } from "@/lib/db/cloud-store";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    let body: {
      initialBalanceARS?: number;
      configuredSalary?: number;
      primaryAccountName?: string;
    } = {};

    try {
      body = await req.json();
    } catch {
      // Body can be empty for default reset
    }

    const initialBalance = typeof body.initialBalanceARS === "number" ? Math.max(0, body.initialBalanceARS) : 0;
    const configuredSalary = typeof body.configuredSalary === "number" ? Math.max(0, body.configuredSalary) : 0;
    const primaryAccountName = body.primaryAccountName?.trim() || "Santander Río";

    const summary = resetUserFinances(user.id, {
      initialBalanceARS: initialBalance,
      configuredSalary,
      primaryAccountName,
    });

    return NextResponse.json({
      success: true,
      message: "Todas las finanzas fueron reseteadas a $0 correctamente.",
      summary,
    });
  } catch (err: unknown) {
    console.error("[/api/finances/reset error]:", err);
    const msg = err instanceof Error ? err.message : "Error al reiniciar datos";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
