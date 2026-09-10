import * as XLSX from "xlsx";
import type { FinancialSummary, Transaction, Account, Installment, SavingsGoal, CategoryBudget, Subscription } from "@/lib/types";

export interface ExcelExportData {
  summary?: FinancialSummary;
  transactions?: Transaction[];
  accounts?: Account[];
  installments?: Installment[];
  goals?: SavingsGoal[];
  budgets?: CategoryBudget[];
  subscriptions?: Subscription[];
}

/**
 * Exporta todos los datos financieros a una planilla Excel (.xlsx) estructurada y profesional.
 * Si no se le pasan los datos, los consulta automáticamente a los endpoints del servidor.
 */
export async function exportFinancialsToExcel(customData?: ExcelExportData): Promise<{ success: boolean; filename: string }> {
  try {
    let data = customData;

    // Si no se pasaron datos, consultarlos automáticamente
    if (!data) {
      const [resSummary, resTxs, resAccs, resInsts, resGoals, resBudgets, resSubs] = await Promise.all([
        fetch("/api/summary").then((r) => r.ok ? r.json() : null),
        fetch("/api/transactions?limit=1000").then((r) => r.ok ? r.json() : { data: [] }),
        fetch("/api/accounts").then((r) => r.ok ? r.json() : []),
        fetch("/api/installments").then((r) => r.ok ? r.json() : []),
        fetch("/api/goals").then((r) => r.ok ? r.json() : []),
        fetch("/api/budgets").then((r) => r.ok ? r.json() : []),
        fetch("/api/subscriptions").then((r) => r.ok ? r.json() : []),
      ]);

      data = {
        summary: resSummary || undefined,
        transactions: resTxs?.data || [],
        accounts: Array.isArray(resAccs) ? resAccs : [],
        installments: Array.isArray(resInsts) ? resInsts : [],
        goals: Array.isArray(resGoals) ? resGoals : [],
        budgets: Array.isArray(resBudgets) ? resBudgets : [],
        subscriptions: Array.isArray(resSubs) ? resSubs : [],
      };
    }

    const summary = data.summary;
    const transactions = data.transactions || [];
    const accounts = data.accounts || summary?.accounts || [];
    const installments = data.installments || summary?.active_installments || [];
    const goals = data.goals || summary?.savings_goals || [];
    const budgets = data.budgets || summary?.category_budgets || [];
    const subscriptions = data.subscriptions || summary?.subscriptions || [];

    // Crear libro de trabajo
    const wb = XLSX.utils.book_new();
    const todayStr = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const nowHourStr = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

    // ============================================================
    // HOJA 1: RESUMEN EJECUTIVO
    // ============================================================
    const summaryRows: (string | number)[][] = [
      ["FINANZAPP ULTRA — INFORME FINANCIERO INTEGRAL"],
      [`Generado el: ${todayStr} a las ${nowHourStr}`],
      [""],
      ["1. INDICADORES CLAVE DE DESEMPEÑO (KPIs)", ""],
      ["Concepto", "Valor Registrado"],
      ["Balance General Consolidado (ARS)", summary?.total_balance ?? 0],
      ["Ingresos Totales (Últimos 30 días)", summary?.income_30d ?? 0],
      ["Gastos Totales (Últimos 30 días)", summary?.expense_30d ?? 0],
      ["Flujo de Caja Neto (30 días)", (summary?.income_30d ?? 0) - (summary?.expense_30d ?? 0)],
      ["Compromiso Mensual en Cuotas", summary?.total_installments_monthly ?? 0],
      ["Gastos Fijos en Suscripciones", summary?.total_subscriptions_monthly ?? 0],
      ["Sueldo Configurado", summary?.configured_salary ?? 0],
      ["Tasa de Ahorro Estimada", `${summary?.health_metrics?.savings_rate ?? 0}%`],
      ["Score de Salud Financiera", `${summary?.health_metrics?.score ?? 0} / 100 (${summary?.health_metrics?.status ?? "Normal"})`],
      ["Meses de Cobertura (Runway)", `${summary?.health_metrics?.runway_months ?? 0} meses`],
      [""],
      ["2. ESTADO DE CUENTAS BANCARIAS Y BILLETERAS", ""],
      ["Nombre de Cuenta", "Tipo", "Moneda", "Saldo Actual", "Estado"],
    ];

    if (accounts.length > 0) {
      accounts.forEach((acc) => {
        summaryRows.push([
          acc.name,
          acc.type === "bank" ? "Banco" : acc.type === "digital_wallet" ? "Billetera Digital" : acc.type === "cash" ? "Efectivo" : "Crypto",
          acc.currency,
          acc.balance,
          acc.is_active ? "Activa" : "Inactiva",
        ]);
      });
    } else {
      summaryRows.push(["Sin cuentas registradas", "-", "-", 0, "-"]);
    }

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary["!cols"] = [{ wch: 38 }, { wch: 24 }, { wch: 14 }, { wch: 18 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen General");

    // ============================================================
    // HOJA 2: TRANSACCIONES (DETALLE COMPLETO)
    // ============================================================
    const urgencyLabels: Record<string, string> = {
      essential: "Esencial 🔴",
      important: "Importante 🟡",
      nice_to_have: "Opcional 🟢",
      unnecessary: "Prescindible ⚪",
    };

    const typeLabels: Record<string, string> = {
      income: "Ingreso (+)",
      expense: "Gasto (-)",
      transfer: "Transferencia",
    };

    const txHeaders = [
      "Fecha",
      "Tipo",
      "Categoría",
      "Urgencia / Necesidad",
      "Descripción",
      "Cuenta Origen",
      "Monto",
      "Moneda",
    ];

    const txRows: (string | number)[][] = [txHeaders];

    transactions.forEach((t) => {
      txRows.push([
        t.date,
        typeLabels[t.type] || t.type,
        t.category?.name || "Sin categoría",
        t.urgency ? (urgencyLabels[t.urgency] || t.urgency) : "Sin clasificar",
        t.description || "-",
        t.account?.name || "Cuenta Principal",
        t.amount,
        t.currency,
      ]);
    });

    if (transactions.length === 0) {
      txRows.push(["-", "Sin movimientos", "-", "-", "Aún no se registraron transacciones", "-", 0, "ARS"]);
    }

    const wsTransactions = XLSX.utils.aoa_to_sheet(txRows);
    wsTransactions["!cols"] = [
      { wch: 14 },
      { wch: 16 },
      { wch: 28 },
      { wch: 22 },
      { wch: 35 },
      { wch: 24 },
      { wch: 16 },
      { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, wsTransactions, "Transacciones");

    // ============================================================
    // HOJA 3: CUOTAS Y DEUDAS
    // ============================================================
    const instHeaders = [
      "Concepto / Compra",
      "Monto por Cuota",
      "Cuotas Pagadas",
      "Total Cuotas",
      "Cuotas Restantes",
      "Deuda Total Original",
      "Deuda Pendiente",
      "Próximo Vencimiento",
      "Sin Interés",
    ];

    const instRows: (string | number)[][] = [instHeaders];

    installments.forEach((i) => {
      const paid = i.paid_installments || 0;
      const remainingInstallments = i.remaining_installments ?? Math.max(0, i.total_installments - paid);
      const remainingAmount = i.remaining_amount ?? (remainingInstallments * i.installment_amount);
      instRows.push([
        i.description,
        i.installment_amount,
        paid,
        i.total_installments,
        remainingInstallments,
        i.total_amount,
        remainingAmount,
        i.next_due_date || "-",
        !i.has_interest ? "Sí (Sin interés)" : "No (Con interés)",
      ]);
    });

    if (installments.length === 0) {
      instRows.push(["Sin cuotas o deudas registradas", 0, 0, 0, 0, 0, 0, "-", "-"]);
    }

    const wsInstallments = XLSX.utils.aoa_to_sheet(instRows);
    wsInstallments["!cols"] = [
      { wch: 30 },
      { wch: 18 },
      { wch: 15 },
      { wch: 14 },
      { wch: 16 },
      { wch: 20 },
      { wch: 18 },
      { wch: 20 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, wsInstallments, "Cuotas y Deudas");

    // ============================================================
    // HOJA 4: METAS DE AHORRO
    // ============================================================
    const goalHeaders = [
      "Meta de Ahorro",
      "Monto Objetivo",
      "Ahorro Actual",
      "Progreso (%)",
      "Faltante",
      "Aporte Mensual",
      "Fecha Límite",
      "Prioridad",
      "Moneda",
    ];

    const goalRows: (string | number)[][] = [goalHeaders];

    goals.forEach((g) => {
      const progressPct = g.target_amount > 0 ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) : 0;
      const missing = Math.max(0, g.target_amount - g.current_amount);
      const priorityLabel = g.priority === 1 ? "Alta" : g.priority === 2 ? "Media" : "Baja";
      goalRows.push([
        g.name,
        g.target_amount,
        g.current_amount,
        `${progressPct}%`,
        missing,
        g.monthly_contribution || 0,
        g.target_date || "Sin fecha fija",
        priorityLabel,
        g.currency,
      ]);
    });

    if (goals.length === 0) {
      goalRows.push(["Sin metas activas", 0, 0, "0%", 0, 0, "-", "-", "ARS"]);
    }

    const wsGoals = XLSX.utils.aoa_to_sheet(goalRows);
    wsGoals["!cols"] = [
      { wch: 28 },
      { wch: 18 },
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 14 },
      { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, wsGoals, "Metas de Ahorro");

    // ============================================================
    // HOJA 5: PRESUPUESTOS Y SUSCRIPCIONES
    // ============================================================
    const budgetRows: (string | number)[][] = [
      ["PRESUPUESTOS MENSUALES POR CATEGORÍA"],
      ["Categoría", "Límite Presupuestado", "Gastado Actual", "Saldo Disponible", "% Consumido"],
    ];

    if (budgets.length > 0) {
      budgets.forEach((b) => {
        const spent = b.spent_this_month ?? 0;
        const limit = b.monthly_limit;
        const available = limit - spent;
        const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
        budgetRows.push([
          b.category?.name || "Categoría",
          limit,
          spent,
          available,
          `${pct}%`,
        ]);
      });
    } else {
      budgetRows.push(["Sin presupuestos definidos", 0, 0, 0, "0%"]);
    }

    budgetRows.push([""]);
    budgetRows.push(["SUSCRIPCIONES Y SERVICIOS RECURRENTES"]);
    budgetRows.push(["Servicio / Plataforma", "Costo Mensual", "Frecuencia", "Categoría", "Estado"]);

    if (subscriptions.length > 0) {
      subscriptions.forEach((s) => {
        budgetRows.push([
          s.name,
          s.amount,
          s.billing_cycle === "monthly" ? "Mensual" : s.billing_cycle === "yearly" ? "Anual" : "Semanal",
          s.category?.name || "Servicio",
          s.is_active ? "Activo" : "Pausado",
        ]);
      });
    } else {
      budgetRows.push(["Sin suscripciones registradas", 0, "-", "-", "-"]);
    }

    const wsBudgets = XLSX.utils.aoa_to_sheet(budgetRows);
    wsBudgets["!cols"] = [{ wch: 30 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsBudgets, "Presupuestos y Servicios");

    // Guardar y descargar archivo en el cliente
    const filename = `FinanzApp_Reporte_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, filename);

    return { success: true, filename };
  } catch (error) {
    console.error("[ExcelGenerator] Error exporting to Excel:", error);
    throw error;
  }
}
