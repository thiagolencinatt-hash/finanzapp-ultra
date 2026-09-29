"use client";

import { useState, useEffect, useRef } from "react";
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
  Plus, 
  ChevronRight, 
  Trash2, 
  AlertCircle,
  CalendarCheck
} from "lucide-react";
import { toast } from "sonner";
import type { WorkShift, CoworkerOverlap } from "@/lib/types";

export function WorkScheduleCard() {
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de escaneo IA
  const [scannedShifts, setScannedShifts] = useState<WorkShift[]>([]);
  const [detectedEmployees, setDetectedEmployees] = useState<string[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [lastUploadedFile, setLastUploadedFile] = useState<File | null>(null);

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
        toast.success(`¡Planilla leída! ${data.shifts.length} turnos detectados.`);
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

  // Encontrar el próximo turno
  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingShift = shifts.find((s) => s.shift_date >= todayStr) || shifts[0];
  const isShiftToday = upcomingShift?.shift_date === todayStr;

  return (
    <>
      <div className="relative rounded-3xl p-5 sm:p-7 bg-gradient-to-b from-neutral-900/80 to-neutral-950/80 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.08)] overflow-hidden">
        {/* Glow sutil */}
        <div className="absolute -top-16 -left-16 w-52 h-52 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        {/* Encabezado */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-blue-500/15 border border-blue-500/25 text-blue-400 flex items-center justify-center shrink-0">
              <CalendarDays className="w-4 h-4 stroke-[2.4]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white truncate">
                Mis Horarios de Trabajo
              </h3>
              <p className="text-xs text-neutral-400">
                Planilla de turnos, nocturnidad y compañeros
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-bold text-neutral-200 transition-all cursor-pointer active:scale-95 shrink-0 shadow-sm"
            title="Subir foto de planilla"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden xs:inline">Subir Planilla</span>
          </button>
        </div>

        {/* Resumen del Próximo Turno */}
        {upcomingShift ? (
          <div className="p-3.5 rounded-2xl bg-blue-500/[0.06] border border-blue-500/20 mb-4 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                  Próximo turno:{" "}
                  <span className="text-blue-400 font-mono">
                    {isShiftToday ? "Hoy" : upcomingShift.day_name || upcomingShift.shift_date} de {upcomingShift.start_time} a {upcomingShift.end_time}
                  </span>
                </p>
                <p className="text-[11px] text-neutral-400 truncate">
                  {upcomingShift.total_hours} hs totales • {upcomingShift.night_hours > 0 ? `🌙 ${upcomingShift.night_hours} hs nocturnas` : "Jornada diurna"}
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold shrink-0 bg-blue-500/15 text-blue-300 border border-blue-500/30">
              {upcomingShift.start_time} hs
            </span>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] mb-4 text-center">
            <p className="text-xs text-neutral-400 mb-2">No tienes turnos cargados para esta semana.</p>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-xl bg-blue-500/15 text-blue-300 border border-blue-500/30 text-xs font-bold hover:bg-blue-500/25 transition-all cursor-pointer active:scale-95"
            >
              📅 Cargar foto o PDF de turnos
            </button>
          </div>
        )}

        {/* Lista de Turnos Semanales */}
        {shifts.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-medium uppercase tracking-wider px-1">
              <span>Cronograma Asignado</span>
              <span className="text-[10px] lowercase font-mono">{shifts.length} días</span>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {shifts.map((shift) => (
                <div
                  key={shift.id}
                  className="p-3.5 rounded-2xl bg-neutral-900/60 border border-white/[0.08] hover:border-white/15 transition-all shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08]">
                        {shift.day_name || shift.shift_date}
                      </span>
                      <span className="text-sm font-mono font-black text-white">
                        {shift.start_time} - {shift.end_time}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono font-bold text-neutral-300 px-2 py-0.5 rounded-full bg-white/[0.04]">
                        {shift.total_hours} hs
                      </span>
                      {shift.night_hours > 0 && (
                        <span className="text-[10px] font-mono font-bold text-amber-300 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">
                          🌙 {shift.night_hours}h
                        </span>
                      )}
                      <button
                        onClick={(e) => handleDeleteShift(shift.id, e)}
                        className="p-1 text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Eliminar turno"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Sección de Compañeros que coinciden */}
                  {Array.isArray(shift.coworkers_overlap) && shift.coworkers_overlap.length > 0 && (
                    <div className="pt-2 border-t border-white/[0.05]">
                      <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Users className="w-3 h-3 text-blue-400" />
                        Coincidencia con compañeros:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {shift.coworkers_overlap.map((coworker, cIdx) => (
                          <div
                            key={cIdx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] text-neutral-300"
                            title={coworker.their_shift ? `Turno de ${coworker.name}: ${coworker.their_shift}` : undefined}
                          >
                            <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-300 font-bold text-[9px] flex items-center justify-center">
                              {coworker.name.charAt(0).toUpperCase()}
                            </span>
                            <span className="font-semibold text-white">{coworker.name}</span>
                            <span className="text-neutral-400 text-[10px]">
                              ({coworker.overlap_hours} hs)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal / Bottom Sheet para Subir Planilla */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="fixed inset-0" onClick={() => !scanning && setShowModal(false)} />

          <div className="relative w-full max-w-lg max-h-[88dvh] flex flex-col rounded-3xl bg-neutral-950 border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden z-10 animate-slide-up">
            {/* Header del Modal */}
            <div className="sticky top-0 bg-neutral-900/95 backdrop-blur-md z-10 px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Planilla de Horarios & Turnos
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    IA OCR
                  </span>
                </h3>
                <p className="text-xs text-neutral-400">
                  Lectura inteligente de cuadrantes, pizarras y documentos
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

            {/* Contenido del Modal */}
            <div className="p-5 overflow-y-auto space-y-4">
              {scannedShifts.length === 0 ? (
                <div className="space-y-4 text-center">
                  <div className="p-6 sm:p-8 rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex flex-col items-center justify-center">
                    {scanning ? (
                      <div className="py-6 flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                        <p className="text-sm font-bold text-white">Analizando planilla de turnos con Gemini IA...</p>
                        <p className="text-xs text-neutral-400">Detectando horarios, nocturnidad y cruce con compañeros</p>
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
                        <label className="px-5 py-3 rounded-xl bg-blue-500 text-black font-bold text-xs uppercase tracking-wider hover:bg-blue-400 transition-all cursor-pointer active:scale-95 shadow-md shadow-blue-500/20">
                          Seleccionar Planilla o Foto
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="application/pdf,image/png,image/jpeg,image/webp"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
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

                  {/* Previsualización de Turnos */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {scannedShifts.map((s, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-neutral-900/80 border border-white/10 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{s.day_name || s.shift_date}</span>
                          <span className="font-mono font-bold text-blue-400">{s.start_time} - {s.end_time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-neutral-400 text-[11px]">
                          <span>{s.total_hours} hs</span>
                          {s.night_hours > 0 && <span className="text-amber-300">🌙 {s.night_hours}h nocturnas</span>}
                          {s.coworkers_overlap.length > 0 && (
                            <span className="text-emerald-400">
                              👥 {s.coworkers_overlap.map((c) => c.name).join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveShifts}
                    disabled={saving}
                    className="w-full py-3.5 rounded-xl bg-blue-500 text-black font-extrabold text-sm uppercase tracking-wider hover:bg-blue-400 transition-all cursor-pointer active:scale-95 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                    <span>Confirmar y Guardar Cronograma</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
