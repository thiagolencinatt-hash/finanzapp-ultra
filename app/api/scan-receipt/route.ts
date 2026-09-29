export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import { getGenAI, GEMINI_FALLBACK_MODELS } from "@/lib/gemini/client";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { image_base64, image_mime_type } = body;

    if (!image_base64) {
      return NextResponse.json(
        { error: "No se proporcionó la imagen del ticket" },
        { status: 400 }
      );
    }

    const genai = getGenAI();
    const mime = image_mime_type || "image/jpeg";

    const prompt = `Analiza detalladamente esta imagen de un ticket, factura, ticket fiscal o comprobante de pago.
Tu misión es extraer con total exactitud los datos clave de la compra.

Responde ÚNICAMENTE con un objeto JSON válido (sin formato markdown \`\`\`json, solo las llaves crudas):
{
  "merchant": "Nombre del comercio o empresa (ej: Farmacity, Coto, Shell, Starbucks, etc.)",
  "total": 12500.50, // número positivo con el importe total final pagado
  "date": "YYYY-MM-DD", // fecha de emisión visible en el ticket en formato ISO (ej: 2026-09-28). Si no está clara o no figura, pon la fecha de hoy.
  "category": "Categoría sugerida entre: Supermercado, Restaurantes, Servicios, Transporte, Salud, Entretenimiento, Ropa, Hogar, General",
  "type": "expense", // o "income" si es una liquidación/cobro
  "currency": "ARS", // o USD, EUR
  "itemsSummary": "Breve resumen de 3 a 5 palabras de lo comprado (ej: café y medialunas, artículos de farmacia)"
}

Si hay varios totales, toma el "TOTAL A PAGAR" o "IMPORTE FINAL".`;

    let parsedResult = null;
    let lastError = null;

    for (const model of GEMINI_FALLBACK_MODELS) {
      try {
        const response = await genai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: mime,
                    data: image_base64.replace(/^data:image\/[a-zA-Z]+;base64,/, ""),
                  },
                },
                { text: prompt },
              ],
            },
          ],
        });

        const text = response.text || "";
        const cleanJson = text
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();

        const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[scan-receipt] Model ${model} failed, trying next fallback:`, err.message);
      }
    }

    if (!parsedResult) {
      throw lastError || new Error("No se pudo extraer la información del comprobante.");
    }

    return NextResponse.json({
      success: true,
      data: {
        merchant: parsedResult.merchant || "Comercio",
        total: Number(parsedResult.total) || 0,
        date: parsedResult.date || new Date().toISOString().split("T")[0],
        category: parsedResult.category || "General",
        type: parsedResult.type || "expense",
        currency: parsedResult.currency || "ARS",
        itemsSummary: parsedResult.itemsSummary || "",
      },
    });
  } catch (err: any) {
    console.error("[POST /api/scan-receipt error]:", err);
    return NextResponse.json(
      { error: err.message || "Error al escanear comprobante con IA" },
      { status: 500 }
    );
  }
}
