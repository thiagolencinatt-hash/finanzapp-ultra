import type { FinancialSummary } from "@/lib/types";

export interface CashFlowEvent {
  id: string;
  type: "installment" | "subscription" | "salary";
  title: string;
  amount: number;
  dayOfMonth: number;
  daysRemaining: number;
  formattedDate: string;
  isIncome: boolean;
}

export interface CashFlowAnalysis {
  currentBalance: number;
  monthlySalary: number;
  monthlyInstallments: number;
  monthlySubscriptions: number;
  totalFixedOutflow: number;
  netFreeCashFlow: number;
  runwayMonths: number;
  healthStatus: "holgado" | "equilibrado" | "ajustado" | "riesgo";
  upcomingEvents: CashFlowEvent[];
}

export function calculateCashFlowProjection(summary: FinancialSummary | null): CashFlowAnalysis {
  if (!summary) {
    return {
      currentBalance: 0,
      monthlySalary: 0,
      monthlyInstallments: 0,
      monthlySubscriptions: 0,
      totalFixedOutflow: 0,
      netFreeCashFlow: 0,
      runwayMonths: 0,
      healthStatus: "equilibrado",
      upcomingEvents: [],
    };
  }

  const currentBalance = summary.total_balance || 0;
  const monthlySalary = summary.configured_salary || summary.income_30d || 0;
  const monthlyInstallments = summary.total_installments_monthly || 0;
  const monthlySubscriptions = summary.total_subscriptions_monthly || 0;
  const totalFixedOutflow = monthlyInstallments + monthlySubscriptions;

  // Dinero Libre Real: lo que tenés disponible descontando los compromisos fijos del mes
  const netFreeCashFlow = currentBalance + (monthlySalary > 0 ? monthlySalary * 0.2 : 0) - totalFixedOutflow;

  // Runway: meses de supervivencia con el balance actual cubriendo salidas fijas
  const runwayMonths = totalFixedOutflow > 0 ? Math.max(0, Math.round((currentBalance / totalFixedOutflow) * 10) / 10) : 12;

  // Estado de salud del flujo de fondos
  let healthStatus: "holgado" | "equilibrado" | "ajustado" | "riesgo" = "equilibrado";
  if (currentBalance < 0 || netFreeCashFlow < 0) {
    healthStatus = "riesgo";
  } else if (netFreeCashFlow < currentBalance * 0.15) {
    healthStatus = "ajustado";
  } else if (runwayMonths >= 6) {
    healthStatus = "holgado";
  }

  // Generar Timeline de Vencimientos en los próximos 30 días
  const today = new Date();
  const currentDay = today.getDate();
  const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  const events: CashFlowEvent[] = [];

  // 1. Sueldo previsto
  if (monthlySalary > 0) {
    const salaryDay = summary.salary_pay_day || 1;
    let daysRemaining = salaryDay - currentDay;
    if (daysRemaining < 0) daysRemaining += daysInCurrentMonth;

    events.push({
      id: "salary-event",
      type: "salary",
      title: "Cobro de Sueldo / Ingreso Principal",
      amount: monthlySalary,
      dayOfMonth: salaryDay,
      daysRemaining,
      formattedDate: `Día ${salaryDay}`,
      isIncome: true,
    });
  }

  // 2. Cuotas activas
  if (summary.active_installments && summary.active_installments.length > 0) {
    summary.active_installments.forEach((inst, idx) => {
      const dueDay = inst.due_day || 10;
      let daysRemaining = dueDay - currentDay;
      if (daysRemaining < 0) daysRemaining += daysInCurrentMonth;

      events.push({
        id: `inst-${inst.id || idx}`,
        type: "installment",
        title: `${inst.description} (${(inst.paid_installments || 0) + 1}/${inst.total_installments})`,
        amount: inst.installment_amount || 0,
        dayOfMonth: dueDay,
        daysRemaining,
        formattedDate: `Día ${dueDay}`,
        isIncome: false,
      });
    });
  }

  // 3. Suscripciones fijas
  if (summary.subscriptions && summary.subscriptions.length > 0) {
    summary.subscriptions.forEach((sub, idx) => {
      if (!sub.is_active) return;
      const renewalDay = sub.renewal_day || 15;
      let daysRemaining = renewalDay - currentDay;
      if (daysRemaining < 0) daysRemaining += daysInCurrentMonth;

      events.push({
        id: `sub-${sub.id || idx}`,
        type: "subscription",
        title: sub.name,
        amount: sub.amount || 0,
        dayOfMonth: renewalDay,
        daysRemaining,
        formattedDate: `Día ${renewalDay}`,
        isIncome: false,
      });
    });
  }

  // Ordenar cronológicamente según los días restantes (los más próximos primero)
  events.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return {
    currentBalance,
    monthlySalary,
    monthlyInstallments,
    monthlySubscriptions,
    totalFixedOutflow,
    netFreeCashFlow,
    runwayMonths,
    healthStatus,
    upcomingEvents: events.slice(0, 8),
  };
}
