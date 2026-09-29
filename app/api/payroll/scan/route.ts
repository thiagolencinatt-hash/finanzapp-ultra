export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import { getGenAI, GEMINI_FALLBACK_MODELS } from "@/lib/gemini/client";
import { calculateHourlyRates } from "@/lib/utils/payroll-calculator";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo para procesar." },
        { status: 400 }
      );
    }

    const fileName = (file.name || "").toLowerCase();
    const mimeType = (file.type || "").toLowerCase();
    const isPdf = fileName.endsWith(".pdf") || mimeType === "application/pdf";
    const isImage =
      fileName.endsWith(".png") ||
      fileName.endsWith(".jpg") ||
      fileName.endsWith(".jpeg") ||
      fileName.endsWith(".webp") ||
      mimeType.startsWith("image/");

    if (!isPdf && !isImage) {
      return NextResponse.json(
        { error: "Formato no compatible. Por favor sube un archivo PDF o una imagen (.png, .jpg, .webp) del recibo de sueldo." },
        { status: 400 }
      );
    }

    const resolvedMime = isPdf
      ? "application/pdf"
      : mimeType || (fileName.endsWith(".png") ? "image/png" : "image/jpeg");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");

    const prompt = `Eres un liquidador de sueldos y perito contable experto en legislación laboral argentina (LCT Ley 20.744).
Analiza este recibo de haberes o liquidación de sueldo argentino (foto o PDF).
Extrae EXCLUSIVAMENTE un objeto JSON válido con este formato estricto:
{
  "period": "Mes Año",
  "netSalary": 0.00,
  "grossSalary": 0.00,
  "totalHours": 160.00,
  "hourlyRate": 0.00
}

Reglas indispensables de extracción:
1. "netSalary": Es el importe neto a cobrar en mano / sueldo de bolsillo / total a percibir (el monto final depositado al trabajador). Debe ser siempre un número positivo.
2. "grossSalary": Total de remuneraciones brutas / básico antes de descuentos de jubilación (11%), ley 19032 (3%) y obra social (3%). Si no figura, coloca 0.
3. "totalHours": Horas mensuales base pactadas (habitualmente 160, 180 o 200 hs mensuales). Si el recibo no las indica explícitamente, asume 160.
4. "hourlyRate": Valor de hora normal pactada o calculada (netSalary / totalHours).
5. "period": Mes y año del recibo (ej: "Marzo 2026", "Febrero 2026").
6. Devuelve ÚNICAMENTE el JSON sin bloques de código markdown, explicaciones ni texto adicional.`;

    const ai = getGenAI();
    let responseText = "";
    let lastError: any = null;

    for (const modelName of GEMINI_FALLBACK_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: resolvedMime,
                    data: base64Data,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
        });

        if (response && response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[payroll/scan] Model ${modelName} falló:`, err?.message || err);
      }
    }

    if (!responseText) {
      return NextResponse.json(
        { error: "No se pudo procesar el recibo con IA. " + (lastError?.message || "Intenta con una foto más nítida o PDF oficial.") },
        { status: 502 }
      );
    }

    const cleanJson = responseText.replace(/```json/gi, "").replace(/```/gi, "").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      return NextResponse.json(
        { error: "La IA no pudo estructurar los datos del recibo. Verifica que el documento sea legible." },
        { status: 422 }
      );
    }

    const netSalary = Math.max(0, Number(parsed.netSalary || parsed.net_salary || 0));
    const grossSalary = parsed.grossSalary ? Number(parsed.grossSalary) : null;
    const totalHours = Math.max(1, Number(parsed.totalHours || parsed.total_hours || 160));
    const period = parsed.period || new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" });

    if (netSalary <= 0) {
      return NextResponse.json(
        { error: "No se pudo detectar el importe neto del recibo. Por favor ingrésalo manualmente." },
        { status: 422 }
      );
    }

    const rates = calculateHourlyRates(netSalary, totalHours);

    return NextResponse.json({
      success: true,
      data: {
        period,
        netSalary,
        grossSalary,
        totalHours,
        hourlyRateNormal: rates.hourlyRateNormal,
        hourlyRateNight: rates.hourlyRateNight,
      },
    });
  } catch (error: any) {
    console.error("[POST /api/payroll/scan] Error:", error);
    return NextResponse.json(
      { error: "Error interno al escanear recibo de sueldo: " + (error?.message || error) },
      { status: 500 }
    );
  }
}
