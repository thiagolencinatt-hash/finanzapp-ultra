import * as XLSX from "xlsx";

export interface ParsedStatementTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense" | "transfer";
  suggestedCategory: string;
  rawDetails?: string;
  selected: boolean;
}

export interface StatementParseResult {
  detectedBank: string;
  transactions: ParsedStatementTransaction[];
  totalIncome: number;
  totalExpense: number;
  validCount: number;
  error?: string;
}

// Mapeo inteligente de categorías por palabras clave
const CATEGORY_RULES: Array<{ keywords: string[]; category: string }> = [
  {
    keywords: ["coto", "carrefour", "dia%", "dia ", "jumbo", "disco", "vea", "chango", "supermercado", "almacen", "verduleria", "carniceria"],
    category: "Supermercado",
  },
  {
    keywords: ["mcdonald", "burger", "pedidosya", "rappi", "starbucks", "cafe", "restaurante", "bar ", "cerveceria", "heladeria", "pizz", "empanad"],
    category: "Restaurantes",
  },
  {
    keywords: ["netflix", "spotify", "edenor", "edesur", "metrogas", "telecentro", "fibertel", "personal", "claro", "movistar", "flow", "disney", "prime", "youtube", "hbo", "max "],
    category: "Servicios",
  },
  {
    keywords: ["shell", "ypf", "axion", "uber", "cabify", "didi", "sube", "estacionamiento", "peaje", "combustible", "nafta"],
    category: "Transporte",
  },
  {
    keywords: ["farmacity", "farmacia", "swiss", "osde", "galeno", "medico", "optica", "hospital", "sanatorio"],
    category: "Salud",
  },
  {
    keywords: ["steam", "playstation", "cine", "teatro", "recital", "evento", "spotify"],
    category: "Entretenimiento",
  },
  {
    keywords: ["sueldo", "haberes", "honorarios", "rendimiento", "intereses", "cobro", "premio", "liquidaci"],
    category: "Sueldo",
  },
  {
    keywords: ["transferencia", "cvu", "cbu", "envio de dinero", "transfer"],
    category: "Transferencias",
  },
];

function guessCategory(desc: string, type: "income" | "expense" | "transfer"): string {
  const lower = (desc || "").toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.category;
    }
  }
  return type === "income" ? "Ingresos Varios" : "General";
}

function parseNumber(val: any): number | null {
  if (typeof val === "number") return isFinite(val) ? val : null;
  if (!val) return null;
  let str = String(val).trim();
  
  // Quitar símbolos de moneda y espacios
  str = str.replace(/[$€US\s]/gi, "");

  // Si tiene formato latino: 1.250,50 -> 1250.50
  if (str.includes(",") && str.includes(".")) {
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      // 1.250,50
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      // 1,250.50
      str = str.replace(/,/g, "");
    }
  } else if (str.includes(",")) {
    // Solo coma (1250,50)
    str = str.replace(",", ".");
  }

  // Quitar paréntesis que indican negativo (ej: (150.00))
  if (str.startsWith("(") && str.endsWith(")")) {
    str = "-" + str.slice(1, -1);
  }

  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function parseDate(val: any): string {
  if (!val) return new Date().toISOString().split("T")[0];
  
  if (val instanceof Date) {
    return val.toISOString().split("T")[0];
  }

  let str = String(val).trim();

  // Excel serial number date
  if (typeof val === "number" && val > 30000 && val < 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + val * 86400000);
    return d.toISOString().split("T")[0];
  }

  // Quitar hora si viene: "2026-09-28 14:30:00" -> "2026-09-28"
  str = str.split(" ")[0].split("T")[0];

  // Si tiene formato DD/MM/YYYY o DD-MM-YYYY
  const parts = str.split(/[/-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    } else if (parts[2].length === 4) {
      // DD-MM-YYYY
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return new Date().toISOString().split("T")[0];
}

export function parseBankStatementBuffer(buffer: ArrayBuffer | Uint8Array): StatementParseResult {
  try {
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { detectedBank: "Desconocido", transactions: [], totalIncome: 0, totalExpense: 0, validCount: 0, error: "El archivo no contiene hojas con datos." };
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" });

    if (!rows || rows.length < 2) {
      return { detectedBank: "Desconocido", transactions: [], totalIncome: 0, totalExpense: 0, validCount: 0, error: "El archivo parece estar vacío." };
    }

    // Buscar la fila de encabezados (entre las primeras 15 filas)
    let headerRowIndex = -1;
    let colMap: Record<string, number> = {};
    let detectedBank = "Extracto Genérico";

    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      const rowStr = row.map((c) => String(c || "").toLowerCase().trim());

      const dateIdx = rowStr.findIndex((c) => c.includes("fecha") || c.includes("date") || c.includes("fec."));
      const descIdx = rowStr.findIndex(
        (c) =>
          c.includes("descrip") ||
          c.includes("concepto") ||
          c.includes("detalle") ||
          c.includes("motivo") ||
          c.includes("comercio") ||
          c.includes("movimiento") ||
          c.includes("referencia")
      );
      const amountIdx = rowStr.findIndex((c) => c.includes("monto") || c.includes("importe") || c.includes("amount") || c.includes("total"));
      const debitIdx = rowStr.findIndex((c) => c.includes("debit") || c.includes("débito") || c.includes("egreso") || c.includes("cargo"));
      const creditIdx = rowStr.findIndex((c) => c.includes("credit") || c.includes("crédito") || c.includes("ingreso") || c.includes("abono"));

      if (dateIdx !== -1 && (amountIdx !== -1 || (debitIdx !== -1 && creditIdx !== -1) || descIdx !== -1)) {
        headerRowIndex = i;
        colMap = {
          date: dateIdx,
          desc: descIdx !== -1 ? descIdx : -1,
          amount: amountIdx,
          debit: debitIdx,
          credit: creditIdx,
          status: rowStr.findIndex((c) => c.includes("estado") || c.includes("status")),
        };

        // Identificar banco por encabezados
        if (rowStr.some((c) => c.includes("mercado pago") || c.includes("mp_id"))) {
          detectedBank = "Mercado Pago";
        } else if (rowStr.some((c) => c.includes("santander"))) {
          detectedBank = "Banco Santander";
        } else if (rowStr.some((c) => c.includes("galicia"))) {
          detectedBank = "Banco Galicia";
        } else if (rowStr.some((c) => c.includes("bbva"))) {
          detectedBank = "BBVA";
        } else if (rowStr.some((c) => c.includes("brubank"))) {
          detectedBank = "Brubank";
        } else if (rowStr.some((c) => c.includes("lemon"))) {
          detectedBank = "Lemon Cash";
        }
        break;
      }
    }

    if (headerRowIndex === -1) {
      return {
        detectedBank: "No identificado",
        transactions: [],
        totalIncome: 0,
        totalExpense: 0,
        validCount: 0,
        error: "No se encontró una fila de encabezados válida con Fecha y Monto/Importe.",
      };
    }

    const transactions: ParsedStatementTransaction[] = [];
    let totalIncome = 0;
    let totalExpense = 0;

    // Procesar filas de datos
    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      const dateRaw = colMap.date !== -1 ? row[colMap.date] : null;
      if (!dateRaw) continue;

      const dateStr = parseDate(dateRaw);
      const descRaw = colMap.desc !== -1 && row[colMap.desc] ? String(row[colMap.desc]).trim() : "Movimiento";

      // Manejo de estado en Mercado Pago (descartar canceladas o rechazadas)
      if (colMap.status !== -1 && row[colMap.status]) {
        const st = String(row[colMap.status]).toLowerCase();
        if (st.includes("rechazad") || st.includes("cancelad") || st.includes("fallid")) {
          continue;
        }
      }

      let amount = 0;
      let type: "income" | "expense" = "expense";

      if (colMap.debit !== -1 && colMap.credit !== -1 && (row[colMap.debit] || row[colMap.credit])) {
        const deb = parseNumber(row[colMap.debit]);
        const cred = parseNumber(row[colMap.credit]);

        if (cred && cred > 0) {
          amount = cred;
          type = "income";
        } else if (deb && deb !== 0) {
          amount = Math.abs(deb);
          type = "expense";
        } else {
          continue;
        }
      } else if (colMap.amount !== -1) {
        const num = parseNumber(row[colMap.amount]);
        if (num === null || num === 0) continue;

        if (num > 0) {
          // Chequear si en la descripción dice "pago", "compra", "debito"
          const lowerDesc = descRaw.toLowerCase();
          if (lowerDesc.includes("pago con") || lowerDesc.includes("compra") || lowerDesc.includes("debito") || lowerDesc.includes("débito")) {
            type = "expense";
            amount = num;
          } else {
            type = "income";
            amount = num;
          }
        } else {
          type = "expense";
          amount = Math.abs(num);
        }
      } else {
        continue;
      }

      if (amount <= 0) continue;

      const suggestedCategory = guessCategory(descRaw, type);

      if (type === "income") {
        totalIncome += amount;
      } else {
        totalExpense += amount;
      }

      transactions.push({
        id: `stmt-${r}-${Date.now().toString(36)}`,
        date: dateStr,
        description: descRaw,
        amount: Math.round(amount * 100) / 100,
        type,
        suggestedCategory,
        selected: true,
      });
    }

    return {
      detectedBank,
      transactions,
      totalIncome,
      totalExpense,
      validCount: transactions.length,
    };
  } catch (err: any) {
    console.error("[statement-parser] error:", err);
    return {
      detectedBank: "Error",
      transactions: [],
      totalIncome: 0,
      totalExpense: 0,
      validCount: 0,
      error: err.message || "Error al procesar el archivo de extracto.",
    };
  }
}
