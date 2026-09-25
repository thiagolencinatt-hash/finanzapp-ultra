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
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { isDemoUser } from "@/lib/freemium";
import type { FinancialSummary, Category } from "@/lib/types";
import { Loader2, SlidersHorizontal, ChevronDown, ChevronUp, Lock } from "lucide-react";

import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";

export default function DashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dateSubtitle, setDateSubtitle] = useState("");
  const [greeting, setGreeting] = useState("¡Hola");
  const [mounted, setMounted] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      const [resSummary, resCats] = await Promise.all([
        fetch("/api/summary", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
      ]);
      if (resSummary.ok) {
        const data = await resSummary.json();
        // GEL-021: Validación estricta del resumen antes de aceptar la respuesta
        if (data && typeof data.total_balance === 'number') {
          setSummary((prev) => {
            // Anti-reset: Si el nuevo resumen tiene 0 transacciones y 0 balance
            // pero el anterior tenía datos, mantener el anterior (race condition protection)
            if (
              prev &&
              prev.total_balance !== 0 &&
              data.total_balance === 0 &&
              (data.income_30d === 0 && data.expense_30d === 0) &&
              (prev.income_30d > 0 || prev.expense_30d > 0)
            ) {
              console.warn("[Dashboard] Blocked suspicious zero-state summary update. Keeping cached data.");
              return prev;
            }
            return data;
          });
          localStorage.setItem("finanzapp_last_summary", JSON.stringify(data));
        }
      } else {
        // Anti-reset: Si el servidor falla, leemos del último estado conocido
        const cached = localStorage.getItem("finanzapp_last_summary");
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && typeof parsed.total_balance === 'number') {
              setSummary(parsed);
            }
          } catch { /* ignore corrupt cache */ }
        }
      }
      
      if (resCats.ok) {
        const catsData = await resCats.json();
        if (Array.isArray(catsData)) {
          setCategories(catsData);
        }
      }
    } catch (err) {
      console.error("[Dashboard] loadSummary error:", err);
      const cached = localStorage.getItem("finanzapp_last_summary");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed.total_balance === 'number') {
            setSummary(parsed);
          }
        } catch { /* ignore corrupt cache */ }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
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
          mounted && isDemoUser() ? (
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
              onClick={() => (mounted ? setShowQuickModal(true) : undefined)}
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
        <DashboardSkeleton />
      ) : (
        <div className="flex-1 p-4 sm:p-5 lg:p-6 space-y-5 md:space-y-6 max-w-7xl mx-auto w-full pb-28 md:pb-12">

          {/* 1. 💡 Smart Tip — Coach IA */}
          <ErrorBoundary fallbackTitle="Error en sugerencias" fallbackMessage="Las sugerencias no pudieron cargarse. Tu dashboard sigue funcionando.">
            <div className="animate-slide-up">
              <SmartTipCard
                income30d={summary?.income_30d || 0}
                expense30d={summary?.expense_30d || 0}
                installmentsMonthly={summary?.total_installments_monthly || 0}
                topCategory={summary?.top_categories?.[0]?.category_name}
                goalsCount={summary?.savings_goals?.length || 0}
              />
            </div>
          </ErrorBoundary>

          {/* 2. 💰 Balance Total + Ingresos vs Gastos */}
          <ErrorBoundary fallbackTitle="Error en el balance" fallbackMessage="El balance no pudo renderizarse. Tus datos están seguros.">
            <div className="animate-slide-up">
              <BalanceCard
                totalBalance={summary?.total_balance || 0}
                income30d={summary?.income_30d || 0}
                expense30d={summary?.expense_30d || 0}
                monthlyInstallments={summary?.total_installments_monthly || 0}
                onRefresh={loadSummary}
              />
            </div>
          </ErrorBoundary>

          {/* 3. 📊 Gráfico de Gastos + Transacciones Recientes */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 animate-slide-up">
            <div className="lg:col-span-2">
              <ErrorBoundary fallbackTitle="Error en gráfico" fallbackMessage="El gráfico no pudo renderizarse.">
                <SpendingChart categories={summary?.top_categories || []} />
              </ErrorBoundary>
            </div>
            <div className="lg:col-span-3">
              <ErrorBoundary fallbackTitle="Error en transacciones" fallbackMessage="Las transacciones no pudieron cargarse.">
                <RecentTransactions />
              </ErrorBoundary>
            </div>
          </div>

          {/* 4. 🎯 Metas de Ahorro */}
          <FreemiumGate action="manage_goals" className="animate-slide-up">
            <ErrorBoundary fallbackTitle="Error en metas" fallbackMessage="Las metas no pudieron renderizarse.">
              <DashboardGoalsSection
                goals={summary?.savings_goals || []}
                salary={summary?.configured_salary || summary?.income_30d || 980000}
                onRefresh={loadSummary}
              />
            </ErrorBoundary>
          </FreemiumGate>

          {/* ▼ Sección Avanzada (expandible) */}
          <FreemiumGate action="manage_installments" className="animate-slide-up">
            <div>
              <button
                type="button"
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
                  <ErrorBoundary fallbackTitle="Error en cuotas" fallbackMessage="Las cuotas no pudieron renderizarse.">
                    <DashboardInstallmentsSection
                      installments={summary?.active_installments || []}
                      monthlyTotal={summary?.total_installments_monthly || 0}
                      onRefresh={loadSummary}
                    />
                  </ErrorBoundary>
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
