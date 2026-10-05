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
  TrendingUp
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { getWorkCycleRange, getSavedCutoffDay } from "@/lib/utils/payroll-calculator";
import type { SalaryRecord, WorkShift } from "@/lib/types";

export function LaborAuditorCard() {
  const [salaryRecord, setSalaryRecord] = useState<SalaryRecord | null>(null);
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [cutoffDay, setCutoffDay] = useState<number>(25);

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
          setSalaryRecord(data.records[0]);
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

  // Calcular horas trabajadas en el ciclo de corte laboral (ej. del 26 del mes anterior al 25 de este mes)
  const audit = useMemo(() => {
    // Filtrar turnos estrictamente dentro del rango de corte
    const cycleShifts = shifts.filter((s) => {
      if (s.is_rest_day || s.start_time === "Franco") return false;
      if (!s.shift_date) return false;
      return s.shift_date >= cycle.startDateStr && s.shift_date <= cycle.endDateStr;
    });

    // Si los turnos cargados corresponden a un lote de hasta 31 días pero fuera del rango exacto ISO, usarlos como fallback
    const effectiveShifts = cycleShifts.length > 0
      ? cycleShifts
      : shifts.filter((s) => !s.is_rest_day && s.start_time !== "Franco");

    const totalWorkedHours = effectiveShifts.reduce((acc, s) => acc + (Number(s.total_hours) || 0), 0);
    const totalNightHours = effectiveShifts.reduce((acc, s) => acc + (Number(s.night_hours) || 0), 0);

    const liquidatedHours = Number(salaryRecord?.total_hours) || 160;
    const hourlyNormal = Number(salaryRecord?.hourly_rate_normal) || (salaryRecord?.net_salary ? salaryRecord.net_salary / liquidatedHours : 0);
    const hourlyNight = Number(salaryRecord?.hourly_rate_night) || hourlyNormal * 1.1333;

    const diff = totalWorkedHours - liquidatedHours;
    const isExact = totalWorkedHours > 0 && Math.abs(diff) < 0.1;
    const hasPendingHours = diff > 0;
    const pendingValue = hasPendingHours ? diff * hourlyNormal : 0;

    return {
      monthShiftsCount: effectiveShifts.length,
      totalWorkedHours,
      totalNightHours,
      liquidatedHours,
      diff,
      isExact,
      hasPendingHours,
      pendingValue,
      hourlyNormal,
      hourlyNight,
      period: salaryRecord?.period || cycle.periodName,
      cycleLabel: cycle.label,
    };
  }, [shifts, salaryRecord, cycle]);

  return (
    <div className="relative rounded-3xl p-5 sm:p-7 bg-gradient-to-b from-neutral-900/80 to-neutral-950/80 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.08)] overflow-hidden">
      {/* Glow sutil */}
      <div className={`absolute -top-16 -right-16 w-52 h-52 rounded-full blur-3xl pointer-events-none ${
        audit.hasPendingHours ? "bg-amber-500/10" : "bg-emerald-500/10"
      }`} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border ${
            audit.hasPendingHours
              ? "bg-amber-500/15 border-amber-500/25 text-amber-400"
              : "bg-emerald-500/15 border-emerald-500/25 text-emerald-400"
          }`}>
            <ShieldCheck className="w-4.5 h-4.5 stroke-[2.4]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-extrabold text-white truncate flex items-center gap-2">
              Auditor Laboral de Horas
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-white/[0.05] text-neutral-300 border border-white/[0.08]">
                {audit.period}
              </span>
            </h3>
            <p className="text-xs text-neutral-400 truncate">
              Cotejo ciclo ({audit.cycleLabel}): Planilla vs Recibo liquidado
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-bold text-neutral-200 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
          title="Recalcular auditoría"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-neutral-400 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden xs:inline">Auditar</span>
        </button>
      </div>

      {/* Tarjeta de Estado del Auditor */}
      {audit.isExact ? (
        <div className="p-4 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/25 mb-4 space-y-1.5 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
            <span>Liquidación exacta ({audit.totalWorkedHours} hs trabajadas)</span>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed pl-6.5">
            Las horas registradas en tus turnos coinciden perfectamente con las {audit.liquidatedHours} hs liquidadas en tu recibo de haberes.
          </p>
        </div>
      ) : audit.hasPendingHours ? (
        <div className="p-4 rounded-2xl bg-amber-500/[0.08] border border-amber-500/30 mb-4 space-y-2 shadow-sm">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
            <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-amber-400" />
            <span>Diferencia detectada a tu favor</span>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Trabajaste <strong className="text-white font-mono">{audit.totalWorkedHours} hs</strong> pero se liquidaron <strong className="text-white font-mono">{audit.liquidatedHours} hs</strong>.
            Existe una diferencia de <strong className="text-amber-300 font-mono">+{audit.diff.toFixed(1)} hs</strong> no liquidadas o extras.
          </p>
          {audit.pendingValue > 0 && (
            <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-xs">
              <span className="text-neutral-400">Importe estimado a reclamar/cobrar:</span>
              <span className="text-amber-300 font-mono font-black text-sm">
                +{formatCurrency(audit.pendingValue, "ARS", true)}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-blue-500/[0.06] border border-blue-500/20 mb-4 space-y-1.5 shadow-sm">
          <div className="flex items-center gap-2 text-blue-300 font-bold text-sm">
            <Clock className="w-4.5 h-4.5 shrink-0" />
            <span>Período en curso ({audit.totalWorkedHours} hs / {audit.liquidatedHours} hs base)</span>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Llevas registradas {audit.totalWorkedHours} hs en tus turnos sobre las {audit.liquidatedHours} hs mensuales pactadas en tu contrato.
          </p>
        </div>
      )}

      {/* Grid de Métricas de Auditoría */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {/* Horas Trabajadas Totales */}
        <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-white/[0.08] space-y-1">
          <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-medium">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span className="truncate">Horas Planilla</span>
          </div>
          <p className="text-lg sm:text-xl font-black text-white font-mono tabular-nums">
            {audit.totalWorkedHours} <span className="text-xs text-neutral-400 font-normal">hs</span>
          </p>
          <p className="text-[10px] text-neutral-400">
            {audit.monthShiftsCount} turnos registrados
          </p>
        </div>

        {/* Horas Liquidadas en Recibo */}
        <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-white/[0.08] space-y-1">
          <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-medium">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="truncate">Horas Recibo</span>
          </div>
          <p className="text-lg sm:text-xl font-black text-white font-mono tabular-nums">
            {audit.liquidatedHours} <span className="text-xs text-neutral-400 font-normal">hs</span>
          </p>
          <p className="text-[10px] text-neutral-400">
            Base mensual pactada
          </p>
        </div>

        {/* Horas Nocturnas Auditadas */}
        <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-white/[0.08] space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-medium">
            <Moon className="w-3.5 h-3.5 text-amber-400" />
            <span className="truncate">Nocturnidad</span>
          </div>
          <p className="text-lg sm:text-xl font-black text-amber-300 font-mono tabular-nums">
            {audit.totalNightHours} <span className="text-xs text-neutral-400 font-normal">hs</span>
          </p>
          <p className="text-[10px] text-amber-400/80 font-medium">
            +13.3% Art. 200 LCT
          </p>
        </div>
      </div>
    </div>
  );
}
