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

    const prompt = `Eres un auditor contable experto en extractos bancarios y billeteras virtuales de Argentina (especialmente Mercado Pago, Brubank, Ualá, Banco Galicia, Santander, etc.).
Analiza con máxima precisión este extracto o comprobante contable.
Debes extraer OBLIGATORIAMENTE tanto los datos de conciliación de la cabecera (resumen del periodo) como el listado detallado de todas las transacciones individuales.

Devuelve EXCLUSIVAMENTE un objeto JSON válido con este formato:
{
  "period": "Periodo del extracto (ej: '01/09/2026 al 30/09/2026' o 'Septiembre 2026')",
  "initialBalance": 17860.56,
  "finalBalance": 26882.67,
  "totalIncomes": 43000.03,
  "totalExpenses": 16117.36,
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

REGLAS ESTRICTAS DE EXTRACCIÓN Y RECONCILIACIÓN AUDITADA:
1. METADATOS DE CABECERA Y CONCILIACIÓN:
   - "initialBalance": El saldo inicial / anterior al inicio del periodo informado (ej: "Saldo inicial", "Saldo al inicio"). Si es cero o no figura explícitamente, pon 0.00.
   - "finalBalance": El saldo final oficial del periodo (ej: "Saldo final", "Saldo al cierre", "Saldo actual disponible al corte"). Si en el resumen figura $0,00, pon 0.00. Si figura $26.882,67, pon 26882.67.
   - "totalIncomes": Total oficial de ingresos/entradas declaradas en el encabezado.
   - "totalExpenses": Total oficial de egresos/salidas declaradas en el encabezado (número positivo).
   - "period": Texto o rango de fechas del extracto.
   - IMPORTANTE: Todos los balances y totales deben ser números decimales limpios (usar punto decimal '.', NUNCA coma ',' y NUNCA signos como '$' ni separadores de miles). Formato argentino $ 17.860,56 debe ser 17860.56.

2. TRANSACCIONES INDIVIDUALES:
   - "amount": Debe ser SIEMPRE un número decimal positivo limpio (ej: 1250.50, nunca negativo ni con signo $). Si en el documento aparece con signo negativo (-$1.250,50 o -$ 500), conviértelo a número positivo.
   - "type":
     * "expense": para cualquier gasto, compra con tarjeta/QR, pago de servicio, débito o dinero enviado a terceros.
     * "income": para transferencias recibidas, cobros, sueldos, liquidaciones, ingresos de dinero o rendimientos diarios de inversión/cuenta.
     * "transfer": para movimientos internos como "Dinero reservado ahorro", "Dinero retirado ahorro", reservas programadas o transferencias entre cuentas propias.
   - "category": Selecciona la más adecuada entre: "Comida" | "Servicios" | "Transporte" | "Transferencia" | "Supermercado" | "Salud" | "Entretenimiento" | "Sueldo" | "General".
   - "date": Fecha en formato estándar ISO YYYY-MM-DD. Si solo indica día y mes (ej: "28 de Septiembre"), añade el año 2026. Si no figura fecha exacta, pon la fecha de hoy.
   - Extrae TODOS los movimientos visibles en el extracto sin omitir ninguno. Si es un comprobante individual de una transferencia o pago, extrae ese único movimiento con exactitud.

3. FORMATO DE RESPUESTA:
   - Devuelve EXCLUSIVAMENTE el JSON crudo, sin texto adicional, sin introducciones y sin bloques markdown como \`\`\`json.`;

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

    let parsedResult: any = {};
    try {
      parsedResult = JSON.parse(rawJson);
    } catch {
      throw new Error("El modelo generó un formato no válido. Intenta con una imagen o PDF más claro.");
    }

    // Helper robusto para formatear números en formato argentino / latino
    const parseArgentineNumber = (val: any): number => {
      if (typeof val === "number") return isFinite(val) ? val : 0;
      if (!val) return 0;
      let str = String(val).trim();
      const isNeg = str.includes("-") || (str.startsWith("(") && str.endsWith(")"));
      str = str.replace(/[$€US\sA-Za-z()\-]/gi, "");
      if (str.includes(".") && str.includes(",")) {
        if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
          str = str.replace(/\./g, "").replace(",", ".");
        } else {
          str = str.replace(/,/g, "");
        }
      } else if (str.includes(",")) {
        str = str.replace(",", ".");
      } else if ((str.match(/\./g) || []).length > 1) {
        str = str.replace(/\./g, "");
      }
      const num = parseFloat(str);
      if (isNaN(num)) return 0;
      return isNeg ? -Math.abs(num) : Math.abs(num);
    };

    const rawTxs = Array.isArray(parsedResult.transactions) ? parsedResult.transactions : [];
    if (rawTxs.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron movimientos en este documento." },
        { status: 422 }
      );
    }

    const initialBalance = parsedResult.initialBalance !== undefined && parsedResult.initialBalance !== null
      ? parseArgentineNumber(parsedResult.initialBalance)
      : null;
    const finalBalance = parsedResult.finalBalance !== undefined && parsedResult.finalBalance !== null
      ? parseArgentineNumber(parsedResult.finalBalance)
      : null;
    const totalIncomes = parsedResult.totalIncomes !== undefined && parsedResult.totalIncomes !== null
      ? parseArgentineNumber(parsedResult.totalIncomes)
      : null;
    const totalExpenses = parsedResult.totalExpenses !== undefined && parsedResult.totalExpenses !== null
      ? parseArgentineNumber(parsedResult.totalExpenses)
      : null;
    const period = parsedResult.period || null;

    let computedTotalIncome = 0;
    let computedTotalExpense = 0;

    const formattedTransactions: ParsedStatementTransaction[] = rawTxs.map((t: any, idx: number) => {
      const amount = Math.abs(parseArgentineNumber(t.amount)) || 0;
      const rawDesc = String(t.description || "").trim();
      const lowerDesc = rawDesc.toLowerCase();

      // Detectar movimientos internos de ahorro / reservas para no distorsionar ingresos ni gastos
      const isInternalReserve =
        lowerDesc.includes("dinero reservado") ||
        lowerDesc.includes("retirado ahorro") ||
        lowerDesc.includes("ahorro programado") ||
        lowerDesc.includes("reserva");

      let type: "income" | "expense" | "transfer";
      if (isInternalReserve) {
        type = "transfer";
      } else if (t.type === "income" || lowerDesc.includes("rendimiento") || lowerDesc.includes("ingreso de dinero")) {
        type = "income";
      } else if (t.type === "transfer") {
        type = "transfer";
      } else {
        type = "expense";
      }

      if (type === "income") {
        computedTotalIncome += amount;
      } else if (type === "expense") {
        computedTotalExpense += amount;
      }

      return {
        id: `ia-tx-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        date: t.date || new Date().toISOString().split("T")[0],
        description: rawDesc || "Movimiento Mercado Pago",
        amount,
        type,
        suggestedCategory: isInternalReserve ? "Transferencia" : (t.category || "General"),
        selected: true,
      };
    });

    const detectedBank = isPdf ? "Mercado Pago (PDF Oficial)" : "Mercado Pago (Captura/Imagen)";

    return NextResponse.json({
      success: true,
      detectedBank,
      period,
      initialBalance,
      finalBalance,
      totalIncomes: totalIncomes !== null ? totalIncomes : computedTotalIncome,
      totalExpenses: totalExpenses !== null ? totalExpenses : computedTotalExpense,
      totalIncome: totalIncomes !== null ? totalIncomes : computedTotalIncome,
      totalExpense: totalExpenses !== null ? totalExpenses : computedTotalExpense,
      transactions: formattedTransactions,
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
