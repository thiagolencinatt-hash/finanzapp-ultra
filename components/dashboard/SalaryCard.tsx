"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { 
  Briefcase, 
  Calendar, 
  Clock, 
  Moon, 
  UploadCloud, 
  SlidersHorizontal, 
  Check, 
  X, 
  Loader2, 
  FileText, 
  DollarSign, 
  Info,
  ChevronRight,
  Sparkles,
  Repeat
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { 
  getNextPaymentCountdown, 
  calculateHourlyRates, 
  getWorkCycleRange,
  getSavedCutoffDay,
  saveCutoffDay,
  getSavedPaymentRule
} from "@/lib/utils/payroll-calculator";
import { usePrivacy } from "@/components/providers/PrivacyProvider";
import { toast } from "sonner";
import type { SalaryRecord } from "@/lib/types";

interface SalaryCardProps {
  initialSalary?: number;
  onSalaryUpdated?: (newSalary: number) => void;
}

export function SalaryCard({ initialSalary = 0, onSalaryUpdated }: SalaryCardProps) {
  const { isPrivate } = usePrivacy();
  const [salaryRecord, setSalaryRecord] = useState<SalaryRecord | null>(null);
  const [currentNetSalary, setCurrentNetSalary] = useState<number>(initialSalary);
  const [currentHours, setCurrentHours] = useState<number>(160);
  const [cutoffDay, setCutoffDay] = useState<number>(25);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"scan" | "manual">("scan");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual form inputs
  const [manualNet, setManualNet] = useState<string>("");
  const [manualGross, setManualGross] = useState<string>("");
  const [scheduleType, setScheduleType] = useState<"weekly" | "monthly">("weekly");
  const [weeklyHoursInput, setWeeklyHoursInput] = useState<string>("44");
  const [manualHours, setManualHours] = useState<string>("191");
  const [formCutoffDay, setFormCutoffDay] = useState<string>("25");
  const [manualPeriod, setManualPeriod] = useState<string>("");

  const [paymentUpdateTrigger, setPaymentUpdateTrigger] = useState(0);

  // Cargar configuración guardada
  useEffect(() => {
    const savedCutoff = getSavedCutoffDay();
    setCutoffDay(savedCutoff);
    setFormCutoffDay(String(savedCutoff));

    const handlePayrollUpdated = () => {
      setCutoffDay(getSavedCutoffDay());
      setPaymentUpdateTrigger((prev) => prev + 1);
    };
    window.addEventListener("finance-payroll-updated", handlePayrollUpdated);
    return () => window.removeEventListener("finance-payroll-updated", handlePayrollUpdated);
  }, []);

  const countdown = useMemo(() => {
    return getNextPaymentCountdown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentUpdateTrigger]);

  const cycle = useMemo(() => {
    return getWorkCycleRange(new Date(), cutoffDay);
  }, [cutoffDay]);

  // Cargar registro de sueldo desde el backend
  const fetchSalary = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/payroll", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.records && data.records.length > 0) {
          const latest = data.records[0];
          setSalaryRecord(latest);
          setCurrentNetSalary(latest.net_salary);
          setCurrentHours(latest.total_hours || 160);
          setManualNet(String(latest.net_salary));
          if (latest.gross_salary) setManualGross(String(latest.gross_salary));
          setManualHours(String(latest.total_hours || 160));
          setManualPeriod(latest.period || "");
        } else if (data.currentSalary > 0) {
          setCurrentNetSalary(data.currentSalary);
          setManualNet(String(data.currentSalary));
        }
      }
    } catch {
      // Fallback silencioso
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalary();
  }, []);

  // Al cambiar horas semanales, actualizar automáticamente las horas mensuales
  const handleWeeklyHoursChange = (val: string) => {
    setWeeklyHoursInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const monthlyEquiv = Math.round(num * 4.333);
      setManualHours(String(monthlyEquiv));
    }
  };

  const rates = calculateHourlyRates(currentNetSalary, currentHours);

  // Escaneo de recibo con IA
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setScanning(true);
    try {
      const res = await fetch("/api/payroll/scan", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo interpretar el recibo.");
      }

      if (data.data) {
        const { netSalary, grossSalary, totalHours, period } = data.data;
        setManualNet(String(netSalary));
        if (grossSalary) setManualGross(String(grossSalary));
        setManualHours(String(totalHours || 160));
        setManualPeriod(period || "");

        // Cambiar a pestaña manual con los datos precompletados para confirmación
        setActiveTab("manual");
        toast.success("¡Recibo leído con éxito! Revisa los montos detectados.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al procesar el recibo.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      setScanning(false);
    }
  };

  // Guardar sueldo (manual o extraído)
  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    const net = Number(manualNet);
    const gross = manualGross ? Number(manualGross) : undefined;
    const hours = Number(manualHours) || 160;
    const cutoffNum = parseInt(formCutoffDay, 10) || 25;

    if (!net || net <= 0) {
      toast.error("Por favor ingresa un sueldo neto válido.");
      return;
    }

    setLoading(true);
    try {
      // Guardar día de corte en configuración
      saveCutoffDay(cutoffNum);
      setCutoffDay(cutoffNum);

      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          net_salary: net,
          gross_salary: gross,
          total_hours: hours,
          period: manualPeriod || cycle.periodName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al guardar el sueldo.");
      }

      setSalaryRecord(data.record);
      setCurrentNetSalary(net);
      setCurrentHours(hours);
      onSalaryUpdated?.(net);
      setShowModal(false);
      toast.success("¡Sueldo y ciclo laboral actualizados!");
    } catch (err: any) {
      toast.error(err.message || "No se pudo guardar el registro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="relative rounded-3xl p-5 sm:p-7 bg-[#101419]/90 backdrop-blur-2xl border border-white/10 shadow-[0_16px_36px_-4px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.1)] overflow-hidden">
        {/* Glow sutil Stitch */}
        <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/10 blur-3xl pointer-events-none" />

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-emerald-400/15 border border-emerald-400/25 text-emerald-400 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(78,222,163,0.2)]">
              <Briefcase className="w-4 h-4 stroke-[2.4]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-white truncate">
                  Mi Sueldo & Cobro
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Ciclo corte día {cutoffDay}
                </span>
                {salaryRecord?.period && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-white/[0.05] text-neutral-300 border border-white/[0.08]">
                    {salaryRecord.period}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 truncate">
                Ciclo laboral activo: {cycle.label} ({cycle.periodName})
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="w-full sm:w-auto min-h-[46px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-bold text-neutral-200 transition-all cursor-pointer active:scale-95 shadow-sm"
              title="Ajustar o escanear recibo"
            >
              <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
              <span>Actualizar Sueldo & Horas</span>
            </button>
          </div>
        </div>

        {/* Cifra Principal: Sueldo en Mano */}
        <div className="mb-4">
          <p className="text-xs font-mono font-medium uppercase tracking-wider text-neutral-400 mb-1">
            Sueldo en Mano (Neto)
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl lg:text-5xl font-black font-mono tabular-nums tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-100 to-neutral-400 drop-shadow-sm">
              {isPrivate ? "$ ••••••" : formatCurrency(currentNetSalary, "ARS", true)}
            </span>
            <span className="text-xs font-mono text-emerald-400 font-semibold">/ mes</span>
          </div>
        </div>

        {/* Salary & Countdown HUD Bento Matrix (Google Stitch GEL-045) */}
        <div className="space-y-2.5">
          {/* Fecha de Cobro Countdown */}
          <div className="rounded-2xl p-4 bg-gradient-to-r from-neutral-900/90 to-neutral-950/90 border border-emerald-400/20 backdrop-blur-xl relative overflow-hidden flex items-center justify-between shadow-sm">
            <div className="relative z-10 min-w-0 pr-3">
              <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] uppercase tracking-wider mb-0.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Fecha de Cobro ({countdown.ruleDescription})</span>
              </div>
              <h4 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {countdown.isToday ? "¡Cobras Hoy!" : `Cobro en ${countdown.daysRemaining} ${countdown.daysRemaining === 1 ? "día" : "días"}`}
              </h4>
              <p className="font-mono text-xs text-neutral-400 truncate">
                Estimado: {countdown.dateString} · Acreditación directa
              </p>
            </div>
            <div className="relative z-10 text-right shrink-0">
              <div className="w-12 h-12 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 flex items-center justify-center shadow-[0_0_12px_rgba(78,222,163,0.25)]">
                <span className="font-mono text-xs font-bold text-emerald-400">
                  {countdown.isToday ? "HOY" : `${countdown.daysRemaining * 24}h`}
                </span>
              </div>
            </div>
          </div>

          {/* Tarjetas Bento Compactas: Hora Diurna vs Turno Noche */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {/* Hora Diurna */}
            <div className="rounded-2xl p-3.5 bg-neutral-900/50 border border-white/5 backdrop-blur-xl flex flex-col justify-between shadow-sm">
              <span className="font-mono text-xs text-neutral-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Hora Diurna
              </span>
              <div className="my-1.5">
                <span className="text-base sm:text-lg font-black font-mono text-white tabular-nums">
                  {isPrivate ? "$ •••" : formatCurrency(rates.hourlyRateNormal, "ARS", true)}
                </span>
                <span className="font-mono text-xs text-neutral-400">/h</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded w-fit border border-emerald-400/20">
                Base ({currentHours}hs/mes)
              </span>
            </div>

            {/* Turno Noche con LCT Art. 200 */}
            <div className="rounded-2xl p-3.5 bg-neutral-900/50 border border-indigo-500/20 backdrop-blur-xl flex flex-col justify-between shadow-sm">
              <span className="font-mono text-xs text-secondary flex items-center gap-1">
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                Turno Noche
              </span>
              <div className="my-1.5">
                <span className="text-base sm:text-lg font-black font-mono text-indigo-300 tabular-nums">
                  {isPrivate ? "$ •••" : formatCurrency(rates.hourlyRateNight, "ARS", true)}
                </span>
                <span className="font-mono text-xs text-neutral-400">/h</span>
              </div>
              <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded w-fit border border-indigo-500/30">
                +13.33% LCT Art. 200
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal / Bottom Sheet para Cargar o Ajustar Sueldo (GEL-047 Ergonomics) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="fixed inset-0" onClick={() => !scanning && !loading && setShowModal(false)} />

          <div className="relative w-full max-w-lg max-h-[85dvh] flex flex-col rounded-3xl bg-neutral-950 border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden z-10 animate-slide-up">
            {/* Header del Modal */}
            <div className="sticky top-0 bg-neutral-900/95 backdrop-blur-md z-10 px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  Actualizar Sueldo & Horas
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    LCT
                  </span>
                </h3>
                <p className="text-xs text-neutral-400">
                  Carga por IA o configuración manual de jornada y ciclo
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={scanning || loading}
                className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-400 hover:text-white bg-white/[0.04] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selector de Pestañas */}
            <div className="px-5 pt-3 pb-2 border-b border-white/[0.06] flex flex-col sm:flex-row gap-2.5 sm:gap-3 w-full shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("scan")}
                className={`w-full sm:w-auto flex-1 min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activeTab === "scan"
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm"
                    : "text-neutral-400 hover:text-neutral-200 bg-white/[0.02]"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Escanear con IA (Foto/PDF)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("manual")}
                className={`w-full sm:w-auto flex-1 min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activeTab === "manual"
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm"
                    : "text-neutral-400 hover:text-neutral-200 bg-white/[0.02]"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Ajuste Manual</span>
              </button>
            </div>

            {/* Contenido con Scroll Generoso */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4 pb-12 pr-1">
              {activeTab === "scan" ? (
                <div className="space-y-4 text-center">
                  <div className="p-6 sm:p-8 rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex flex-col items-center justify-center">
                    {scanning ? (
                      <div className="py-6 flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                        <p className="text-sm font-bold text-white">Analizando recibo de haberes con Gemini IA...</p>
                        <p className="text-xs text-neutral-400">Extrayendo sueldo en mano, descuentos y horas</p>
                      </div>
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-3">
                          <UploadCloud className="w-7 h-7" />
                        </div>
                        <h4 className="text-base font-bold text-white mb-1">
                          Sube tu Recibo de Sueldo
                        </h4>
                        <p className="text-xs text-neutral-400 max-w-xs mb-4">
                          Acepta fotos de cámara, capturas o archivos PDF oficiales
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 w-full max-w-xs justify-center">
                          <label className="w-full min-h-[46px] px-5 py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-xs uppercase tracking-wider hover:bg-emerald-400 transition-all cursor-pointer active:scale-95 shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2">
                            <UploadCloud className="w-4 h-4" />
                            <span>Seleccionar Archivo o Foto</span>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="application/pdf,image/png,image/jpeg,image/webp"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-left flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                      Tus datos son procesados de forma privada y encriptada. La IA lee el importe neto a cobrar para proyectar tu flujo de fondos y valores de hora.
                    </p>
                  </div>
                </div>
              ) : (
                <form id="salary-manual-form" onSubmit={handleSaveSalary} className="space-y-4">
                  {/* Sueldo Neto */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                      Sueldo en Mano (Neto a cobrar) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">$</span>
                      <input
                        type="number"
                        step="any"
                        required
                        value={manualNet}
                        onChange={(e) => setManualNet(e.target.value)}
                        placeholder="Ej: 980000"
                        className="w-full pl-8 pr-4 py-3 rounded-xl bg-neutral-900 border border-white/10 text-white font-mono font-bold text-base focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Selector de Tipo de Jornada: Semanales vs Mensuales */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                    <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider">
                      Tipo de Jornada Laboral
                    </label>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setScheduleType("weekly");
                          const num = parseFloat(weeklyHoursInput) || 44;
                          setManualHours(String(Math.round(num * 4.333)));
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          scheduleType === "weekly"
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                            : "bg-neutral-900 border-white/10 text-neutral-400 hover:text-white"
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                        <span>Horas Semanales</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setScheduleType("monthly")}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          scheduleType === "monthly"
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                            : "bg-neutral-900 border-white/10 text-neutral-400 hover:text-white"
                        }`}
                      >
                        <Repeat className="w-4 h-4" />
                        <span>Horas Mensuales Fijas</span>
                      </button>
                    </div>

                    {scheduleType === "weekly" ? (
                      <div className="space-y-1.5 pt-1">
                        <label className="block text-[11px] font-semibold text-neutral-400">
                          Horas de trabajo por semana (ej. 44 hs o 48 hs LCT):
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="any"
                            value={weeklyHoursInput}
                            onChange={(e) => handleWeeklyHoursChange(e.target.value)}
                            placeholder="44"
                            className="w-28 px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                          />
                          <span className="text-xs text-neutral-400">
                            hs/semana → <strong>~{manualHours} hs/mes</strong> (factor 4.333)
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 pt-1">
                        <label className="block text-[11px] font-semibold text-neutral-400">
                          Horas totales del mes (Base de liquidación):
                        </label>
                        <input
                          type="number"
                          value={manualHours}
                          onChange={(e) => setManualHours(e.target.value)}
                          placeholder="160"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Configuración de Día de Corte Laboral */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2">
                    <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider">
                      Día de Corte de Mes Laboral
                    </label>
                    <p className="text-[11px] text-neutral-400">
                      Tus horas se computan del día siguiente al corte (ej. día 26) hasta el día de corte (ej. día 25).
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-neutral-400 font-bold">Corte el día:</span>
                        <input
                          type="number"
                          min="1"
                          max="28"
                          value={formCutoffDay}
                          onChange={(e) => setFormCutoffDay(e.target.value)}
                          className="w-20 px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-white font-mono font-bold text-sm text-center focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <span className="text-xs text-emerald-400 font-mono">
                        (Default: día 25)
                      </span>
                    </div>
                  </div>

                  {/* Sueldo Bruto y Período */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                        Sueldo Bruto (Opcional)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs">$</span>
                        <input
                          type="number"
                          step="any"
                          value={manualGross}
                          onChange={(e) => setManualGross(e.target.value)}
                          placeholder="Antes de descuentos"
                          className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                        Período Liquidado
                      </label>
                      <input
                        type="text"
                        value={manualPeriod}
                        onChange={(e) => setManualPeriod(e.target.value)}
                        placeholder={cycle.periodName}
                        className="w-full px-3 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Previsualización en Vivo de Horas */}
                  {Number(manualNet) > 0 && (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-neutral-300 space-y-1 font-mono">
                      <p className="font-bold text-emerald-400">Previsualización de valores de hora:</p>
                      <p>• Hora Normal: {formatCurrency(Number(manualNet) / (Number(manualHours) || 160))}/h</p>
                      <p>• Hora Nocturna (LCT): {formatCurrency((Number(manualNet) / (Number(manualHours) || 160)) * 1.1333)}/h</p>
                      <p className="text-[11px] text-neutral-400">
                        • Cómputo laboral: Del {parseInt(formCutoffDay || "25", 10) + 1} del mes anterior al {formCutoffDay || "25"} de este mes
                      </p>
                    </div>
                  )}
                </form>
              )}
            </div>

            {/* Sticky Action Footer (GEL-047 No-Overlapping Ergonomics) */}
            <div className="sticky bottom-0 bg-neutral-900/95 backdrop-blur-md pt-3 pb-3 px-5 border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={loading || scanning}
                className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-neutral-300 transition-all cursor-pointer"
              >
                Cancelar
              </button>

              {activeTab === "manual" && (
                <button
                  type="submit"
                  form="salary-manual-form"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 text-black font-extrabold text-xs uppercase tracking-wider hover:bg-emerald-400 transition-all cursor-pointer active:scale-95 shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                  <span>Guardar Configuración</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
