"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { DashboardBudgetsSection } from "@/components/dashboard/DashboardBudgetsSection";
import type { CategoryBudget, Category } from "@/lib/types";

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [resBudgets, resCats] = await Promise.all([
        fetch("/api/budgets"),
        fetch("/api/categories"),
      ]);
      if (resBudgets.ok) setBudgets(await resBudgets.json());
      if (resCats.ok) setCategories(await resCats.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleExternalRefresh = () => loadData();
    window.addEventListener("finance-refresh", handleExternalRefresh);
    return () => window.removeEventListener("finance-refresh", handleExternalRefresh);
  }, [loadData]);

  return (
    <div className="flex flex-col">
      <Header
        title="Presupuestos"
        subtitle="Controlá tus límites de gasto por categoría"
      />

      {loading ? (
        <div className="flex-1 p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto w-full animate-pulse">
          <div className="h-64 rounded-3xl bg-card border border-white/5" />
        </div>
      ) : (
        <div className="flex-1 p-3 sm:p-5 lg:p-6 space-y-3.5 sm:space-y-5 max-w-4xl mx-auto w-full animate-slide-up">
          <DashboardBudgetsSection
            budgets={budgets}
            categories={categories}
            onRefresh={loadData}
          />
        </div>
      )}
    </div>
  );
}
