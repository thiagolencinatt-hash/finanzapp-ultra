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

/**
 * Parámetros para auditar la discrepancia entre la planilla de turnos y el recibo de haberes (GEL-051).
 */
export interface LaborDiscrepancyParams {
  actualTotalHours: number;
  actualNightHours: number;
  liquidatedDayHours: number;
  liquidatedNightHours: number;
  hourlyRateNormal: number;
  periodName?: string;
  cycleLabel?: string;
}

export interface LaborDiscrepancyResult {
  actualTotalHours: number;
  actualNightHours: number;
  actualDayHours: number;
  liquidatedDayHours: number;
  liquidatedNightHours: number;
  liquidatedTotalHours: number;
  diffTotalHours: number;
  diffNightHours: number;
  hourlyRateNormal: number;
  hourlyRateNight: number;
  nightSurchargeRate: number; // +13.33% LCT Art. 200
  baseAmountDiff: number; // Pesos por horas base no liquidadas
  nightAmountDiff: number; // Pesos por adicional nocturno faltante
  totalClaimAmount: number; // Monto total en ARS a favor del trabajador
  isExact: boolean;
  hasDiscrepancy: boolean;
  status: "correct" | "favor" | "in_progress";
}

/**
 * Calcula la discrepancia económica exacta en pesos ($ ARS) considerando:
 * - Horas diurnas vs liquidadas
 * - Horas nocturnas reales vs liquidadas
 * - Recargo nocturno (+13.33% LCT Art. 200)
 */
export function calculateLaborDiscrepancy(params: LaborDiscrepancyParams): LaborDiscrepancyResult {
  const actualTotal = Math.max(0, Number(params.actualTotalHours) || 0);
  const actualNight = Math.max(0, Number(params.actualNightHours) || 0);
  const actualDay = Math.max(0, actualTotal - actualNight);

  const liqDay = Math.max(0, Number(params.liquidatedDayHours) || 0);
  const liqNight = Math.max(0, Number(params.liquidatedNightHours) || 0);
  const liqTotal = liqDay + liqNight;

  const rateNormal = Math.max(0, Number(params.hourlyRateNormal) || 0);
  const rateNight = Math.round((rateNormal * 1.1333) * 100) / 100;
  const nightSurchargeRate = Math.round((rateNormal * 0.1333) * 100) / 100;

  // Horas base totales omitidas en recibo
  const diffTotalHours = Math.round((actualTotal - liqTotal) * 10) / 10;
  const baseAmountDiff = diffTotalHours > 0 ? Math.round(diffTotalHours * rateNormal * 100) / 100 : 0;

  // Horas nocturnas sin adicional del 13.33%
  const diffNightHours = Math.round(Math.max(0, actualNight - liqNight) * 10) / 10;
  const nightAmountDiff = Math.round(diffNightHours * nightSurchargeRate * 100) / 100;

  const totalClaimAmount = Math.round((baseAmountDiff + nightAmountDiff) * 100) / 100;
  const hasDiscrepancy = totalClaimAmount >= 1;
  const isExact = actualTotal > 0 && Math.abs(diffTotalHours) < 0.1 && diffNightHours < 0.1;

  let status: "correct" | "favor" | "in_progress" = "in_progress";
  if (hasDiscrepancy) {
    status = "favor";
  } else if (isExact) {
    status = "correct";
  }

  return {
    actualTotalHours: actualTotal,
    actualNightHours: actualNight,
    actualDayHours: actualDay,
    liquidatedDayHours: liqDay,
    liquidatedNightHours: liqNight,
    liquidatedTotalHours: liqTotal,
    diffTotalHours,
    diffNightHours,
    hourlyRateNormal: rateNormal,
    hourlyRateNight: rateNight,
    nightSurchargeRate,
    baseAmountDiff,
    nightAmountDiff,
    totalClaimAmount,
    isExact,
    hasDiscrepancy,
    status,
  };
}

/**
 * Genera un texto formal preformateado para WhatsApp o email a Recursos Humanos / Liquidaciones.
 */
export function generateLaborClaimMessage(params: {
  employeeName?: string;
  period: string;
  cycleLabel: string;
  actualTotalHours: number;
  actualNightHours: number;
  liquidatedDayHours: number;
  liquidatedNightHours: number;
  liquidatedTotalHours: number;
  diffTotalHours: number;
  diffNightHours: number;
  hourlyRateNormal: number;
  baseAmountDiff: number;
  nightAmountDiff: number;
  totalClaimAmount: number;
}): string {
  const formatPesos = (val: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(val);
  };

  return `*SOLICITUD DE REVISIÓN DE LIQUIDACIÓN DE HABERES*
*Período:* ${params.period} (Cómputo: ${params.cycleLabel})

Estimado equipo de Recursos Humanos / Liquidaciones,

Me comunico a fin de solicitar la revisión de la liquidación de haberes correspondiente al período indicado, tras cotejar las planillas de turnos efectivamente cumplidos contra el recibo emitido:

*1. Resumen de Cómputo de Horas:*
• Horas totales trabajadas (Planilla): ${params.actualTotalHours} hs
• Horas totales liquidadas (Recibo): ${params.liquidatedTotalHours} hs (Diurnas: ${params.liquidatedDayHours} hs | Nocturnas: ${params.liquidatedNightHours} hs)
• Diferencia de horas base: ${params.diffTotalHours > 0 ? `+${params.diffTotalHours} hs a favor` : `${params.diffTotalHours} hs`}

*2. Adicional Nocturno (Art. 200 LCT):*
• Horas nocturnas cumplidas (21:00 a 06:00): ${params.actualNightHours} hs
• Horas nocturnas liquidadas: ${params.liquidatedNightHours} hs
• Recargo nocturno faltante (+13.33% LCT): +${params.diffNightHours} hs

*3. Diferencia Económica Estimada:*
• Valor hora normal base: ${formatPesos(params.hourlyRateNormal)}
${params.baseAmountDiff > 0 ? `• Horas base no liquidadas (+${params.diffTotalHours} hs): ${formatPesos(params.baseAmountDiff)}\n` : ""}${params.nightAmountDiff > 0 ? `• Recargo nocturnidad faltante (+${params.diffNightHours} hs): ${formatPesos(params.nightAmountDiff)}\n` : ""}• *MONTO TOTAL A FAVOR POR COBRAR: ${formatPesos(params.totalClaimAmount)}*

Agradezco desde ya la verificación de estos puntos y la regularización de la diferencia en la liquidación complementaria. Quedo a entera disposición para acercar las constancias y registros de turnos.

Saludos cordiales.`;
}
