export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import { getGenAI, GEMINI_FALLBACK_MODELS } from "@/lib/gemini/client";
import { parseBankStatementBuffer, ParsedStatementTransaction } from "@/lib/import/statement-parser";

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
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Caso: Hojas de cálculo (.csv, .xlsx, .xls)
    const isSpreadsheet =
      fileName.endsWith(".csv") ||
      fileName.endsWith(".xlsx") ||
      fileName.endsWith(".xls") ||
      mimeType.includes("csv") ||
      mimeType.includes("spreadsheet") ||
      mimeType.includes("excel");

    if (isSpreadsheet) {
      const parsed = parseBankStatementBuffer(buffer);
      if (parsed.error) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        detectedBank: parsed.detectedBank || "Archivo Bancario",
        transactions: parsed.transactions,
        totalIncome: parsed.totalIncome,
        totalExpense: parsed.totalExpense,
        count: parsed.transactions.length,
      });
    }

    // 2. Caso: PDF o Imágenes (Mercado Pago, bancos o capturas)
    const isPdf = fileName.endsWith(".pdf") || mimeType === "application/pdf";
    const isImage =
      fileName.endsWith(".png") ||
      fileName.endsWith(".jpg") ||
      fileName.endsWith(".jpeg") ||
      fileName.endsWith(".webp") ||
      mimeType.startsWith("image/");

    if (!isPdf && !isImage) {
      return NextResponse.json(
        {
          error:
            "Formato no compatible. Por favor sube un archivo PDF, imagen (.png, .jpg, .webp) o planilla Excel/CSV.",
        },
        { status: 400 }
      );
    }

    const resolvedMime = isPdf
      ? "application/pdf"
      : mimeType || (fileName.endsWith(".png") ? "image/png" : "image/jpeg");
    const base64Data = buffer.toString("base64");

    const prompt = `Eres un extractor contable experto. Analiza este comprobante o extracto bancario de Mercado Pago (o cualquier entidad bancaria).
Extrae TODAS las transacciones individuales (tanto gastos/débitos/pagos como ingresos/cobros/transferencias/rendimientos) y devuelve EXCLUSIVAMENTE un JSON con este formato:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "Nombre del comercio, destinatario, emisor o concepto",
      "amount": 1234.50,
      "type": "expense",
      "category": "Comida"
    }
  ]
}

Reglas estrictas e indispensables:
1. "amount": Debe ser SIEMPRE un número positivo (ej: 1250.50, nunca negativo ni con signo $). Si en el documento aparece con signo negativo (-$1.250,50 o -$ 500), conviértelo a número positivo (1250.50 o 500).
2. "type": 
   - Define "expense" para cualquier gasto, compra con tarjeta/QR, pago de servicio, débito o dinero enviado.
   - Define "income" para transferencias recibidas, cobros, sueldos, liquidaciones, ingresos de dinero o rendimientos de cuenta.
3. "category": Selecciona la más adecuada entre: "Comida" | "Servicios" | "Transporte" | "Transferencia" | "Supermercado" | "Salud" | "Entretenimiento" | "General".
4. "date": Fecha en formato estándar ISO YYYY-MM-DD. Si solo indica día y mes (ej: "28 de Septiembre"), añade el año 2026. Si no figura fecha exacta, pon la fecha de hoy.
5. Extrae TODOS los movimientos visibles en el extracto o comprobante. Si es un comprobante individual de una transferencia o pago, extrae ese único movimiento con exactitud.
6. Devuelve EXCLUSIVAMENTE el JSON crudo, sin texto adicional, sin introducciones y sin bloques markdown como \`\`\`json.`;

    const genai = getGenAI();
    let rawJson: string | null = null;
    let lastError: any = null;

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
                    mimeType: resolvedMime,
                    data: base64Data,
                  },
                },
                { text: prompt },
              ],
            },
          ],
        });

        const responseText = response.text || "";
        const cleanJson = responseText
          .replace(/```json/gi, "")
          .replace(/```/gi, "")
          .trim();

        const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          rawJson = jsonMatch[0];
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[import-statement] Model ${model} failed, trying fallback:`, err.message);
      }
    }

    if (!rawJson) {
      throw lastError || new Error("No se pudo leer la información de las transacciones con IA.");
    }

    let parsedResult: { transactions?: any[] } = {};
    try {
      parsedResult = JSON.parse(rawJson);
    } catch {
      throw new Error("El modelo generó un formato no válido. Intenta con una imagen o PDF más claro.");
    }

    const rawTxs = Array.isArray(parsedResult.transactions) ? parsedResult.transactions : [];
    if (rawTxs.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron movimientos en este documento." },
        { status: 422 }
      );
    }

    let totalIncome = 0;
    let totalExpense = 0;

    const formattedTransactions: ParsedStatementTransaction[] = rawTxs.map((t, idx) => {
      const amount = Math.abs(parseFloat(String(t.amount || 0))) || 0;
      const type: "income" | "expense" | "transfer" =
        t.type === "income" ? "income" : t.type === "transfer" ? "transfer" : "expense";

      if (type === "income") {
        totalIncome += amount;
      } else {
        totalExpense += amount;
      }

      return {
        id: `ia-tx-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        date: t.date || new Date().toISOString().split("T")[0],
        description: (t.description || "Movimiento Mercado Pago").trim(),
        amount,
        type,
        suggestedCategory: t.category || "General",
        selected: true,
      };
    });

    const detectedBank = isPdf ? "Mercado Pago (PDF)" : "Mercado Pago (Captura/Imagen)";

    return NextResponse.json({
      success: true,
      detectedBank,
      transactions: formattedTransactions,
      totalIncome,
      totalExpense,
      count: formattedTransactions.length,
    });
  } catch (err: any) {
    console.error("[POST /api/import/statement error]:", err);
    return NextResponse.json(
      { error: err.message || "Error al procesar el archivo bancario o comprobante" },
      { status: 500 }
    );
  }
}
