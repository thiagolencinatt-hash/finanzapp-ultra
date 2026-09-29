export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import { getWorkShifts, saveWorkShifts, deleteWorkShift } from "@/lib/db/supabase-store";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const shifts = await getWorkShifts(user.id);
    return NextResponse.json({
      success: true,
      shifts,
      count: shifts.length,
    });
  } catch (error: any) {
    console.error("[GET /api/shifts] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener cronograma de turnos" },
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
    const shifts = Array.isArray(body.shifts) ? body.shifts : [body];

    if (shifts.length === 0) {
      return NextResponse.json(
        { error: "No se proporcionaron turnos para guardar." },
        { status: 400 }
      );
    }

    const saved = await saveWorkShifts(user.id, shifts);

    return NextResponse.json({
      success: true,
      shifts: saved,
      count: saved.length,
    });
  } catch (error: any) {
    console.error("[POST /api/shifts] Error:", error);
    return NextResponse.json(
      { error: "Error al guardar turnos laborales" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const shiftId = searchParams.get("id");

    if (!shiftId) {
      return NextResponse.json(
        { error: "Se requiere el ID del turno a eliminar." },
        { status: 400 }
      );
    }

    const deleted = await deleteWorkShift(user.id, shiftId);
    return NextResponse.json({
      success: deleted,
      message: deleted ? "Turno eliminado" : "Turno no encontrado",
    });
  } catch (error: any) {
    console.error("[DELETE /api/shifts] Error:", error);
    return NextResponse.json(
      { error: "Error al eliminar turno laboral" },
      { status: 500 }
    );
  }
}
