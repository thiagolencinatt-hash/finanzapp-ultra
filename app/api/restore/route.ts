import { NextResponse } from "next/server";
import { restoreDatabaseBackup } from "@/lib/demo-data";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Estructura JSON inválida" }, { status: 400 });
    }

    const updatedSummary = restoreDatabaseBackup(body);
    return NextResponse.json({
      success: true,
      message: "Copia de seguridad restaurada con éxito",
      summary: updatedSummary,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: "Error al restaurar copia: " + message }, { status: 500 });
  }
}
