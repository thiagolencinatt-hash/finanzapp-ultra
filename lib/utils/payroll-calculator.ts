/**
 * Motor de Cálculo Laboral y Calendario de Pagos (GEL-042)
 * Especializado en Ley de Contrato de Trabajo (LCT) Argentina y 5to día hábil.
 */

/**
 * Calcula el 5to día hábil de un mes y año determinado.
 * Considera días hábiles de lunes a viernes (excluye sábados y domingos).
 * @param year Año (ej: 2026)
 * @param month Mes 0-indexado (0 = Enero, 1 = Febrero, ..., 11 = Diciembre)
 */
export function getFifthBusinessDay(year: number, month: number): Date {
  let businessDayCount = 0;
  let currentDay = 1;

  while (businessDayCount < 5) {
    const candidateDate = new Date(year, month, currentDay);
    const dayOfWeek = candidateDate.getDay(); // 0 = Domingo, 6 = Sábado

    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDayCount++;
      if (businessDayCount === 5) {
        return candidateDate;
      }
    }
    currentDay++;
  }

  return new Date(year, month, currentDay);
}

export interface PaymentCountdown {
  paymentDate: Date;
  dateString: string;
  formattedDate: string;
  daysRemaining: number;
  isToday: boolean;
  businessDayNumber: number;
}

/**
 * Obtiene la cuenta regresiva del próximo cobro según el 5to día hábil del mes.
 * Si el 5to día hábil del mes actual ya pasó, proyecta automáticamente el del próximo mes.
 */
export function getNextPaymentCountdown(referenceDate?: Date): PaymentCountdown {
  const now = referenceDate ? new Date(referenceDate) : new Date();
  
  // Normalizar hoy a medianoche local
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 5to día hábil del mes actual
  let targetPaymentDate = getFifthBusinessDay(today.getFullYear(), today.getMonth());
  targetPaymentDate = new Date(
    targetPaymentDate.getFullYear(),
    targetPaymentDate.getMonth(),
    targetPaymentDate.getDate()
  );

  // Si hoy es posterior al 5to día hábil de este mes, calculamos el del próximo mes
  if (today.getTime() > targetPaymentDate.getTime()) {
    const nextMonthYear = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
    const nextMonth = today.getMonth() === 11 ? 0 : today.getMonth() + 1;
    targetPaymentDate = getFifthBusinessDay(nextMonthYear, nextMonth);
    targetPaymentDate = new Date(
      targetPaymentDate.getFullYear(),
      targetPaymentDate.getMonth(),
      targetPaymentDate.getDate()
    );
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

  return {
    paymentDate: targetPaymentDate,
    dateString,
    formattedDate,
    daysRemaining,
    isToday,
    businessDayNumber: 5,
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
