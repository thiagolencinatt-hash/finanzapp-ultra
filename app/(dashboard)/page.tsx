"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { SalaryCard } from "@/components/dashboard/SalaryCard";
import { AccountsGrid } from "@/components/dashboard/AccountsGrid";
import { DashboardGoalsSection } from "@/components/dashboard/DashboardGoalsSection";
import { DashboardInstallmentsSection } from "@/components/dashboard/DashboardInstallmentsSection";
import { DashboardBudgetsSection } from "@/components/dashboard/DashboardBudgetsSection";
import { DashboardSubscriptionsSection } from "@/components/dashboard/DashboardSubscriptionsSection";
import { FinancialHealthCard } from "@/components/dashboard/FinancialHealthCard";
import { SpendingChart } from "@/components/dashboard/SpendingChart";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { DollarRates } from "@/components/dashboard/DollarRates";
import { QuickFinanceModal } from "@/components/dashboard/QuickFinanceModal";
import type { FinancialSummary, Category } from "@/lib/types";
import { Loader2, SlidersHorizontal, Plus } from "lucide-react";

export default function DashboardPage() {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [dateSubtitle, setDateSubtitle] = useState("");
  const [greeting, setGreeting] = useState("¡Hola");

  const loadSummary = useCallback(async () => {
    try {
      const [resSummary, resCats] = await Promise.all([
        fetch("/api/summary"),
        fetch("/api/categories"),
      ]);
      if (resSummary.ok) setSummary(await resSummary.json());
      if (resCats.ok) setCategories(await resCats.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
    const now = new Date();
    const h = now.getHours();
    setGreeting(h < 12 ? "¡Buenos días" : h < 19 ? "¡Buenas tardes" : "¡Buenas noches");
    setDateSubtitle(now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }));

    const handleExternalRefresh = () => loadSummary();
    window.addEventListener("finance-refresh", handleExternalRefresh);
    return () => window.removeEventListener("finance-refresh", handleExternalRefresh);
  }, [loadSummary]);

  return (
    <div className="flex flex-col">
      <Header
        title={`${greeting}! 👋`}
        subtitle={dateSubtitle || "Tu panel de finanzas integral"}
        actionButton={
          <button
            onClick={() => setShowQuickModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-black gradient-primary btn-3d cursor-pointer"
            title="Ajustar saldo real, sueldo mensual y gastos directamente"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Ajustar Mis Montos</span>
          </button>
        }
      />

      {loading ? (
        <div className="flex-1 flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "hsl(var(--primary))" }} />
        </div>
      ) : (
        <div className="flex-1 p-4 lg:p-6 space-y-6">
          {/* Cotizaciones Dólar en Vivo */}
          <div className="animate-slide-up">
            <DollarRates />
          </div>

          {/* 1. Indicador de Salud Financiera Pro */}
          <div className="animate-slide-up">
            <FinancialHealthCard metrics={summary?.health_metrics} />
          </div>

          {/* 2. Balance Total */}
          <div className="animate-slide-up">
            <BalanceCard
              totalBalance={summary?.total_balance || 0}
              income30d={summary?.income_30d || 0}
              expense30d={summary?.expense_30d || 0}
              monthlyInstallments={summary?.total_installments_monthly || 0}
              onRefresh={loadSummary}
            />
          </div>

          {/* 3. Módulo de Sueldo & Ingresos */}
          <div className="animate-slide-up">
            <SalaryCard
              salary={summary?.configured_salary || summary?.income_30d || 980000}
              payDay={summary?.salary_pay_day || 5}
              totalIncome30d={summary?.income_30d || 0}
              onRefresh={loadSummary}
            />
          </div>

          {/* 4. Presupuestos Mensuales por Categoría */}
          <div className="animate-slide-up">
            <DashboardBudgetsSection
              budgets={summary?.category_budgets || []}
              categories={categories}
              onRefresh={loadSummary}
            />
          </div>

          {/* 5. Grid de Cuentas & Saldos editables con 1 clic */}
          <div className="animate-slide-up">
            <AccountsGrid accounts={summary?.accounts || []} onRefresh={loadSummary} />
          </div>

          {/* 6. Suscripciones y Gastos Recurrentes */}
          <div className="animate-slide-up">
            <DashboardSubscriptionsSection
              subscriptions={summary?.subscriptions || []}
              monthlyTotal={summary?.total_subscriptions_monthly || 0}
              onRefresh={loadSummary}
            />
          </div>

          {/* 7. Metas & Ahorros con Asignador Inteligente de Sueldo */}
          <div className="animate-slide-up">
            <DashboardGoalsSection
              goals={summary?.savings_goals || []}
              salary={summary?.configured_salary || summary?.income_30d || 980000}
              onRefresh={loadSummary}
            />
          </div>

          {/* 8. Compras en Cuotas y Tarjetas */}
          <div className="animate-slide-up">
            <DashboardInstallmentsSection
              installments={summary?.active_installments || []}
              monthlyTotal={summary?.total_installments_monthly || 0}
              onRefresh={loadSummary}
            />
          </div>

          {/* 9. Gráfico de Gastos y Transacciones Recientes */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 animate-slide-up">
              <SpendingChart categories={summary?.top_categories || []} />
            </div>
            <div className="lg:col-span-3 animate-slide-up">
              <RecentTransactions />
            </div>
          </div>
        </div>
      )}

      {showQuickModal && (
        <QuickFinanceModal
          isOpen={showQuickModal}
          currentBalance={summary?.total_balance || 0}
          currentIncome={summary?.income_30d || 0}
          currentExpense={summary?.expense_30d || 0}
          onClose={() => setShowQuickModal(false)}
          onSuccess={() => {
            setShowQuickModal(false);
            loadSummary();
          }}
        />
      )}
    </div>
  );
}
