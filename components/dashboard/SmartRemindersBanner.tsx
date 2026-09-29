"use client";

import { useState, useEffect } from "react";
import { Bell, Clock, Calendar, Check, X, Sparkles, ChevronRight, AlertCircle } from "lucide-react";
import { getNextPaymentCountdown } from "@/lib/utils/payroll-calculator";
import type { WorkShift } from "@/lib/types";

interface SmartRemindersBannerProps {
  onNavigateTab?: (tab: string) => void;
}

export function SmartRemindersBanner({ onNavigateTab }: SmartRemindersBannerProps) {
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/shifts")
      .then((res) => (res.ok ? res.json() : { shifts: [] }))
      .then((data) => {
        if (Array.isArray(data.shifts)) {
          setShifts(data.shifts);
        }
      })
      .catch(() => {});
  }, []);

  const countdown = getNextPaymentCountdown();

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
  }> = [];

  // Alerta de Cobro (si es hoy o faltan 3 días o menos)
  if (countdown.isToday) {
    alerts.push({
      id: "cobro-hoy",
      icon: "🎉",
      title: "¡Hoy es el 5to día hábil del mes!",
      subtitle: `Acreditación legal de haberes activa (${countdown.dateString})`,
      type: "cobro",
      actionLabel: "Ver Sueldo",
      targetTab: "trabajo",
    });
  } else if (countdown.daysRemaining <= 3) {
    alerts.push({
      id: `cobro-countdown-${countdown.daysRemaining}`,
      icon: "💰",
      title: `Aviso de Cobro: ${countdown.daysRemaining === 1 ? "Mañana" : `Faltan ${countdown.daysRemaining} días`} (${countdown.dateString})`,
      subtitle: "5to día hábil límite legal para liquidación de haberes",
      type: "cobro",
      actionLabel: "Ver Cobro",
      targetTab: "trabajo",
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
  if (activeAlerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-2">
      {activeAlerts.map((alert) => (
        <div
          key={alert.id}
          className="relative p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-neutral-900/90 to-neutral-950/90 border border-blue-500/25 shadow-[0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-xl flex items-center justify-between gap-3 animate-fade-in"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl sm:text-2xl shrink-0">{alert.icon}</span>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                {alert.title}
              </h4>
              <p className="text-[11px] text-neutral-300 truncate">
                {alert.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {alert.actionLabel && alert.targetTab && (
              <button
                type="button"
                onClick={() => onNavigateTab?.(alert.targetTab!)}
                className="px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-xs font-bold text-blue-300 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
              >
                <span>{alert.actionLabel}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setDismissed((prev) => ({ ...prev, [alert.id]: true }))}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Cerrar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
