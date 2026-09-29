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
import { Loader2, SlidersHorizontal, ChevronDown, ChevronUp, Lock, UploadCloud, ChevronRight } from "lucide-react";

import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { CashFlowProjectionCard } from "@/components/dashboard/CashFlowProjectionCard";
import { BankStatementModal } from "@/components/import/BankStatementModal";


export default function DashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [showMPModal, setShowMPModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dateSubtitle, setDateSubtitle] = useState("");
  const [greeting, setGreeting] = useState("¡Hola");
  const [mounted, setMounted] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      const [resSummary, resCats, resTxs] = await Promise.all([
        fetch("/api/summary", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
        fetch("/api/transactions", { cache: "no-store" }),
      ]);
      if (resSummary.ok) {
        const data = await resSummary.json();
        // GEL-021 & GEL-023: Validación estricta y Anti-Zero Shield
        if (data && typeof data.total_balance === 'number') {
          let finalData = data;

          // Eliminado el cálculo acumulativo en local_transactions (GEL-025).
          // El servidor es la ÚNICA fuente de verdad.

          setSummary((prev) => {
            if (
              prev &&
              prev.total_balance !== 0 &&
              finalData.total_balance === 0 &&
              (finalData.income_30d === 0 && finalData.expense_30d === 0) &&
              (prev.income_30d > 0 || prev.expense_30d > 0)
            ) {
              console.warn("[Dashboard] Blocked suspicious zero-state summary update. Keeping cached data.");
              finalData = prev;
              return prev;
            }
            return finalData;
          });
          
          // Guardar el estado final aceptado
          setTimeout(() => {
            localStorage.setItem("finanzapp_last_summary", JSON.stringify(finalData));
          }, 0);
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
        <div className="flex-1 px-4 py-5 pb-32 max-w-7xl mx-auto w-full space-y-5 md:space-y-6">

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

          {/* 📲 Botón Destacado de Mercado Pago (GEL-037) */}
          <div className="animate-slide-up">
            <button
              type="button"
              onClick={() => setShowMPModal(true)}
              className="w-full text-left p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-sky-500/15 via-emerald-500/10 to-transparent border border-sky-500/25 hover:border-sky-500/50 hover:bg-white/[0.04] transition-all cursor-pointer group active:scale-[0.99] shadow-lg flex items-center justify-between gap-3 sm:gap-4"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 group-hover:scale-105 transition-transform shadow-[0_4px_15px_rgba(14,165,233,0.2)]">
                  <span className="text-xl sm:text-2xl">📲</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-extrabold text-zinc-100 group-hover:text-sky-300 transition-colors truncate">
                      Cargar Extracto o Comprobante de Mercado Pago
                    </h3>
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30 shrink-0">
                      PDF / IA
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 truncate">
                    Acepta PDF de Mercado Pago, capturas de pantalla o planillas Excel
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] group-hover:bg-sky-500/20 border border-white/[0.08] group-hover:border-sky-500/30 text-xs font-bold text-zinc-300 group-hover:text-sky-200 transition-all shrink-0">
                <UploadCloud className="w-4 h-4 text-sky-400" />
                <span className="hidden xs:inline">Cargar</span>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>

          {/* 3. ⚡ Proyección de Dinero Libre Real & Timeline de Vencimientos */}
          <ErrorBoundary fallbackTitle="Error en proyección" fallbackMessage="La proyección de flujo de fondos no pudo calcularse.">
            <div className="animate-slide-up">
              <CashFlowProjectionCard summary={summary} />
            </div>
          </ErrorBoundary>

          {/* 4. 📊 Gráfico de Gastos + Transacciones Recientes */}
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

      {showMPModal && (
        <BankStatementModal
          isOpen={showMPModal}
          initialBank="Mercado Pago"
          onClose={() => setShowMPModal(false)}
          onSuccess={() => {
            setShowMPModal(false);
            loadSummary();
          }}
        />
      )}
    </div>
  );
}
