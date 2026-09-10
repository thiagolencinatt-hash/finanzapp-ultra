"use client";

import { useState } from "react";
import { FileSpreadsheet, Loader2, CheckCircle2 } from "lucide-react";
import { exportFinancialsToExcel, type ExcelExportData } from "@/lib/export/excel-generator";

interface ExportExcelButtonProps {
  className?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "minimal";
  label?: string;
  data?: ExcelExportData;
}

export function ExportExcelButton({
  className = "",
  variant = "outline",
  label = "Descargar Excel (.xlsx)",
  data,
}: ExportExcelButtonProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleExport() {
    if (loading) return;
    setLoading(true);
    try {
      await exportFinancialsToExcel(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
    } catch (err) {
      console.error(err);
      alert("Error al generar la planilla Excel. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  const baseStyle = "inline-flex items-center gap-2 rounded-xl text-xs font-bold transition-all cursor-pointer";

  let variantStyle = "px-3.5 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/30";
  if (variant === "primary") {
    variantStyle = "px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20";
  } else if (variant === "secondary") {
    variantStyle = "px-3.5 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border";
  } else if (variant === "minimal") {
    variantStyle = "p-2 hover:bg-muted text-muted-foreground hover:text-foreground";
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className={`${baseStyle} ${variantStyle} ${className}`}
      title="Exportar reporte contable completo a Microsoft Excel (.xlsx)"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
      ) : success ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      ) : (
        <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
      )}
      {variant !== "minimal" && (
        <span>{loading ? "Generando..." : success ? "¡Excel Descargado!" : label}</span>
      )}
    </button>
  );
}
