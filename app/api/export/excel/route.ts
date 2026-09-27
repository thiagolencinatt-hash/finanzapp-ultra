export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/server";
import ExcelJS from "exceljs";

// ─── Helpers de estilo ─────────────────────────────────────────────────────
function hexToArgb(hex: string): string {
  // ExcelJS usa ARGB, no RGB
  return "FF" + hex.replace("#", "").toUpperCase();
}

function applyHeaderStyle(cell: ExcelJS.Cell, bgHex: string) {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: hexToArgb(bgHex) },
  };
  cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10, name: "Calibri" };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: false };
  cell.border = {
    top: { style: "thin", color: { argb: "FF1E293B" } },
    left: { style: "thin", color: { argb: "FF1E293B" } },
    bottom: { style: "thin", color: { argb: "FF1E293B" } },
    right: { style: "thin", color: { argb: "FF1E293B" } },
  };
}

function applyDataBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: "hair", color: { argb: "FFE2E8F0" } },
    left: { style: "hair", color: { argb: "FFE2E8F0" } },
    bottom: { style: "hair", color: { argb: "FFE2E8F0" } },
    right: { style: "hair", color: { argb: "FFE2E8F0" } },
  };
}

function autoFitColumns(sheet: ExcelJS.Worksheet) {
  sheet.columns.forEach((col) => {
    let maxLen = 10;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 4, 55);
  });
}

// ─── GET /api/export/excel ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const supabase = await createAdminClient();

    // Consultar cuentas y transacciones del usuario
    const [{ data: accounts }, { data: transactions }, { data: categories }] =
      await Promise.all([
        supabase
          .from("accounts")
          .select("*")
          .eq("user_id", user.id)
          .order("name"),
        supabase
          .from("transactions")
          .select("*, account:accounts(name), category:categories(name, color)")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(2000),
        supabase
          .from("categories")
          .select("id, name")
          .or(`user_id.eq.${user.id},is_default.eq.true`),
      ]);

    const accs = accounts ?? [];
    const txs = transactions ?? [];

    // ─── Crear libro ─────────────────────────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "FinanzApp Ultra";
    workbook.lastModifiedBy = user.email;
    workbook.created = new Date();
    workbook.modified = new Date();

    const todayStr = new Date().toLocaleDateString("es-AR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
    const nowStr = new Date().toLocaleTimeString("es-AR", {
      hour: "2-digit", minute: "2-digit",
    });

    // ─────────────────────────────────────────────────────────────────────
    // HOJA 1: Resumen Ejecutivo
    // ─────────────────────────────────────────────────────────────────────
    const ws1 = workbook.addWorksheet("Resumen Ejecutivo", {
      properties: { tabColor: { argb: "FF059669" } },
    });

    // Título principal
    ws1.mergeCells("A1:D1");
    const titleCell = ws1.getCell("A1");
    titleCell.value = "FinanzApp Ultra — Reporte Financiero";
    titleCell.font = { bold: true, size: 16, color: { argb: "FF0F172A" }, name: "Calibri" };
    titleCell.alignment = { horizontal: "left", vertical: "middle" };
    ws1.getRow(1).height = 30;

    // Subtítulo: fecha y usuario
    ws1.mergeCells("A2:D2");
    const subCell = ws1.getCell("A2");
    subCell.value = `Generado el ${todayStr} a las ${nowStr}  ·  Usuario: ${user.email}`;
    subCell.font = { italic: true, size: 10, color: { argb: "FF64748B" }, name: "Calibri" };

    ws1.addRow([]); // fila vacía

    // ── Bloque de Totales ─────────────────────────────────────────────
    const totalIncome = txs
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + (t.amount ?? 0), 0);
    const totalExpense = txs
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + (t.amount ?? 0), 0);
    const totalBalance = accs.reduce((s, a) => s + (a.balance ?? 0), 0);

    // Encabezado de sección
    ws1.addRow(["RESUMEN FINANCIERO", ""]);
    const sectionRow = ws1.lastRow!;
    sectionRow.getCell(1).font = { bold: true, size: 11, color: { argb: "FF0F172A" }, name: "Calibri" };
    ws1.getRow(sectionRow.number).height = 20;

    // Helper para filas de KPI con color
    function addKpiRow(
      label: string,
      value: number,
      bgFg: { bg: string; fg: string }
    ) {
      ws1.addRow([label, value]);
      const row = ws1.lastRow!;
      const c1 = row.getCell(1);
      const c2 = row.getCell(2);

      [c1, c2].forEach((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: hexToArgb(bgFg.bg) } };
        c.font = { bold: true, color: { argb: hexToArgb(bgFg.fg) }, name: "Calibri", size: 10 };
        c.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
        row.height = 18;
      });

      c2.numFmt = "$ #,##0.00";
      c2.alignment = { horizontal: "right" };
      c1.alignment = { horizontal: "left", indent: 1 };
    }

    addKpiRow("Total Ingresos", totalIncome, { bg: "#D1FAE5", fg: "#065F46" });
    addKpiRow("Total Gastos", totalExpense, { bg: "#FFE4E6", fg: "#9F1239" });
    addKpiRow("Balance Neto", totalIncome - totalExpense, { bg: "#EFF6FF", fg: "#1E40AF" });
    addKpiRow("Balance en Cuentas", totalBalance, { bg: "#F0FDF4", fg: "#166534" });

    ws1.addRow([]); // espacio

    // ── Gastos por Categoría ─────────────────────────────────────────
    ws1.addRow(["GASTOS POR CATEGORÍA", "", ""]);
    const catTitleRow = ws1.lastRow!;
    catTitleRow.getCell(1).font = { bold: true, size: 11, color: { argb: "FF0F172A" }, name: "Calibri" };

    // Encabezados de tabla
    ws1.addRow(["Categoría", "Total Gastado", "% del Total"]);
    const catHeaderRow = ws1.lastRow!;
    ["A", "B", "C"].forEach((col) => {
      applyHeaderStyle(ws1.getCell(`${col}${catHeaderRow.number}`), "#0F172A");
    });
    catHeaderRow.height = 20;

    // Agrupar gastos por categoría
    const catMap = new Map<string, number>();
    txs.filter((t) => t.type === "expense").forEach((t) => {
      const catName = (t.category as { name?: string })?.name ?? "Sin categoría";
      catMap.set(catName, (catMap.get(catName) ?? 0) + (t.amount ?? 0));
    });

    const catEntries = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);
    const totalCatExp = catEntries.reduce((s, [, v]) => s + v, 0);

    catEntries.forEach(([name, total]) => {
      const pct = totalCatExp > 0 ? total / totalCatExp : 0;
      ws1.addRow([name, total, pct]);
      const row = ws1.lastRow!;
      applyDataBorder(row.getCell(1));
      applyDataBorder(row.getCell(2));
      applyDataBorder(row.getCell(3));
      row.getCell(1).font = { name: "Calibri", size: 10 };
      row.getCell(2).numFmt = "$ #,##0.00";
      row.getCell(2).alignment = { horizontal: "right" };
      row.getCell(3).numFmt = "0.0%";
      row.getCell(3).alignment = { horizontal: "center" };
      row.height = 16;
    });

    if (catEntries.length === 0) {
      ws1.addRow(["Sin gastos registrados", 0, 0]);
    }

    // Ancho de columnas
    ws1.columns = [
      { key: "A", width: 36 },
      { key: "B", width: 20 },
      { key: "C", width: 14 },
      { key: "D", width: 20 },
    ];

    // ─────────────────────────────────────────────────────────────────────
    // HOJA 2: Cuentas
    // ─────────────────────────────────────────────────────────────────────
    const ws2 = workbook.addWorksheet("Cuentas", {
      properties: { tabColor: { argb: "FF3B82F6" } },
    });

    const accHeaders = ["Nombre", "Tipo", "Moneda", "Saldo", "Estado"];
    ws2.addRow(accHeaders);
    const accHRow = ws2.lastRow!;
    accHeaders.forEach((_, i) =>
      applyHeaderStyle(ws2.getCell(accHRow.number, i + 1), "#0F172A")
    );
    accHRow.height = 20;

    const typeLabel = (t: string) =>
      ({ bank: "Banco", cash: "Efectivo", digital_wallet: "Billetera Digital", investment: "Inversión", crypto: "Cripto" }[t] ?? t);

    accs.forEach((acc) => {
      ws2.addRow([acc.name, typeLabel(acc.type), acc.currency, acc.balance, acc.is_active ? "Activa" : "Inactiva"]);
      const row = ws2.lastRow!;
      for (let i = 1; i <= 5; i++) applyDataBorder(row.getCell(i));
      row.getCell(4).numFmt = "$ #,##0.00";
      row.getCell(4).alignment = { horizontal: "right" };
      row.height = 16;
    });

    if (accs.length === 0) ws2.addRow(["Sin cuentas", "-", "ARS", 0, "-"]);
    autoFitColumns(ws2);

    // ─────────────────────────────────────────────────────────────────────
    // HOJA 3: Detalle de Transacciones (la hoja estrella)
    // ─────────────────────────────────────────────────────────────────────
    const ws3 = workbook.addWorksheet("Detalle de Transacciones", {
      properties: { tabColor: { argb: "FF8B5CF6" } },
      views: [{ state: "frozen", ySplit: 1 }], // congelar encabezado
    });

    const txHeaders = ["Fecha", "Tipo", "Cuenta", "Categoría", "Concepto / Descripción", "Monto ARS"];
    ws3.addRow(txHeaders);
    const txHRow = ws3.lastRow!;
    txHeaders.forEach((_, i) =>
      applyHeaderStyle(ws3.getCell(txHRow.number, i + 1), "#0F172A")
    );
    txHRow.height = 22;

    // Mapa de colores según tipo de transacción
    const txTypeBg: Record<string, { bg: string; fg: string; label: string }> = {
      income:   { bg: "#D1FAE5", fg: "#065F46", label: "Ingreso" },
      expense:  { bg: "#FFE4E6", fg: "#9F1239", label: "Gasto" },
      transfer: { bg: "#DBEAFE", fg: "#1E40AF", label: "Transferencia" },
    };

    txs.forEach((t) => {
      const dateVal = t.date ? new Date(t.date) : new Date();
      const typeInfo = txTypeBg[t.type] ?? { bg: "#F8FAFC", fg: "#1E293B", label: t.type };
      const acctName = (t.account as { name?: string })?.name ?? "—";
      const catName = (t.category as { name?: string })?.name ?? "Sin categoría";

      ws3.addRow([
        dateVal,
        typeInfo.label,
        acctName,
        catName,
        t.description ?? "—",
        t.amount ?? 0,
      ]);

      const row = ws3.lastRow!;
      row.height = 16;

      // Celda de fecha
      const dateCell = row.getCell(1);
      dateCell.numFmt = "DD/MM/YYYY";
      dateCell.alignment = { horizontal: "center" };

      // Celda de tipo: coloreada según tipo
      const typeCell = row.getCell(2);
      typeCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: hexToArgb(typeInfo.bg) } };
      typeCell.font = { bold: true, color: { argb: hexToArgb(typeInfo.fg) }, size: 9, name: "Calibri" };
      typeCell.alignment = { horizontal: "center" };

      // Celda de monto con formato bicolor (positivo verde, negativo rojo)
      const amtCell = row.getCell(6);
      amtCell.numFmt = '$ #,##0.00;[Red]-$ #,##0.00';
      amtCell.alignment = { horizontal: "right" };

      // Bordes finos para todas las celdas
      for (let i = 1; i <= 6; i++) {
        const c = row.getCell(i);
        applyDataBorder(c);
        if (i !== 2) {
          // fuente base para celdas sin color especial
          if (!c.font?.bold) {
            c.font = { name: "Calibri", size: 10 };
          }
        }
      }

      // Zebra striping suave: filas pares con fondo muy sutil
      if (row.number % 2 === 0) {
        for (let i = 1; i <= 6; i++) {
          const c = row.getCell(i);
          if (i !== 2) {
            const f = c.fill as ExcelJS.FillPattern | undefined;
            const hasFill = f?.type === "pattern" && f?.pattern === "solid";
            if (!hasFill) {
              c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
            }
          }
        }
      }
    });

    if (txs.length === 0) {
      ws3.addRow([new Date(), "—", "—", "—", "Sin transacciones registradas", 0]);
    }

    // Anchos optimizados para transacciones
    ws3.getColumn(1).width = 14; // Fecha
    ws3.getColumn(2).width = 16; // Tipo
    ws3.getColumn(3).width = 22; // Cuenta
    ws3.getColumn(4).width = 24; // Categoría
    ws3.getColumn(5).width = 42; // Descripción
    ws3.getColumn(6).width = 18; // Monto

    // ─────────────────────────────────────────────────────────────────────
    // Serializar y responder
    // ─────────────────────────────────────────────────────────────────────
    const rawBuffer = await workbook.xlsx.writeBuffer();
    const uint8 = new Uint8Array(rawBuffer);

    const filename = `FinanzApp_Reporte_${new Date().toISOString().split("T")[0]}.xlsx`;

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al generar Excel";
    console.error("[/api/export/excel]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
