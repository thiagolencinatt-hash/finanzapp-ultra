"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { 
  CalendarDays, 
  Clock, 
  Moon, 
  Users, 
  UploadCloud, 
  Sparkles, 
  X, 
  Loader2, 
  Check, 
  Trash2, 
  RotateCcw,
  Coffee,
  SlidersHorizontal
} from "lucide-react";
import { toast } from "sonner";
import { getWorkCycleRange, getSavedCutoffDay } from "@/lib/utils/payroll-calculator";
import type { WorkShift, CoworkerOverlap } from "@/lib/types";

export function WorkScheduleCard() {
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Jornada semanal pactada (por defecto 44 hs LCT Argentina o configurable)
  const [targetWeeklyHours, setTargetWeeklyHours] = useState<number>(44);
  const [cutoffDay, setCutoffDay] = useState<number>(25);

  // Estados de escaneo IA
  const [scannedShifts, setScannedShifts] = useState<WorkShift[]>([]);
  const [detectedEmployees, setDetectedEmployees] = useState<string[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [lastUploadedFile, setLastUploadedFile] = useState<File | null>(null);

  // Cargar jornada pactada y corte de localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("finanzapp_target_weekly_hours");
      if (stored) {
        const val = Number(stored);
        if (val > 0) setTargetWeeklyHours(val);
      }
      setCutoffDay(getSavedCutoffDay());
    } catch {
      // ignore
    }

    const handlePayrollUpdated = () => {
      setCutoffDay(getSavedCutoffDay());
    };
    window.addEventListener("finance-payroll-updated", handlePayrollUpdated);
    return () => window.removeEventListener("finance-payroll-updated", handlePayrollUpdated);
  }, []);

  const cycle = useMemo(() => {
    return getWorkCycleRange(new Date(), cutoffDay);
  }, [cutoffDay]);

  const handleTargetChange = (val: number) => {
    setTargetWeeklyHours(val);
    try {
      localStorage.setItem("finanzapp_target_weekly_hours", String(val));
    } catch {
      // ignore
    }
  };

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/shifts", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
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
    fetchShifts();
  }, []);

  // Escanear planilla
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLastUploadedFile(file);
    await processFile(file);
  };

  const processFile = async (file: File, targetEmp?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (targetEmp) {
      formData.append("targetEmployee", targetEmp);
    }

    setScanning(true);
    try {
      const res = await fetch("/api/shifts/scan", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo interpretar la planilla de turnos.");
      }

      if (Array.isArray(data.shifts) && data.shifts.length > 0) {
        setScannedShifts(data.shifts);
        setDetectedEmployees(data.detectedEmployees || []);
        setSelectedEmployee(data.selectedEmployee || targetEmp || "");
        toast.success(`¡Planilla leída! ${data.shifts.length} días detectados.`);
      } else {
        toast.warning("No se encontraron turnos claros en este documento.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al procesar la planilla.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      setScanning(false);
    }
  };

  // Re-procesar con otro empleado seleccionado
  const handleSelectEmployee = (empName: string) => {
    setSelectedEmployee(empName);
    if (lastUploadedFile) {
      processFile(lastUploadedFile, empName);
    }
  };

  // Guardar turnos confirmados
  const handleSaveShifts = async () => {
    if (scannedShifts.length === 0) return;

    setSaving(true);
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shifts: scannedShifts }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al guardar el cronograma.");
      }

      setShifts(data.shifts);
      setShowModal(false);
      setScannedShifts([]);
      toast.success("¡Cronograma de horarios guardado exitosamente!");
    } catch (err: any) {
      toast.error(err.message || "No se pudo guardar el cronograma.");
    } finally {
      setSaving(false);
    }
  };

  // Eliminar un turno
  const handleDeleteShift = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/shifts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) {
        setShifts((prev) => prev.filter((s) => s.id !== id));
        toast.success("Turno eliminado");
      }
    } catch {
      toast.error("Error al eliminar turno");
    }
  };

  // Días de la semana estándar
  const WEEK_DAYS = [
    { key: "lunes", name: "Lunes", short: "Lun" },
    { key: "martes", name: "Martes", short: "Mar" },
    { key: "miercoles", name: "Miércoles", short: "Mié" },
    { key: "jueves", name: "Jueves", short: "Jue" },
    { key: "viernes", name: "Viernes", short: "Vie" },
    { key: "sabado", name: "Sábado", short: "Sáb" },
    { key: "domingo", name: "Domingo", short: "Dom" },
  ];

  // Helper para normalizar nombres de día sin acentos
  const normalizeDay = (str?: string) =>
    (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // Construir cronograma semanal (Lunes a Domingo) ordenado
  const weeklySchedule = useMemo(() => {
    if (shifts.length === 0) return [];

    const sortedShifts = [...shifts].sort((a, b) => a.shift_date.localeCompare(b.shift_date));
    const firstDateStr = sortedShifts[0]?.shift_date;
    const refDate = firstDateStr ? new Date(`${firstDateStr}T12:00:00`) : new Date();

    // Obtener el Lunes de esa semana
    const dayOfWeek = (refDate.getDay() + 6) % 7; // 0=Lunes, 6=Domingo
    const monday = new Date(refDate);
    monday.setDate(refDate.getDate() - dayOfWeek);

    const todayStr = new Date().toISOString().split("T")[0];

    return WEEK_DAYS.map((dayDef, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const dateStr = d.toISOString().split("T")[0];
      const formattedDate = d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
      const isToday = dateStr === todayStr;

      // Buscar coincidencia por fecha o por nombre del día
      const shift = shifts.find(
        (s) => s.shift_date === dateStr || normalizeDay(s.day_name) === dayDef.key
      );

      const isRestDay = !shift || 
        Boolean(shift.is_rest_day) || 
        shift.start_time?.toLowerCase().includes("franco") || 
        shift.notes?.toLowerCase().includes("franco") ||
        (shift.total_hours === 0 && (!shift.start_time || shift.start_time === "Franco"));

      return {
        dayDef,
        dateStr,
        formattedDate,
        isToday,
        shift: shift || null,
        isRestDay,
      };
    });
  }, [shifts]);

  // Totales de la semana
  const totalWeeklyHours = useMemo(() => {
    return shifts
      .filter((s) => !s.is_rest_day && s.start_time !== "Franco")
      .reduce((sum, s) => sum + (Number(s.total_hours) || 0), 0);
  }, [shifts]);

  const totalWeeklyNightHours = useMemo(() => {
    return shifts
      .filter((s) => !s.is_rest_day && s.start_time !== "Franco")
      .reduce((sum, s) => sum + (Number(s.night_hours) || 0), 0);
  }, [shifts]);

  const totalRestDays = useMemo(() => {
    if (shifts.length === 0) return 0;
    return weeklySchedule.filter((item) => item.isRestDay).length;
  }, [shifts, weeklySchedule]);

  // Próximo turno o descanso
  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingShift = shifts.find(
    (s) => s.shift_date >= todayStr && !s.is_rest_day && s.start_time !== "Franco" && s.total_hours > 0
  ) || shifts.find((s) => !s.is_rest_day && s.start_time !== "Franco" && s.total_hours > 0);
  
  const todayScheduleItem = weeklySchedule.find((item) => item.isToday);
  const isTodayRestDay = todayScheduleItem?.isRestDay ?? false;
  const isShiftToday = upcomingShift?.shift_date === todayStr && !isTodayRestDay;

  return (
    <>
      <div className="relative rounded-3xl p-5 sm:p-7 bg-[#101419]/90 backdrop-blur-2xl border border-white/10 shadow-[0_16px_36px_-4px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.1)] overflow-hidden">
        {/* Glow sutil Stitch */}
        <div className="absolute -top-16 -left-16 w-52 h-52 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-52 h-52 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />

        {/* Encabezado Mobile-First sin superposición */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(99,102,241,0.2)]">
              <CalendarDays className="w-4 h-4 stroke-[2.4]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-white truncate">
                  Mis Horarios de Trabajo
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Ciclo: {cycle.shortLabel}
                </span>
              </div>
              <p className="text-xs text-neutral-400 truncate">
                Planilla semanal, cómputo al día {cycle.cutoffDay} y compañeros de turno
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="w-full sm:w-auto min-h-[46px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-xs font-bold text-blue-300 transition-all cursor-pointer active:scale-95 shadow-sm"
              title="Subir foto o PDF de planilla"
            >
              <UploadCloud className="w-4 h-4 text-blue-400" />
              <span>Subir Planilla</span>
            </button>
          </div>
        </div>

        {/* Métrica destacada: Horas Semanales & Franco (GEL-043) */}
        {shifts.length > 0 && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-neutral-900/80 border border-white/10 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Clock className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                  <span className="text-neutral-300">⏱️ Total semana:</span>
                  <span className="text-blue-400 font-mono font-extrabold">{totalWeeklyHours} hs trabajadas</span>
                  <span className="text-neutral-500 hidden sm:inline">•</span>
                  <span className="text-amber-300 font-mono font-bold flex items-center gap-1">
                    🌙 {totalWeeklyNightHours} hs nocturnas
                  </span>
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Jornada pactada: {targetWeeklyHours} hs/sem • {totalRestDays} {totalRestDays === 1 ? "franco" : "francos"} detectados
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <label className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                Meta:
              </label>
              <select
                value={targetWeeklyHours}
                onChange={(e) => handleTargetChange(Number(e.target.value))}
                className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono font-bold text-neutral-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                title="Configurar jornada pactada semanal"
              >
                <option value={40} className="bg-neutral-900 text-white">40 hs / semana</option>
                <option value={44} className="bg-neutral-900 text-white">44 hs (LCT)</option>
                <option value={48} className="bg-neutral-900 text-white">48 hs / semana</option>
                <option value={36} className="bg-neutral-900 text-white">36 hs / semana</option>
              </select>
            </div>
          </div>
        )}

        {/* Resumen del Próximo Turno / Estado de Hoy */}
        {shifts.length > 0 ? (
          <div className="p-3.5 rounded-2xl bg-blue-500/[0.06] border border-blue-500/20 mb-4 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                {isTodayRestDay ? <Coffee className="w-4 h-4 text-indigo-400" /> : <Clock className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                {isTodayRestDay ? (
                  <>
                    <p className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                      🏖️ <span className="text-indigo-300 font-bold">¡Hoy estás de Franco!</span> (Día de descanso)
                    </p>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {upcomingShift
                        ? `Próximo turno: ${upcomingShift.day_name || upcomingShift.shift_date} de ${upcomingShift.start_time} a ${upcomingShift.end_time}`
                        : "Disfruta de tu descanso semanal"}
                    </p>
                  </>
                ) : upcomingShift ? (
                  <>
                    <p className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                      Próximo turno:{" "}
                      <span className="text-blue-400 font-mono">
                        {isShiftToday ? "Hoy" : upcomingShift.day_name || upcomingShift.shift_date} de {upcomingShift.start_time} a {upcomingShift.end_time}
                      </span>
                    </p>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {upcomingShift.total_hours} hs totales • {upcomingShift.night_hours > 0 ? `🌙 ${upcomingShift.night_hours} hs nocturnas` : "Jornada diurna"}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-neutral-300">Semana completada.</p>
                )}
              </div>
            </div>

            {upcomingShift && !isTodayRestDay && (
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold shrink-0 bg-blue-500/15 text-blue-300 border border-blue-500/30">
                {upcomingShift.start_time} hs
              </span>
            )}
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] mb-4 text-center space-y-3">
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              No tienes turnos cargados. Sube una foto de la pizarra de horarios o documento PDF para armar tu semana en 1 segundo.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 w-full justify-center">
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="w-full sm:w-auto min-h-[46px] px-5 py-2.5 rounded-xl bg-blue-500 text-black font-extrabold text-xs uppercase tracking-wider hover:bg-blue-400 transition-all cursor-pointer active:scale-95 shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Cargar foto o PDF de turnos</span>
              </button>
            </div>
          </div>
        )}

        {/* Vista Semanal Completa: Lunes a Domingo (Google Stitch GEL-045) */}
        {shifts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-medium uppercase tracking-wider px-1">
              <span className="flex items-center gap-1.5 text-primary font-mono text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Cronograma & Turnos
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-neutral-400">
                7 DÍAS
              </span>
            </div>

            {/* 3D Weekly Shift Matrix (Horizontal Scrollable Carousel) */}
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-2 -mx-2 px-2">
              {weeklySchedule.map((item, idx) => {
                const { dayDef, dateStr, formattedDate, isToday, shift, isRestDay } = item;

                if (isRestDay) {
                  return (
                    <div
                      key={`car-${dateStr || idx}`}
                      className="min-w-[120px] rounded-2xl p-3 bg-gradient-to-b from-indigo-950/40 to-neutral-900 border border-indigo-400/40 backdrop-blur-xl flex flex-col justify-between shadow-[0_0_20px_rgba(208,188,255,0.15)] relative overflow-hidden shrink-0"
                    >
                      <div className="absolute -top-6 -right-6 w-14 h-14 bg-indigo-400/20 rounded-full blur-md" />
                      <div className="flex justify-between items-center font-mono text-[11px] text-indigo-300 font-bold relative z-10">
                        <span>{dayDef.short.toUpperCase()} {formattedDate.split(" ")[0]}</span>
                        <span className="text-sm">🏖️</span>
                      </div>
                      <div className="my-2 relative z-10">
                        <span className="text-xs font-bold text-white block">Franco</span>
                        <span className="text-[10px] font-mono text-indigo-200/70">Descanso</span>
                      </div>
                      <span className="text-[9px] font-mono text-indigo-300 font-bold bg-indigo-500/20 py-0.5 rounded text-center relative z-10 border border-indigo-400/20">
                        {isToday ? "HOY · LIBRE" : "Desconexión"}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={`car-${shift?.id || dateStr || idx}`}
                    className={`min-w-[110px] rounded-2xl p-3 bg-neutral-900/80 border ${
                      isToday ? "border-emerald-400/40 shadow-[0_0_15px_rgba(78,222,163,0.15)]" : "border-white/5"
                    } backdrop-blur-xl flex flex-col justify-between shadow-sm shrink-0`}
                  >
                    <div className="flex justify-between items-center font-mono text-[11px] text-neutral-400">
                      <span>{dayDef.short.toUpperCase()} {formattedDate.split(" ")[0]}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${shift?.night_hours ? "bg-indigo-400" : "bg-emerald-400"}`} />
                    </div>
                    <div className="my-2">
                      <span className="text-xs font-semibold text-white block truncate">
                        {shift?.night_hours ? "Nocturno" : "Diurno"}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400 font-medium">
                        {shift?.start_time} - {shift?.end_time}
                      </span>
                    </div>
                    <span className={`text-[9px] font-mono ${
                      shift?.night_hours ? "text-indigo-300 bg-indigo-500/15" : "text-emerald-400 bg-emerald-400/10"
                    } px-1 py-0.5 rounded text-center`}>
                      {shift?.total_hours}hs computadas
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Lista detallada con compañeros */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {weeklySchedule.map((item, idx) => {
                const { dayDef, dateStr, formattedDate, isToday, shift, isRestDay } = item;

                if (isRestDay) {
                  // Tarjeta distintiva de FRANCO SEMANAL (GEL-043 / GEL-045)
                  return (
                    <div
                      key={dateStr || idx}
                      className={`p-4 rounded-2xl bg-gradient-to-b from-indigo-950/40 to-neutral-900 border border-indigo-400/40 shadow-[0_0_20px_rgba(208,188,255,0.15)] relative overflow-hidden backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all`}
                    >
                      <div className="absolute -top-6 -right-6 w-16 h-16 bg-indigo-400/20 rounded-full blur-md" />
                      <div className="flex items-center gap-2.5 relative z-10">
                        <span className="font-semibold text-white text-sm">
                          {dayDef.name}
                        </span>
                        <span className="text-xs text-indigo-300 font-mono">
                          {formattedDate}
                        </span>
                        {isToday && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                            Hoy
                          </span>
                        )}
                      </div>

                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold self-start sm:self-auto shadow-sm relative z-10">
                        <span>🏖️</span>
                        <span>Franco semanal (Día de descanso)</span>
                      </div>
                    </div>
                  );
                }

                // Tarjeta de Día Laborable Pulida (GEL-043 / GEL-045)
                return (
                  <div
                    key={shift?.id || dateStr || idx}
                    className={`p-4 rounded-2xl bg-neutral-900/80 border ${
                      isToday
                        ? "border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30"
                        : "border-white/5"
                    } hover:border-white/15 backdrop-blur-xl transition-all shadow-sm space-y-2.5`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      {/* Izquierda: Nombre del día y fecha */}
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">
                          {shift?.day_name || dayDef.name}
                        </span>
                        <span className="text-xs text-neutral-400 font-mono">
                          {formattedDate}
                        </span>
                        {isToday && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                            Hoy
                          </span>
                        )}
                      </div>

                      {/* Centro / Horario + Badge de Horas */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-mono font-black text-white">
                          {shift?.start_time} a {shift?.end_time}
                        </span>
                        <span className="text-xs font-mono font-bold text-neutral-200 px-2.5 py-0.5 rounded-lg bg-white/[0.06] border border-white/[0.08]">
                          {shift?.total_hours} hs
                        </span>
                        {shift && shift.night_hours > 0 && (
                          <span className="text-[11px] font-mono font-bold text-indigo-300 px-2 py-0.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center gap-1">
                            🌙 {shift.night_hours} hs
                          </span>
                        )}
                        {shift?.id && (
                          <button
                            onClick={(e) => handleDeleteShift(shift.id, e)}
                            className="p-1.5 text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer rounded-lg hover:bg-white/[0.04]"
                            title="Eliminar turno"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Derecha / Abajo: Chips de compañeros que coinciden en el turno */}
                    {shift && Array.isArray(shift.coworkers_overlap) && shift.coworkers_overlap.length > 0 && (
                      <div className="pt-2 border-t border-white/[0.05]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-mono text-neutral-400 flex items-center gap-1 mr-1">
                            <Users className="w-3 h-3 text-indigo-400" />
                            Coinciden:
                          </span>
                          {shift.coworkers_overlap.map((coworker, cIdx) => (
                            <div
                              key={cIdx}
                              className="bg-[#0b0e13]/80 border border-white/10 px-2.5 py-1 rounded-full shadow-inner inline-flex items-center gap-1.5"
                              title={coworker.their_shift ? `Turno de ${coworker.name}: ${coworker.their_shift}` : undefined}
                            >
                              <div className="w-5 h-5 rounded-full bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center text-[10px] font-bold text-emerald-300">
                                {coworker.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-white text-xs">{coworker.name}</span>
                              <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                                • {coworker.overlap_hours}hs compartidas
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal / Bottom Sheet para Subir Planilla (Mobile-First sin superposición) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="fixed inset-0" onClick={() => !scanning && !saving && setShowModal(false)} />

          <div className="relative w-full max-w-lg max-h-[85dvh] flex flex-col rounded-3xl bg-neutral-950 border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden z-10 animate-slide-up">
            {/* Header del Modal */}
            <div className="sticky top-0 bg-neutral-900/95 backdrop-blur-md z-10 px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Planilla de Horarios & Turnos
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    IA OCR
                  </span>
                </h3>
                <p className="text-xs text-neutral-400">
                  Lectura inteligente de cuadrantes, pizarras y francos
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={scanning || saving}
                className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-400 hover:text-white bg-white/[0.04] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido del Modal con Scroll */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4 pb-12 pr-1">
              {scannedShifts.length === 0 ? (
                <div className="space-y-4 text-center">
                  <div className="p-6 sm:p-8 rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex flex-col items-center justify-center">
                    {scanning ? (
                      <div className="py-6 flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                        <p className="text-sm font-bold text-white">Analizando planilla de turnos con Gemini IA...</p>
                        <p className="text-xs text-neutral-400">Detectando horarios, francos y cruce con compañeros</p>
                      </div>
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center mb-3">
                          <CalendarDays className="w-7 h-7" />
                        </div>
                        <h4 className="text-base font-bold text-white mb-1">
                          Sube la Foto o PDF de tus Horarios
                        </h4>
                        <p className="text-xs text-neutral-400 max-w-xs mb-4">
                          Puede ser una foto de la pizarra del trabajo, una planilla impresa o archivo digital
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 w-full max-w-xs justify-center">
                          <label className="w-full min-h-[46px] px-5 py-2.5 rounded-xl bg-blue-500 text-black font-extrabold text-xs uppercase tracking-wider hover:bg-blue-400 transition-all cursor-pointer active:scale-95 shadow-md shadow-blue-500/20 flex items-center justify-center gap-2">
                            <UploadCloud className="w-4 h-4" />
                            <span>Seleccionar Planilla o Foto</span>
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
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selector de Empleado (Si la planilla contiene varios nombres) */}
                  {detectedEmployees.length > 1 && (
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2">
                      <p className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                        ¿De quién son estos turnos? Elige tu nombre:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {detectedEmployees.map((emp) => (
                          <button
                            key={emp}
                            type="button"
                            onClick={() => handleSelectEmployee(emp)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              selectedEmployee.toLowerCase().includes(emp.toLowerCase())
                                ? "bg-blue-500 text-black shadow-md shadow-blue-500/20"
                                : "bg-neutral-900 border border-white/10 text-neutral-300 hover:text-white"
                            }`}
                          >
                            {emp}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">
                      Turnos Extraídos ({scannedShifts.length})
                    </h4>
                    <button
                      type="button"
                      onClick={() => setScannedShifts([])}
                      className="text-xs text-neutral-400 hover:text-white underline cursor-pointer"
                    >
                      Escanear otra foto
                    </button>
                  </div>

                  {/* Previsualización de Turnos con Francos */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {scannedShifts.map((s, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border space-y-1.5 text-xs ${
                          s.is_rest_day
                            ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-300"
                            : "bg-neutral-900/80 border-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{s.day_name || s.shift_date}</span>
                          {s.is_rest_day ? (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-bold text-[11px]">
                              🏖️ Franco semanal
                            </span>
                          ) : (
                            <span className="font-mono font-bold text-blue-400">
                              {s.start_time} - {s.end_time}
                            </span>
                          )}
                        </div>

                        {!s.is_rest_day && (
                          <div className="flex items-center gap-2 text-neutral-400 text-[11px]">
                            <span>{s.total_hours} hs</span>
                            {s.night_hours > 0 && <span className="text-amber-300">🌙 {s.night_hours}h nocturnas</span>}
                            {Array.isArray(s.coworkers_overlap) && s.coworkers_overlap.length > 0 && (
                              <span className="text-emerald-400 truncate">
                                👥 {s.coworkers_overlap.map((c) => c.name).join(", ")}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Action Footer (GEL-047 No-Overlapping Ergonomics) */}
            {scannedShifts.length > 0 && (
              <div className="sticky bottom-0 bg-neutral-900/95 backdrop-blur-md pt-3 pb-3 px-5 border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setScannedShifts([])}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-bold text-neutral-300 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Escanear otra</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveShifts}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-blue-500 text-black font-extrabold text-xs uppercase tracking-wider hover:bg-blue-400 transition-all cursor-pointer active:scale-95 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                  <span>Guardar Horarios</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
