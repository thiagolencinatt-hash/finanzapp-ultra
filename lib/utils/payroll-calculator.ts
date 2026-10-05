/**
 * Motor de Cálculo Laboral y Calendario de Pagos (GEL-042)
 * Especializado en Ley de Contrato de Trabajo (LCT) Argentina y 5to día hábil.
 */

/**
 * Calcula el N-ésimo día hábil de un mes y año determinado (1 a 15).
 * Considera días hábiles de lunes a viernes (excluye sábados y domingos).
 * @param year Año (ej: 2026)
 * @param month Mes 0-indexado (0 = Enero, 1 = Febrero, ..., 11 = Diciembre)
 * @param n Número de día hábil (ej: 5 para el 5to día hábil legal)
 */
export function getNthBusinessDay(year: number, month: number, n: number = 5): Date {
  const targetCount = Math.max(1, Math.min(15, n || 5));
  let businessDayCount = 0;
  let currentDay = 1;

  while (businessDayCount < targetCount && currentDay <= 31) {
    const candidateDate = new Date(year, month, currentDay);
    if (candidateDate.getMonth() !== month) break; // Fin de mes
    const dayOfWeek = candidateDate.getDay(); // 0 = Domingo, 6 = Sábado

    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDayCount++;
      if (businessDayCount === targetCount) {
        return candidateDate;
      }
    }
    currentDay++;
  }

  return new Date(year, month, currentDay > 31 ? 28 : currentDay);
}

/**
 * Calcula el 5to día hábil de un mes y año determinado (retrocompatibilidad).
 */
export function getFifthBusinessDay(year: number, month: number): Date {
  return getNthBusinessDay(year, month, 5);
}

export type PaymentRuleType = "fifth_business_day" | "fixed_day" | "nth_business_day";

export interface PaymentRuleConfig {
  type: PaymentRuleType;
  fixedDay?: number; // 1 a 31
  businessDayNumber?: number; // 1 a 10
}

export interface PaymentCountdown {
  paymentDate: Date;
  dateString: string;
  formattedDate: string;
  daysRemaining: number;
  isToday: boolean;
  businessDayNumber?: number;
  ruleType: PaymentRuleType;
  ruleDescription: string;
}

/**
 * Rango de cómputo del ciclo laboral (GEL-047).
 * Por defecto, del día 26 del mes anterior al día 25 del mes actual.
 */
export interface WorkCycleRange {
  startDate: Date;
  endDate: Date;
  startDateStr: string; // 'YYYY-MM-DD'
  endDateStr: string;   // 'YYYY-MM-DD'
  label: string;        // ej. '26 sep - 25 oct'
  shortLabel: string;   // ej. '26/09 al 25/10'
  periodName: string;   // ej. 'Octubre 2026'
  cutoffDay: number;
}

/**
 * Calcula el rango del ciclo laboral según el día de corte.
 * Si hoy es <= cutoffDay, el ciclo termina en cutoffDay del mes actual y comenzó el (cutoffDay+1) del mes anterior.
 * Si hoy es > cutoffDay, el ciclo comenzó el (cutoffDay+1) del mes actual y terminará el cutoffDay del próximo mes.
 */
export function getWorkCycleRange(
  referenceDate: Date = new Date(),
  cutoffDay: number = 25
): WorkCycleRange {
  const safeCutoff = Math.max(1, Math.min(28, cutoffDay || 25));
  const now = new Date(referenceDate);
  const refYear = now.getFullYear();
  const refMonth = now.getMonth();
  const refDate = now.getDate();

  let startYear = refYear;
  let startMonth = refMonth;
  let endYear = refYear;
  let endMonth = refMonth;

  if (refDate <= safeCutoff) {
    // Ciclo actual: desde cutoffDay + 1 del mes anterior hasta cutoffDay de este mes
    startMonth = refMonth - 1;
    if (startMonth < 0) {
      startMonth = 11;
      startYear = refYear - 1;
    }
    endMonth = refMonth;
    endYear = refYear;
  } else {
    // Ciclo que recién comenzó: desde cutoffDay + 1 de este mes hasta cutoffDay del mes próximo
    startMonth = refMonth;
    startYear = refYear;
    endMonth = refMonth + 1;
    if (endMonth > 11) {
      endMonth = 0;
      endYear = refYear + 1;
    }
  }

  const startDate = new Date(startYear, startMonth, safeCutoff + 1, 0, 0, 0, 0);
  const endDate = new Date(endYear, endMonth, safeCutoff, 23, 59, 59, 999);

  const formatIso = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const monthNamesShort = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic"
  ];
  const monthNamesLong = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const startDay = startDate.getDate();
  const startMonthName = monthNamesShort[startDate.getMonth()];
  const endDay = endDate.getDate();
  const endMonthName = monthNamesShort[endDate.getMonth()];

  const label = `${startDay} ${startMonthName} al ${endDay} ${endMonthName}`;
  const shortLabel = `${String(startDay).padStart(2, "0")}/${String(startDate.getMonth() + 1).padStart(2, "0")} al ${String(endDay).padStart(2, "0")}/${String(endDate.getMonth() + 1).padStart(2, "0")}`;
  const periodName = `${monthNamesLong[endDate.getMonth()]} ${endDate.getFullYear()}`;

  return {
    startDate,
    endDate,
    startDateStr: formatIso(startDate),
    endDateStr: formatIso(endDate),
    label,
    shortLabel,
    periodName,
    cutoffDay: safeCutoff,
  };
}

/**
 * Obtiene la regla de pago guardada en localStorage o fallback al 5to día hábil.
 */
export function getSavedPaymentRule(): PaymentRuleConfig {
  if (typeof window === "undefined") {
    return { type: "fifth_business_day" };
  }
  try {
    const raw = localStorage.getItem("finanzapp_payment_rule");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.type) return parsed;
    }
  } catch {
    // ignore
  }
  return { type: "fifth_business_day" };
}

/**
 * Guarda la regla de cobro en localStorage y emite evento global.
 */
export function savePaymentRule(rule: PaymentRuleConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("finanzapp_payment_rule", JSON.stringify(rule));
    window.dispatchEvent(new CustomEvent("finance-payroll-updated"));
  } catch {
    // ignore
  }
}

/**
 * Obtiene el día de corte laboral guardado (default: 25).
 */
export function getSavedCutoffDay(): number {
  if (typeof window === "undefined") return 25;
  try {
    const val = localStorage.getItem("finanzapp_cutoff_day");
    if (val) {
      const num = parseInt(val, 10);
      if (num >= 1 && num <= 28) return num;
    }
  } catch {
    // ignore
  }
  return 25;
}

/**
 * Guarda el día de corte laboral en localStorage y emite evento global.
 */
export function saveCutoffDay(day: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("finanzapp_cutoff_day", String(day));
    window.dispatchEvent(new CustomEvent("finance-payroll-updated"));
  } catch {
    // ignore
  }
}

/**
 * Obtiene la cuenta regresiva del próximo cobro según la regla configurada.
 * Soporta: 5to día hábil, día fijo del mes o N-ésimo día hábil.
 */
export function getNextPaymentCountdown(
  referenceDate?: Date,
  ruleOverride?: PaymentRuleConfig
): PaymentCountdown {
  const now = referenceDate ? new Date(referenceDate) : new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const rule = ruleOverride || getSavedPaymentRule();

  const calculateTarget = (y: number, m: number): Date => {
    if (rule.type === "fixed_day") {
      const fixed = Math.max(1, Math.min(31, rule.fixedDay || 10));
      // Clamp para meses cortos (ej. febrero 28)
      const lastDayOfMonth = new Date(y, m + 1, 0).getDate();
      const safeDay = Math.min(fixed, lastDayOfMonth);
      return new Date(y, m, safeDay);
    }
    if (rule.type === "nth_business_day") {
      const n = Math.max(1, Math.min(15, rule.businessDayNumber || 5));
      return getNthBusinessDay(y, m, n);
    }
    // Default: 5to día hábil
    return getNthBusinessDay(y, m, 5);
  };

  let targetPaymentDate = calculateTarget(today.getFullYear(), today.getMonth());

  // Si hoy es posterior a la fecha de cobro de este mes, calculamos el cobro del próximo mes
  if (today.getTime() > targetPaymentDate.getTime()) {
    const nextMonthYear = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
    const nextMonth = today.getMonth() === 11 ? 0 : today.getMonth() + 1;
    targetPaymentDate = calculateTarget(nextMonthYear, nextMonth);
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const timeDiff = targetPaymentDate.getTime() - today.getTime();
  const daysRemaining = Math.max(0, Math.round(timeDiff / msPerDay));
  const isToday = daysRemaining === 0;

  // Formato en español: "Viernes 6 de Marzo"
  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const dayName = dayNames[targetPaymentDate.getDay()];
  const dayNumber = targetPaymentDate.getDate();
  const monthName = monthNames[targetPaymentDate.getMonth()];

  const dateString = `${dayName} ${dayNumber} de ${monthName}`;
  const formattedDate = `${dayNumber}/${targetPaymentDate.getMonth() + 1}`;

  let ruleDescription = "5to Día Hábil legal";
  if (rule.type === "fixed_day") {
    ruleDescription = `Día ${rule.fixedDay || 10} de cada mes`;
  } else if (rule.type === "nth_business_day") {
    ruleDescription = `${rule.businessDayNumber || 5}º Día Hábil`;
  }

  return {
    paymentDate: targetPaymentDate,
    dateString,
    formattedDate,
    daysRemaining,
    isToday,
    businessDayNumber: rule.type === "nth_business_day" ? rule.businessDayNumber : (rule.type === "fifth_business_day" ? 5 : undefined),
    ruleType: rule.type,
    ruleDescription,
  };
}

/**
 * Fórmulas contables para liquidación de haberes:
 * - Valor Hora Normal = Sueldo Neto / Horas Mensuales
 * - Valor Hora Nocturna = Valor Hora Normal * 1.1333 (LCT Art. 200, recargo de 8 min por cada hora trabajada entre 21:00 y 06:00)
 */
export function calculateHourlyRates(netSalary: number, totalHours: number = 160) {
  const safeHours = totalHours > 0 ? totalHours : 160;
  const safeSalary = Math.max(0, netSalary || 0);

  const hourlyRateNormal = Math.round((safeSalary / safeHours) * 100) / 100;
  // Recargo LCT Art. 200 (+13.333%)
  const hourlyRateNight = Math.round((hourlyRateNormal * 1.1333) * 100) / 100;

  return {
    hourlyRateNormal,
    hourlyRateNight,
    totalHours: safeHours,
  };
}

/**
 * Convierte "HH:MM" a minutos desde medianoche (0 a 1439)
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Calcula la duración en horas de un turno, tolerando cruces de medianoche.
 */
export function calculateShiftDuration(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  let diffMinutes = end - start;
  if (diffMinutes < 0) {
    // Cruza medianoche (ej: 22:00 a 06:00)
    diffMinutes += 24 * 60;
  }

  return Math.round((diffMinutes / 60) * 10) / 10;
}

/**
 * Calcula la cantidad de horas nocturnas trabajadas (entre las 21:00 y las 06:00).
 * Según LCT Art. 200, la jornada nocturna comprende el intervalo 21:00 a 06:00 del día siguiente.
 */
export function calculateNightHours(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime);
  let end = timeToMinutes(endTime);
  if (end <= start) {
    end += 24 * 60; // cruce de medianoche
  }

  // Intervalos nocturnos en minutos respecto a día 1:
  // 1) 21:00 (1260m) hasta medianoche (1440m)
  // 2) Medianoche (1440m) hasta 06:00 (1800m)
  // 3) Madrugada del día inicial (00:00 a 06:00 = 0m a 360m)
  let nightMinutes = 0;

  // Franja A: 00:00 (0) a 06:00 (360)
  const overlapA = Math.max(0, Math.min(end, 360) - Math.max(start, 0));
  if (overlapA > 0) nightMinutes += overlapA;

  // Franja B: 21:00 (1260) a 06:00 del día siguiente (1800)
  const overlapB = Math.max(0, Math.min(end, 1800) - Math.max(start, 1260));
  if (overlapB > 0) nightMinutes += overlapB;

  return Math.round((nightMinutes / 60) * 10) / 10;
}
