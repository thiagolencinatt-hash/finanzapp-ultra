"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
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
import { 
  SlidersHorizontal, 
  ChevronDown, 
  ChevronUp, 
  Lock, 
  UploadCloud, 
  ChevronRight,
  Wallet,
  Clock,
  Sparkles,
  Radar
} from "lucide-react";

import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { CashFlowProjectionCard } from "@/components/dashboard/CashFlowProjectionCard";
import { BankStatementModal } from "@/components/import/BankStatementModal";
import { SalaryCard } from "@/components/dashboard/SalaryCard";
import { WorkScheduleCard } from "@/components/dashboard/WorkScheduleCard";
import { LaborAuditorCard } from "@/components/dashboard/LaborAuditorCard";
import { FinancialAuditorChat } from "@/components/ai/FinancialAuditorChat";
import { SubscriptionRadarCard } from "@/components/dashboard/SubscriptionRadarCard";
import { SmartRemindersBanner } from "@/components/dashboard/SmartRemindersBanner";

type ModularTab = "finanzas" | "trabajo" | "asistente" | "radar";

function DashboardContent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ModularTab>("finanzas");
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [showMPModal, setShowMPModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dateSubtitle, setDateSubtitle] = useState("");
  const [greeting, setGreeting] = useState("¡Hola");
  const [mounted, setMounted] = useState(false);

  // Sincronizar pestaña activa de forma segura en cliente sin romper prerendering
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") as ModularTab;
      if (tabParam && ["finanzas", "trabajo", "asistente", "radar"].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }

    const handleTabChange = (e: any) => {
      if (e.detail && ["finanzas", "trabajo", "asistente", "radar"].includes(e.detail)) {
        setActiveTab(e.detail);
      }
    };

    window.addEventListener("finanzapp-tab-change", handleTabChange);
    return () => window.removeEventListener("finanzapp-tab-change", handleTabChange);
  }, []);

  const switchTab = (tab: ModularTab) => {
    setActiveTab(tab);
    window.dispatchEvent(new CustomEvent("finanzapp-tab-change", { detail: tab }));
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url.toString());
  };

  const loadSummary = useCallback(async () => {
    try {
      const [resSummary, resCats] = await Promise.all([
        fetch("/api/summary", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
      ]);
      if (resSummary.ok) {
        const data = await resSummary.json();
        if (data && typeof data.total_balance === 'number') {
          let finalData = data;
          setSummary((prev) => {
            if (
              prev &&
              prev.total_balance !== 0 &&
              finalData.total_balance === 0 &&
              (finalData.income_30d === 0 && finalData.expense_30d === 0) &&
              (prev.income_30d > 0 || prev.expense_30d > 0)
            ) {
              finalData = prev;
              return prev;
            }
            return finalData;
          });
          
          setTimeout(() => {
            localStorage.setItem("finanzapp_last_summary", JSON.stringify(finalData));
          }, 0);
        }
      } else {
        const cached = localStorage.getItem("finanzapp_last_summary");
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && typeof parsed.total_balance === 'number') {
              setSummary(parsed);
            }
          } catch { /* ignore */ }
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
        } catch { /* ignore */ }
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

  const MODULAR_TABS = [
    { id: "finanzas" as ModularTab, label: "Finanzas", icon: Wallet, color: "text-emerald-400" },
    { id: "trabajo" as ModularTab, label: "Trabajo", icon: Clock, color: "text-blue-400" },
    { id: "asistente" as ModularTab, label: "Asistente IA", icon: Sparkles, color: "text-purple-400" },
    { id: "radar" as ModularTab, label: "Radar", icon: Radar, color: "text-rose-400" },
  ];

  return (
    <div className="flex flex-col">
      <Header
        title={`${greeting}! 👋`}
        subtitle={dateSubtitle || "Tu panel de finanzas y horarios"}
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
        <div className="flex-1 px-4 pt-3 pb-36 space-y-4 max-w-5xl mx-auto w-full">
          {/* Switcher de Pestañas Modular (60 FPS & Cero Saturación) */}
          <div className="flex items-center justify-between p-1.5 rounded-2xl bg-neutral-900/80 border border-white/10 backdrop-blur-xl gap-1 overflow-x-auto no-scrollbar shadow-sm">
            {MODULAR_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => switchTab(tab.id)}
                  className={`flex-1 min-h-[46px] py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                    isActive
                      ? "bg-white/[0.08] text-white shadow-sm border border-white/15"
                      : "text-neutral-400 hover:text-white hover:bg-white/[0.03]"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? tab.color : "text-neutral-400"}`} />
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* =============================================================== */}
          {/* 1. PESTAÑA: FINANZAS (Balance, Dinero Libre, MP y Movimientos) */}
          {/* =============================================================== */}
          {activeTab === "finanzas" && (
            <div className="space-y-4 animate-fade-in">
              <SmartRemindersBanner onNavigateTab={(t) => switchTab(t as ModularTab)} />

              {/* Coach IA Smart Tip */}
              <ErrorBoundary fallbackTitle="Error en sugerencias" fallbackMessage="Las sugerencias no pudieron cargarse.">
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

              {/* Balance Total + Ingresos vs Gastos */}
              <ErrorBoundary fallbackTitle="Error en el balance" fallbackMessage="El balance no pudo renderizarse.">
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

              {/* Botón 3D Mercado Pago Escáner (Google Stitch GEL-045) */}
              <div className="animate-slide-up">
                <button
                  type="button"
                  onClick={() => setShowMPModal(true)}
                  className="w-full relative group overflow-hidden rounded-2xl p-0.5 bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 shadow-[0_12px_28px_-6px_rgba(16,185,129,0.35)] transition-all duration-200 active:scale-[0.98] cursor-pointer"
                >
                  <div className="relative flex items-center justify-between px-4 py-3.5 rounded-[14px] bg-[#101419]/90 backdrop-blur-2xl">
                    {/* Icon with 3D ambient backlight glow */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-400/20 border border-emerald-400/40 shadow-[0_0_16px_rgba(78,222,163,0.4)] shrink-0">
                        <UploadCloud className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="flex flex-col text-left min-w-0">
                        <span className="text-sm sm:text-base text-white font-bold tracking-tight truncate">
                          Escanear Comprobante MP
                        </span>
                        <span className="text-[11px] sm:text-xs font-mono text-neutral-400 truncate">
                          OCR instantáneo &amp; categorización IA
                        </span>
                      </div>
                    </div>
                    {/* Trailing Action Pill */}
                    <div className="flex items-center gap-1 bg-emerald-400/10 border border-emerald-400/30 px-3 py-1.5 rounded-full text-emerald-400 font-mono text-[10px] font-bold shadow-[0_0_10px_rgba(78,222,163,0.15)] shrink-0">
                      <span>SCAN</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </button>
              </div>

              {/* Proyección de Dinero Libre Real */}
              <ErrorBoundary fallbackTitle="Error en proyección" fallbackMessage="La proyección de flujo de fondos no pudo calcularse.">
                <div className="animate-slide-up">
                  <CashFlowProjectionCard summary={summary} />
                </div>
              </ErrorBoundary>

              {/* Gráfico y Movimientos Recientes */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 animate-slide-up">
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

              {/* Metas de Ahorro */}
              <FreemiumGate action="manage_goals" className="animate-slide-up">
                <ErrorBoundary fallbackTitle="Error en metas" fallbackMessage="Las metas no pudieron renderizarse.">
                  <DashboardGoalsSection
                    goals={summary?.savings_goals || []}
                    salary={summary?.configured_salary || summary?.income_30d || 980000}
                    onRefresh={loadSummary}
                  />
                </ErrorBoundary>
              </FreemiumGate>

              {/* Sección Avanzada (Cuotas) */}
              <FreemiumGate action="manage_installments" className="animate-slide-up">
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all cursor-pointer bg-neutral-900/60 border border-white/[0.08] text-neutral-400 hover:text-white hover:bg-neutral-900/90 shadow-sm"
                  >
                    {showAdvanced ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Ocultar compras en cuotas
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Ver compras en cuotas activas
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

          {/* =============================================================== */}
          {/* 2. PESTAÑA: TRABAJO (Horarios, Franco, Cobro y Auditor Laboral) */}
          {/* =============================================================== */}
          {activeTab === "trabajo" && (
            <div className="space-y-4 animate-fade-in">
              <SmartRemindersBanner onNavigateTab={(t) => switchTab(t as ModularTab)} />

              {/* Tarjeta de Sueldo & 5to Día Hábil */}
              <ErrorBoundary fallbackTitle="Error en sueldo" fallbackMessage="La tarjeta de sueldo no pudo cargarse.">
                <div className="animate-slide-up">
                  <SalaryCard
                    initialSalary={summary?.configured_salary || summary?.income_30d || 0}
                    onSalaryUpdated={() => loadSummary()}
                  />
                </div>
              </ErrorBoundary>

              {/* Auditor Laboral: Horas Trabajadas vs Horas Liquidadas (FEATURE 1) */}
              <ErrorBoundary fallbackTitle="Error en auditor laboral" fallbackMessage="El módulo de auditoría laboral no pudo cargarse.">
                <div className="animate-slide-up">
                  <LaborAuditorCard />
                </div>
              </ErrorBoundary>

              {/* Horarios de Trabajo con Francos Semanales */}
              <ErrorBoundary fallbackTitle="Error en horarios" fallbackMessage="El cronograma de horarios no pudo cargarse.">
                <div className="animate-slide-up">
                  <WorkScheduleCard />
                </div>
              </ErrorBoundary>
            </div>
          )}

          {/* =============================================================== */}
          {/* 3. PESTAÑA: ASISTENTE (Chat NotebookLM + Audio Resumen Semanal) */}
          {/* =============================================================== */}
          {activeTab === "asistente" && (
            <div className="space-y-4 animate-fade-in">
              <ErrorBoundary fallbackTitle="Error en Asistente IA" fallbackMessage="El chat con IA no pudo cargarse.">
                <div className="animate-slide-up">
                  <FinancialAuditorChat onDataRefresh={loadSummary} />
                </div>
              </ErrorBoundary>
            </div>
          )}

          {/* =============================================================== */}
          {/* 4. PESTAÑA: RADAR (Suscripciones, Débitos, Aumentos y Alertas) */}
          {/* =============================================================== */}
          {activeTab === "radar" && (
            <div className="space-y-4 animate-fade-in">
              <SmartRemindersBanner onNavigateTab={(t) => switchTab(t as ModularTab)} />

              {/* Radar de Suscripciones & Débitos Automáticos (FEATURE 4) */}
              <ErrorBoundary fallbackTitle="Error en Radar" fallbackMessage="El radar de suscripciones no pudo cargarse.">
                <div className="animate-slide-up">
                  <SubscriptionRadarCard />
                </div>
              </ErrorBoundary>
            </div>
          )}
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

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
