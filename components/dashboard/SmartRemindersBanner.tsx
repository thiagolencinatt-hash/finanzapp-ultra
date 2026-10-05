"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Bell, 
  Clock, 
  Calendar, 
  Check, 
  X, 
  Sparkles, 
  ChevronRight, 
  AlertCircle,
  SlidersHorizontal,
  CalendarCheck,
  Building2
} from "lucide-react";
import { 
  getNextPaymentCountdown, 
  getSavedPaymentRule, 
  savePaymentRule, 
  PaymentRuleConfig,
  PaymentRuleType 
} from "@/lib/utils/payroll-calculator";
import { toast } from "sonner";
import type { WorkShift } from "@/lib/types";

interface SmartRemindersBannerProps {
  onNavigateTab?: (tab: string) => void;
}

export function SmartRemindersBanner({ onNavigateTab }: SmartRemindersBannerProps) {
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  
  // Regla actual de cobro
  const [ruleType, setRuleType] = useState<PaymentRuleType>("fifth_business_day");
  const [fixedDay, setFixedDay] = useState<number>(10);
  const [businessDayNumber, setBusinessDayNumber] = useState<number>(5);
  const [triggerUpdate, setTriggerUpdate] = useState(0);

  useEffect(() => {
    fetch("/api/shifts")
      .then((res) => (res.ok ? res.json() : { shifts: [] }))
      .then((data) => {
        if (Array.isArray(data.shifts)) {
          setShifts(data.shifts);
        }
      })
      .catch(() => {});

    const rule = getSavedPaymentRule();
    setRuleType(rule.type);
    if (rule.fixedDay) setFixedDay(rule.fixedDay);
    if (rule.businessDayNumber) setBusinessDayNumber(rule.businessDayNumber);

    const handleUpdate = () => {
      const r = getSavedPaymentRule();
      setRuleType(r.type);
      if (r.fixedDay) setFixedDay(r.fixedDay);
      if (r.businessDayNumber) setBusinessDayNumber(r.businessDayNumber);
      setTriggerUpdate((p) => p + 1);
    };

    window.addEventListener("finance-payroll-updated", handleUpdate);
    return () => window.removeEventListener("finance-payroll-updated", handleUpdate);
  }, []);

  const countdown = useMemo(() => {
    return getNextPaymentCountdown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerUpdate]);

  // Previsualización para el modal de configuración de cobro
  const previewCountdown = useMemo(() => {
    const draftRule: PaymentRuleConfig = {
      type: ruleType,
      fixedDay: ruleType === "fixed_day" ? fixedDay : undefined,
      businessDayNumber: ruleType === "nth_business_day" ? businessDayNumber : (ruleType === "fifth_business_day" ? 5 : undefined),
    };
    return getNextPaymentCountdown(new Date(), draftRule);
  }, [ruleType, fixedDay, businessDayNumber]);

  const handleSavePaymentRule = () => {
    const config: PaymentRuleConfig = {
      type: ruleType,
      fixedDay: ruleType === "fixed_day" ? fixedDay : undefined,
      businessDayNumber: ruleType === "nth_business_day" ? businessDayNumber : (ruleType === "fifth_business_day" ? 5 : undefined),
    };
    savePaymentRule(config);
    setPaymentModalOpen(false);
    toast.success("¡Regla de cobro actualizada exitosamente!");
  };

  // Encontrar turno de hoy y de mañana
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const todayShift = shifts.find((s) => s.shift_date === todayStr);
  const tomorrowShift = shifts.find((s) => s.shift_date === tomorrowStr);

  const alerts: Array<{
    id: string;
    icon: string;
    title: string;
    subtitle: string;
    type: "cobro" | "turno" | "franco";
    actionLabel?: string;
    targetTab?: string;
    interactiveCobro?: boolean;
  }> = [];

  // Alerta de Cobro (si es hoy o faltan 7 días o menos, o aviso permanente de regla)
  if (countdown.isToday) {
    alerts.push({
      id: "cobro-hoy",
      icon: "🎉",
      title: `¡Cobras Hoy según tu regla (${countdown.ruleDescription})!`,
      subtitle: `Acreditación estimada de haberes activa (${countdown.dateString}) · Toca para ajustar regla`,
      type: "cobro",
      actionLabel: "Ajustar Día",
      interactiveCobro: true,
    });
  } else if (countdown.daysRemaining <= 5) {
    alerts.push({
      id: `cobro-countdown-${countdown.daysRemaining}`,
      icon: "💰",
      title: `Aviso de Cobro: ${countdown.daysRemaining === 1 ? "Mañana" : `Faltan ${countdown.daysRemaining} días`} (${countdown.dateString})`,
      subtitle: `${countdown.ruleDescription} · Toca para configurar cuándo cobras`,
      type: "cobro",
      actionLabel: "Configurar",
      interactiveCobro: true,
    });
  }

  // Alerta de Turno de Mañana
  if (tomorrowShift) {
    if (tomorrowShift.is_rest_day || tomorrowShift.start_time === "Franco") {
      alerts.push({
        id: "franco-manana",
        icon: "🏖️",
        title: "Mañana tienes tu Franco semanal programado",
        subtitle: "Día de descanso libre asignado en tu planilla de horarios",
        type: "franco",
        actionLabel: "Ver Horarios",
        targetTab: "trabajo",
      });
    } else {
      alerts.push({
        id: "turno-manana",
        icon: "⏰",
        title: `Recordatorio: Mañana trabajas de ${tomorrowShift.start_time} a ${tomorrowShift.end_time}`,
        subtitle: `${tomorrowShift.total_hours} hs asignadas${tomorrowShift.night_hours > 0 ? ` • 🌙 ${tomorrowShift.night_hours} hs nocturnas` : ""}`,
        type: "turno",
        actionLabel: "Ver Turno",
        targetTab: "trabajo",
      });
    }
  } else if (todayShift && !todayShift.is_rest_day && todayShift.start_time !== "Franco") {
    alerts.push({
      id: "turno-hoy",
      icon: "⏱️",
      title: `Turno de Hoy: ${todayShift.start_time} a ${todayShift.end_time}`,
      subtitle: `${todayShift.total_hours} hs laborales programadas`,
      type: "turno",
      actionLabel: "Ver Horarios",
      targetTab: "trabajo",
    });
  }

  const activeAlerts = alerts.filter((a) => !dismissed[a.id]);
  if (activeAlerts.length === 0 && !paymentModalOpen) return null;

  return (
    <>
      <div className="space-y-2 mb-2">
        {activeAlerts.map((alert) => (
          <div
            key={alert.id}
            onClick={() => {
              if (alert.interactiveCobro) {
                setPaymentModalOpen(true);
              }
            }}
            className={`relative p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-neutral-900/90 to-neutral-950/90 border border-blue-500/25 shadow-[0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-xl flex items-center justify-between gap-3 animate-fade-in ${
              alert.interactiveCobro ? "cursor-pointer active:scale-[0.98] hover:border-blue-500/40 transition-all" : ""
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xl sm:text-2xl shrink-0">{alert.icon}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                    {alert.title}
                  </h4>
                  {alert.interactiveCobro && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      TOCAR PARA AJUSTAR
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-300 truncate">
                  {alert.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {alert.actionLabel && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (alert.interactiveCobro) {
                      setPaymentModalOpen(true);
                    } else if (alert.targetTab) {
                      onNavigateTab?.(alert.targetTab);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-xs font-bold text-blue-300 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                >
                  <span>{alert.actionLabel}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDismissed((prev) => ({ ...prev, [alert.id]: true }));
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar aviso"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Interactivo: Configurar Fecha de Cobro (GEL-047 Ergonomics) */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="fixed inset-0" onClick={() => setPaymentModalOpen(false)} />

          <div className="relative w-full max-w-md max-h-[85dvh] flex flex-col rounded-3xl bg-neutral-950 border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden z-10 animate-slide-up">
            {/* Header del Modal */}
            <div className="sticky top-0 bg-neutral-900/95 backdrop-blur-md z-10 px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  Configurar Fecha de Cobro
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    SUELDO
                  </span>
                </h3>
                <p className="text-xs text-neutral-400">
                  Define cuándo se acredita tu sueldo para calcular la cuenta regresiva
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-400 hover:text-white bg-white/[0.04] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4 pb-12 pr-1">
              <div className="space-y-3">
                {/* Opción A: 5to Día Hábil Legal */}
                <div
                  onClick={() => setRuleType("fifth_business_day")}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    ruleType === "fifth_business_day"
                      ? "bg-blue-500/15 border-blue-500/40 text-white"
                      : "bg-neutral-900/60 border-white/10 text-neutral-300 hover:bg-neutral-900"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentRule"
                    checked={ruleType === "fifth_business_day"}
                    onChange={() => setRuleType("fifth_business_day")}
                    className="mt-1 accent-blue-500 cursor-pointer"
                  />
                  <div>
                    <p className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-blue-400" />
                      5to Día Hábil legal (LCT Argentina)
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Plazo legal estándar fijado por la Ley de Contrato de Trabajo.
                    </p>
                  </div>
                </div>

                {/* Opción B: Día Fijo del Mes */}
                <div
                  onClick={() => setRuleType("fixed_day")}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    ruleType === "fixed_day"
                      ? "bg-blue-500/15 border-blue-500/40 text-white"
                      : "bg-neutral-900/60 border-white/10 text-neutral-300 hover:bg-neutral-900"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentRule"
                    checked={ruleType === "fixed_day"}
                    onChange={() => setRuleType("fixed_day")}
                    className="mt-1 accent-blue-500 cursor-pointer"
                  />
                  <div className="w-full">
                    <p className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                      Día fijo del mes
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5 mb-2">
                      Si tu empleador paga siempre en una fecha fija del calendario.
                    </p>

                    {ruleType === "fixed_day" && (
                      <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs text-neutral-300 font-semibold">Día de cobro:</span>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={fixedDay}
                          onChange={(e) => setFixedDay(Math.max(1, Math.min(31, parseInt(e.target.value, 10) || 1)))}
                          className="w-20 px-3 py-1.5 rounded-xl bg-neutral-950 border border-white/15 text-white font-mono font-bold text-sm text-center focus:outline-none focus:border-blue-500"
                        />
                        <span className="text-xs text-neutral-400">de cada mes</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Opción C: X Día Hábil */}
                <div
                  onClick={() => setRuleType("nth_business_day")}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    ruleType === "nth_business_day"
                      ? "bg-blue-500/15 border-blue-500/40 text-white"
                      : "bg-neutral-900/60 border-white/10 text-neutral-300 hover:bg-neutral-900"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentRule"
                    checked={ruleType === "nth_business_day"}
                    onChange={() => setRuleType("nth_business_day")}
                    className="mt-1 accent-blue-500 cursor-pointer"
                  />
                  <div className="w-full">
                    <p className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-400" />
                      Día hábil específico (1º, 4º, etc.)
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5 mb-2">
                      Si cobras en un día hábil particular distinto al 5to.
                    </p>

                    {ruleType === "nth_business_day" && (
                      <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs text-neutral-300 font-semibold">El:</span>
                        <select
                          value={businessDayNumber}
                          onChange={(e) => setBusinessDayNumber(parseInt(e.target.value, 10))}
                          className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-white/15 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                        >
                          <option value="1">1º Día Hábil</option>
                          <option value="2">2º Día Hábil</option>
                          <option value="3">3º Día Hábil</option>
                          <option value="4">4º Día Hábil</option>
                          <option value="5">5º Día Hábil</option>
                          <option value="6">6º Día Hábil</option>
                          <option value="7">7º Día Hábil</option>
                          <option value="8">8º Día Hábil</option>
                          <option value="10">10º Día Hábil</option>
                        </select>
                        <span className="text-xs text-neutral-400">del mes</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Previsualización en Vivo */}
              <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/25 space-y-1">
                <p className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-blue-400" />
                  Próxima acreditación según esta regla:
                </p>
                <p className="text-sm font-mono font-bold text-white pl-5.5">
                  {previewCountdown.dateString}
                </p>
                <p className="text-[11px] text-neutral-400 pl-5.5">
                  {previewCountdown.isToday ? "¡Cobras hoy!" : `Faltan ${previewCountdown.daysRemaining} días`}
                </p>
              </div>
            </div>

            {/* Sticky Action Footer (GEL-047 No-Overlapping Ergonomics) */}
            <div className="sticky bottom-0 bg-neutral-900/95 backdrop-blur-md pt-3 pb-3 px-5 border-t border-white/10 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-neutral-300 transition-all cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSavePaymentRule}
                className="px-5 py-2.5 rounded-xl bg-blue-500 text-black font-extrabold text-xs uppercase tracking-wider hover:bg-blue-400 transition-all cursor-pointer active:scale-95 shadow-lg shadow-blue-500/25 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Aplicar Regla de Cobro</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
