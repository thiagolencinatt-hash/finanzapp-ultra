"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileSpreadsheet,
  X,
  Download,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Table2,
  Palette,
  ArrowRight,
  Sparkles,
  Info,
} from "lucide-react";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Reset al abrir
  useEffect(() => {
    if (isOpen) {
      setDone(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch("/api/export/excel", { method: "GET" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Error al generar el reporte");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const today = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `FinanzApp_Reporte_${today}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setDone(true);
      setTimeout(() => setDone(false), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setDownloading(false);
    }
  }

  function handleOpenSheets() {
    window.open("https://sheets.new", "_blank", "noopener,noreferrer");
  }

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
    >
      <div className="relative w-full max-w-md bg-zinc-900 border border-white/[0.08] rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden animate-scale-in">

        {/* Gradiente decorativo superior */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500" />

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Exportar Reporte Financiero
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Hoja de cálculo con estilos y fórmulas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="px-6 pb-6 space-y-3">

          {/* Características del archivo */}
          <div className="bg-zinc-950/50 border border-white/[0.05] rounded-2xl p-4 space-y-2.5">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Contenido del archivo
            </p>
            {[
              { icon: Table2, text: "Hoja 1 — Resumen Ejecutivo con KPIs" },
              { icon: Palette, text: "Filas coloreadas por tipo de movimiento" },
              { icon: FileSpreadsheet, text: "Hoja 2 — Cuentas y saldos actuales" },
              { icon: Sparkles, text: "Hoja 3 — Detalle completo de transacciones" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5 text-xs text-zinc-300">
                <Icon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <Info className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Botón principal: Descargar XLSX */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className={`w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg
              ${done
                ? "bg-emerald-600 text-white shadow-emerald-600/20"
                : "bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-600/25 hover:shadow-emerald-500/30 hover:scale-[1.01]"
              }
              disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100`}
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generando reporte…</span>
              </>
            ) : done ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>¡Descargado con éxito!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Descargar Hoja de Cálculo (.xlsx)</span>
              </>
            )}
          </button>

          {/* Separador */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">o también</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Tarjeta Google Sheets */}
          <div className="relative bg-zinc-950/50 border border-white/[0.06] rounded-2xl p-4 hover:border-blue-500/30 transition-colors group">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Logo de Google Sheets (SVG inline compacto) */}
                <div className="w-9 h-9 rounded-xl bg-[#0F9D58]/10 border border-[#0F9D58]/20 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" fill="#0F9D58" fillOpacity="0.15" stroke="#0F9D58" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 2v6h6M8 13h8M8 17h6" stroke="#0F9D58" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">
                    Abrir en Google Sheets
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-tight">
                    Crea una hoja nueva y suelta el .xlsx
                  </p>
                </div>
              </div>
              <button
                onClick={handleOpenSheets}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-xs font-bold transition-all cursor-pointer hover:scale-[1.02] shrink-0"
              >
                <span>Abrir</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {/* Tooltip informativo */}
            <div className="mt-3 pt-3 border-t border-white/[0.05]">
              <div
                className="flex items-start gap-2 cursor-pointer"
                onClick={() => setShowTooltip(!showTooltip)}
              >
                <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-zinc-500 leading-snug">
                  {showTooltip
                    ? "Descargá el archivo .xlsx desde el botón de arriba y luego arrástralo directamente a Google Sheets. Todos los colores, formatos de moneda y datos quedarán intactos."
                    : "¿Cómo usarlo con Google Sheets? Tocá para ver el instructivo."}
                </p>
                <ArrowRight
                  className={`w-3 h-3 text-zinc-600 shrink-0 mt-0.5 transition-transform ${showTooltip ? "rotate-90" : ""}`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in { animation: scale-in 0.18s ease-out both; }
      `}</style>
    </div>
  );
}
