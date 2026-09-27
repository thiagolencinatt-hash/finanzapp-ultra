"use client";

import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { ExportModal } from "@/components/export/ExportModal";

interface ExportExcelButtonProps {
  className?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "minimal";
  label?: string;
  // data prop mantenido por compatibilidad, ya no se usa (el modal llama al endpoint)
  data?: unknown;
}

export function ExportExcelButton({
  className = "",
  variant = "outline",
  label = "Descargar Excel (.xlsx)",
}: ExportExcelButtonProps) {
  const [showModal, setShowModal] = useState(false);

  const baseStyle =
    "inline-flex items-center gap-2 rounded-xl text-xs font-bold transition-all cursor-pointer";

  let variantStyle =
    "px-3.5 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/30";
  if (variant === "primary") {
    variantStyle =
      "px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20";
  } else if (variant === "secondary") {
    variantStyle =
      "px-3.5 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border";
  } else if (variant === "minimal") {
    variantStyle = "p-2 hover:bg-muted text-muted-foreground hover:text-foreground";
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`${baseStyle} ${variantStyle} ${className}`}
        title="Exportar reporte financiero a Excel / Google Sheets"
      >
        <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
        {variant !== "minimal" && <span>{label}</span>}
      </button>

      <ExportModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
