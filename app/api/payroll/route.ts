export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import { getSalaryRecords, saveSalaryRecord } from "@/lib/db/supabase-store";
import { calculateHourlyRates } from "@/lib/utils/payroll-calculator";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const records = await getSalaryRecords(user.id);
    return NextResponse.json({
      success: true,
      records,
      currentSalary: user.salary || 0,
    });
  } catch (error: any) {
    console.error("[GET /api/payroll] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener registros de sueldo" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const netSalary = Number(body.net_salary || body.netSalary || 0);
    const grossSalary = body.gross_salary !== undefined ? Number(body.gross_salary || body.grossSalary) : null;
    const totalHours = Number(body.total_hours || body.totalHours || 160);
    const period = body.period || new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" });

    if (netSalary <= 0) {
      return NextResponse.json(
        { error: "El sueldo neto debe ser un monto mayor a 0." },
        { status: 400 }
      );
    }

    const rates = calculateHourlyRates(netSalary, totalHours);

    const record = await saveSalaryRecord(user.id, {
      period,
      net_salary: netSalary,
      gross_salary: grossSalary,
      total_hours: totalHours,
      hourly_rate_normal: rates.hourlyRateNormal,
      hourly_rate_night: rates.hourlyRateNight,
    });

    return NextResponse.json({
      success: true,
      record,
    });
  } catch (error: any) {
    console.error("[POST /api/payroll] Error:", error);
    return NextResponse.json(
      { error: "Error al guardar registro de sueldo" },
      { status: 500 }
    );
  }
}
