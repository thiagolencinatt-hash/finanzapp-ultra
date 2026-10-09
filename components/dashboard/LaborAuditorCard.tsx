"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Moon, 
  DollarSign, 
  RefreshCw, 
  FileSpreadsheet,
  Copy,
  Check,
  Share2,
  MessageSquare,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { 
  getWorkCycleRange, 
  getSavedCutoffDay,
  calculateLaborDiscrepancy,
  generateLaborClaimMessage
} from "@/lib/utils/payroll-calculator";
import { toast } from "sonner";
import type { SalaryRecord, WorkShift } from "@/lib/types";

export function LaborAuditorCard() {
  const [salaryRecord, setSalaryRecord] = useState<SalaryRecord | null>(null);
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [cutoffDay, setCutoffDay] = useState<number>(25);

  // Estados interactivos para cotejo personalizado
  const [customDayHours, setCustomDayHours] = useState<string>("");
  const [customNightHours, setCustomNightHours] = useState<string>("0");
  const [customHourlyRate, setCustomHourlyRate] = useState<string>("");
  const [showAdjustPanel, setShowAdjustPanel] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resPayroll, resShifts] = await Promise.all([
        fetch("/api/payroll", { cache: "no-store" }),
        fetch("/api/shifts", { cache: "no-store" }),
      ]);

      if (resPayroll.ok) {
        const data = await resPayroll.json();
        if (data.records && data.records.length > 0) {
          const rec = data.records[0] as SalaryRecord;
          setSalaryRecord(rec);
          if (!customDayHours) {
            setCustomDayHours(String(rec.total_hours || 160));
          }
          if (!customHourlyRate) {
            const rate = rec.hourly_rate_normal || (rec.net_salary ? Math.round(rec.net_salary / (rec.total_hours || 160)) : 4500);
            setCustomHourlyRate(String(rate));
          }
        }
      }

      if (resShifts.ok) {
        const data = await resShifts.json();
        if (Array.isArray(data.shifts)) {
          setShifts(data.shifts);
        }
      }
    } catch {
      // Fallback silencioso
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCutoffDay(getSavedCutoffDay());
    loadData();
    const handleRefresh = () => {
      setCutoffDay(getSavedCutoffDay());
      loadData();
    };
    window.addEventListener("finance-refresh", handleRefresh);
    window.addEventListener("finance-payroll-updated", handleRefresh);
    return () => {
      window.removeEventListener("finance-refresh", handleRefresh);
      window.removeEventListener("finance-payroll-updated", handleRefresh);
    };
  }, []);

  const cycle = useMemo(() => {
    return getWorkCycleRange(new Date(), cutoffDay);
  }, [cutoffDay]);

  // Turnos y horas del ciclo laboral (26 al 25)
  const auditBase = useMemo(() => {
    const cycleShifts = shifts.filter((s) => {
      if (s.is_rest_day || s.start_time === "Franco") return false;
      if (!s.shift_date) return false;
      return s.shift_date >= cycle.startDateStr && s.shift_date <= cycle.endDateStr;
    });

    const effectiveShifts = cycleShifts.length > 0
      ? cycleShifts
      : shifts.filter((s) => !s.is_rest_day && s.start_time !== "Franco");

    const totalWorkedHours = effectiveShifts.reduce((acc, s) => acc + (Number(s.total_hours) || 0), 0);
    const totalNightHours = effectiveShifts.reduce((acc, s) => acc + (Number(s.night_hours) || 0), 0);

    return {
      monthShiftsCount: effectiveShifts.length,
      totalWorkedHours: Math.round(totalWorkedHours * 10) / 10,
      totalNightHours: Math.round(totalNightHours * 10) / 10,
    };
  }, [shifts, cycle]);

  // Cálculo de discrepancia económica LCT Art. 200
  const discrepancy = useMemo(() => {
    const liqDay = customDayHours !== "" ? Number(customDayHours) : (Number(salaryRecord?.total_hours) || 160);
    const liqNight = customNightHours !== "" ? Number(customNightHours) : 0;
    const rateNormal = customHourlyRate !== "" 
      ? Number(customHourlyRate) 
      : (Number(salaryRecord?.hourly_rate_normal) || (salaryRecord?.net_salary ? Math.round(salaryRecord.net_salary / (Number(salaryRecord?.total_hours) || 160)) : 4500));

    return calculateLaborDiscrepancy({
      actualTotalHours: auditBase.totalWorkedHours,
      actualNightHours: auditBase.totalNightHours,
      liquidatedDayHours: liqDay,
      liquidatedNightHours: liqNight,
      hourlyRateNormal: rateNormal,
      periodName: salaryRecord?.period || cycle.periodName,
      cycleLabel: cycle.label,
    });
  }, [auditBase, customDayHours, customNightHours, customHourlyRate, salaryRecord, cycle]);

  // Generador del mensaje formal para RRHH
  const claimMessage = useMemo(() => {
    return generateLaborClaimMessage({
      period: salaryRecord?.period || cycle.periodName,
      cycleLabel: cycle.label,
      actualTotalHours: discrepancy.actualTotalHours,
      actualNightHours: discrepancy.actualNightHours,
      liquidatedDayHours: discrepancy.liquidatedDayHours,
      liquidatedNightHours: discrepancy.liquidatedNightHours,
      liquidatedTotalHours: discrepancy.liquidatedTotalHours,
      diffTotalHours: discrepancy.diffTotalHours,
      diffNightHours: discrepancy.diffNightHours,
      hourlyRateNormal: discrepancy.hourlyRateNormal,
      baseAmountDiff: discrepancy.baseAmountDiff,
      nightAmountDiff: discrepancy.nightAmountDiff,
      totalClaimAmount: discrepancy.totalClaimAmount,
    });
  }, [discrepancy, salaryRecord, cycle]);

  const handleCopyClaim = async () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(10); } catch {}
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(claimMessage);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = claimMessage;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      toast.success("Detalle de reclamo copiado al portapapeles", {
        description: "Listo para enviar por WhatsApp o correo a Liquidaciones / RRHH.",
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("No se pudo copiar automáticamente. Puedes seleccionar el texto.");
    }
  };

  const handleShareWhatsApp = () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(10); } catch {}
    }
    const url = `https://wa.me/?text=${encodeURIComponent(claimMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="relative rounded-3xl p-5 sm:p-7 bg-gradient-to-b from-neutral-900/80 to-neutral-950/80 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.08)] overflow-hidden">
      {/* Glow espacial ambiental */}
      <div 
        className={`absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl pointer-events-none transition-all duration-500 ${
          discrepancy.status === "favor" 
            ? "bg-amber-500/15" 
            : discrepancy.status === "correct" 
            ? "bg-emerald-500/15" 
            : "bg-blue-500/10"
        }`} 
        aria-hidden="true"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border ${
            discrepancy.status === "favor"
              ? "bg-amber-500/15 border-amber-500/25 text-amber-400"
              : discrepancy.status === "correct"
              ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-400"
              : "bg-blue-500/15 border-blue-500/25 text-blue-400"
          }`}>
            <ShieldCheck className="w-4.5 h-4.5 stroke-[2.4]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-extrabold text-white truncate flex items-center gap-2">
              Auditor Laboral LCT
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-white/[0.05] text-neutral-300 border border-white/[0.08]">
                {salaryRecord?.period || cycle.periodName}
              </span>
            </h3>
            <p className="text-xs text-neutral-400 truncate">
              Cotejo ciclo ({cycle.label}): Planilla vs Recibo liquidado
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-bold text-neutral-200 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            title="Recalcular auditoría"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-neutral-400 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden xs:inline">Auditar</span>
          </button>
        </div>
      </div>

      {/* Tarjeta de Estado & Discrepancia Económica */}
      {discrepancy.status === "favor" ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/5 border border-amber-500/35 mb-4 space-y-3.5 shadow-[0_8px_24px_rgba(245,158,11,0.12)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-400 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
                  Discrepancia detectada a tu favor
                </span>
                <h4 className="text-sm sm:text-base font-black text-amber-200">
                  Diferencia por cobrar: +{formatCurrency(discrepancy.totalClaimAmount, "ARS", false)}
                </h4>
              </div>
            </div>

            <div className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-black text-sm sm:text-base shadow-[0_0_16px_rgba(245,158,11,0.25)]">
              +{formatCurrency(discrepancy.totalClaimAmount, "ARS", false)}
            </div>
          </div>

          {/* Desglose Económico */}
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
              <span className="text-neutral-400">
                Horas base ({discrepancy.diffTotalHours > 0 ? `+${discrepancy.diffTotalHours} hs` : "0 hs"}):
              </span>
              <span className="font-mono font-bold text-white">
                +{formatCurrency(discrepancy.baseAmountDiff, "ARS", false)}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
              <span className="text-neutral-400">
                Adicional nocturno (+{discrepancy.diffNightHours} hs Art. 200):
              </span>
              <span className="font-mono font-bold text-amber-300">
                +{formatCurrency(discrepancy.nightAmountDiff, "ARS", false)}
              </span>
            </div>
          </div>

          {/* Acciones de Reclamo */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-500/20">
            <button
              type="button"
              onClick={handleCopyClaim}
              className="flex-1 min-w-[170px] py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 text-xs font-black flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(245,158,11,0.3)] active:scale-95 transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 stroke-[2.8]" />
                  <span>¡Detalle Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 stroke-[2.5]" />
                  <span>Copiar detalle de reclamo</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="py-2.5 px-3.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              title="Abrir en WhatsApp con el texto preparado"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPreviewModal((p) => !p)}
              className="py-2.5 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-neutral-300 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              title="Ver texto de reclamo preformateado"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Previsualizar</span>
            </button>
          </div>

          {showPreviewModal && (
            <div className="mt-3 p-3.5 rounded-xl bg-neutral-950/90 border border-white/10 text-xs font-mono text-neutral-300 whitespace-pre-wrap select-all max-h-60 overflow-y-auto leading-relaxed shadow-inner">
              {claimMessage}
            </div>
          )}
        </div>
      ) : discrepancy.status === "correct" ? (
        <div className="p-4 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/25 mb-4 space-y-1.5 shadow-[0_4px_20px_rgba(16,185,129,0.08)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
              <span>Liquidación Correcta ({discrepancy.actualTotalHours} hs trabajadas)</span>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/30">
              0 diferencias
            </div>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed pl-6.5">
            Las horas registradas en tus turnos coinciden plenamente con las {discrepancy.liquidatedTotalHours} hs liquidadas en tu recibo de haberes sin saldos pendientes.
          </p>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-blue-500/[0.06] border border-blue-500/20 mb-4 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-300 font-bold text-sm">
              <Clock className="w-4.5 h-4.5 shrink-0" />
              <span>Período en curso ({discrepancy.actualTotalHours} hs / {discrepancy.liquidatedTotalHours} hs base)</span>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-mono font-bold border border-blue-500/30">
              En curso
            </div>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Llevas registradas {discrepancy.actualTotalHours} hs en tus turnos sobre las {discrepancy.liquidatedTotalHours} hs mensuales pactadas en tu contrato.
          </p>
        </div>
      )}

      {/* Control interactivo para desplegar ajuste manual */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setShowAdjustPanel((p) => !p)}
          className="text-xs font-semibold text-neutral-400 hover:text-neutral-200 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
          <span>{showAdjustPanel ? "Ocultar cotejo de recibo" : "Ajustar horas o tarifa del recibo"}</span>
          {showAdjustPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <span className="text-[10px] text-neutral-400 font-mono">
          Tarifa: {formatCurrency(discrepancy.hourlyRateNormal, "ARS", false)}/hs
        </span>
      </div>

      {showAdjustPanel && (
        <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-white/[0.08] mb-4 space-y-3 animate-in fade-in duration-200">
          <div className="text-xs font-bold text-neutral-300 flex items-center justify-between">
            <span>Valores liquidados en tu recibo para auditar:</span>
            <button
              type="button"
              onClick={() => {
                setCustomDayHours(String(salaryRecord?.total_hours || 160));
                setCustomNightHours("0");
                setCustomHourlyRate(String(salaryRecord?.hourly_rate_normal || (salaryRecord?.net_salary ? Math.round(salaryRecord.net_salary / (salaryRecord.total_hours || 160)) : 4500)));
                toast.success("Valores restaurados al recibo registrado");
              }}
              className="text-[10px] text-blue-400 hover:underline cursor-pointer"
            >
              Restablecer
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1">Horas Diurnas recibo</label>
              <input
                type="number"
                value={customDayHours}
                onChange={(e) => setCustomDayHours(e.target.value)}
                placeholder="160"
                className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1">Horas Nocturnas recibo</label>
              <input
                type="number"
                value={customNightHours}
                onChange={(e) => setCustomNightHours(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1">Valor hora normal ($)</label>
              <input
                type="number"
                value={customHourlyRate}
                onChange={(e) => setCustomHourlyRate(e.target.value)}
                placeholder="4500"
                className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Grid de Métricas de Auditoría */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Horas Trabajadas Totales en Planilla */}
        <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-white/[0.08] space-y-1">
          <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-medium">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span className="truncate">Horas Planilla</span>
          </div>
          <p className="text-lg sm:text-xl font-black text-white font-mono tabular-nums">
            {discrepancy.actualTotalHours} <span className="text-xs text-neutral-400 font-normal">hs</span>
          </p>
          <p className="text-[10px] text-neutral-400 truncate">
            {auditBase.monthShiftsCount} turnos computados
          </p>
        </div>

        {/* Horas Liquidadas en Recibo */}
        <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-white/[0.08] space-y-1">
          <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-medium">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="truncate">Horas Recibo</span>
          </div>
          <p className="text-lg sm:text-xl font-black text-white font-mono tabular-nums">
            {discrepancy.liquidatedTotalHours} <span className="text-xs text-neutral-400 font-normal">hs</span>
          </p>
          <p className="text-[10px] text-neutral-400 truncate">
            {discrepancy.liquidatedDayHours}d + {discrepancy.liquidatedNightHours}n
          </p>
        </div>

        {/* Horas Nocturnas Auditadas */}
        <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-white/[0.08] space-y-1">
          <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-medium">
            <Moon className="w-3.5 h-3.5 text-amber-400" />
            <span className="truncate">Nocturnidad</span>
          </div>
          <p className="text-lg sm:text-xl font-black text-amber-300 font-mono tabular-nums">
            {discrepancy.actualNightHours} <span className="text-xs text-neutral-400 font-normal">hs</span>
          </p>
          <p className="text-[10px] text-amber-400/80 font-medium">
            +13.3% Art. 200 LCT
          </p>
        </div>

        {/* Valor Hora Normal */}
        <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-white/[0.08] space-y-1">
          <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-medium">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span className="truncate">Tarifa Normal</span>
          </div>
          <p className="text-sm sm:text-base font-black text-white font-mono truncate">
            {formatCurrency(discrepancy.hourlyRateNormal, "ARS", false)}
          </p>
          <p className="text-[10px] text-neutral-400 truncate">
            Nocturna: {formatCurrency(discrepancy.hourlyRateNight, "ARS", false)}
          </p>
        </div>
      </div>
    </div>
  );
}
