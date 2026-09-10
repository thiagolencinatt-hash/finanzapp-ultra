"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { SmartTipCard } from "@/components/dashboard/SmartTipCard";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { SpendingChart } from "@/components/dashboard/SpendingChart";
import { DashboardGoalsSection } from "@/components/dashboard/DashboardGoalsSection";
import { DashboardInstallmentsSection } from "@/components/dashboard/DashboardInstallmentsSection";
import { QuickFinanceModal } from "@/components/dashboard/QuickFinanceModal";
import { FreemiumGate } from "@/components/ui/FreemiumGate";
import { isDemoUser } from "@/lib/freemium";
import type { FinancialSummary, Category } from "@/lib/types";
import { Loader2, SlidersHorizontal, ChevronDown, ChevronUp, Lock } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
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
        subtitle={dateSubtitle || "Tu panel de finanzas"}
        actionButton={
          isDemoUser() ? (
            <button
              onClick={() => router.push("/login?tab=register")}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all"
              style={{
                background: "hsl(var(--secondary))",
                color: "hsl(var(--muted-foreground))",
                border: "1px solid hsl(var(--border))",
              }}
              title="Creá tu cuenta para ajustar montos"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Ajustar Montos</span>
            </button>
          ) : (
            <button
              onClick={() => setShowQuickModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-black gradient-primary btn-3d cursor-pointer"
              title="Ajustar saldo real, sueldo mensual y gastos"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Ajustar Montos</span>
            </button>
          )
        }
      />

      {loading ? (
        <div className="flex-1 flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "hsl(var(--primary))" }} />
        </div>
      ) : (
        <div className="flex-1 p-3 sm:p-5 lg:p-6 space-y-3.5 sm:space-y-5 max-w-7xl mx-auto w-full">

          {/* 1. 💡 Smart Tip — Coach IA */}
          <div className="animate-slide-up">
            <SmartTipCard
              income30d={summary?.income_30d || 0}
              expense30d={summary?.expense_30d || 0}
              installmentsMonthly={summary?.total_installments_monthly || 0}
              topCategory={summary?.top_categories?.[0]?.category_name}
              goalsCount={summary?.savings_goals?.length || 0}
            />
          </div>

          {/* 2. 💰 Balance Total + Ingresos vs Gastos */}
          <div className="animate-slide-up">
            <BalanceCard
              totalBalance={summary?.total_balance || 0}
              income30d={summary?.income_30d || 0}
              expense30d={summary?.expense_30d || 0}
              monthlyInstallments={summary?.total_installments_monthly || 0}
              onRefresh={loadSummary}
            />
          </div>

          {/* 3. 📊 Gráfico de Gastos + Transacciones Recientes */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 animate-slide-up">
            <div className="lg:col-span-2">
              <SpendingChart categories={summary?.top_categories || []} />
            </div>
            <div className="lg:col-span-3">
              <RecentTransactions />
            </div>
          </div>

          {/* 4. 🎯 Metas de Ahorro */}
          <FreemiumGate action="manage_goals" className="animate-slide-up">
            <DashboardGoalsSection
              goals={summary?.savings_goals || []}
              salary={summary?.configured_salary || summary?.income_30d || 980000}
              onRefresh={loadSummary}
            />
          </FreemiumGate>

          {/* ▼ Sección Avanzada (expandible) */}
          <FreemiumGate action="manage_installments" className="animate-slide-up">
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer"
                style={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                {showAdvanced ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Ocultar sección avanzada
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Ver cuotas, suscripciones y más
                  </>
                )}
              </button>

              {showAdvanced && (
                <div className="space-y-5 mt-5 animate-slide-up">
                  <DashboardInstallmentsSection
                    installments={summary?.active_installments || []}
                    monthlyTotal={summary?.total_installments_monthly || 0}
                    onRefresh={loadSummary}
                  />
                </div>
              )}
            </div>
          </FreemiumGate>
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
