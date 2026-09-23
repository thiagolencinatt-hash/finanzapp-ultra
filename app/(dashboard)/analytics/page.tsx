"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from "recharts";
import { TrendingUp, Calendar, Activity, PieChart as PieChartIcon } from "lucide-react";
import type { Transaction, Category } from "@/lib/types";
import { FreemiumGate } from "@/components/ui/FreemiumGate";
import { formatCurrency } from "@/lib/utils/currency";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

type TimeRange = "this_month" | "last_3_months" | "this_year";

export default function AnalyticsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<TimeRange>("this_month");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleRefresh = () => loadData();
    window.addEventListener("finance-refresh", handleRefresh);
    return () => window.removeEventListener("finance-refresh", handleRefresh);
  }, [loadData]);

  const filteredData = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    
    if (range === "this_month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (range === "last_3_months") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    } else if (range === "this_year") {
      startDate = new Date(now.getFullYear(), 0, 1);
    }
    
    const startIso = startDate.toISOString().split("T")[0];
    return transactions.filter(t => t.date >= startIso);
  }, [transactions, range]);

  const analytics = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    const expenseByCategory: Record<string, number> = {};
    const trendByMonth: Record<string, { month: string; income: number; expense: number }> = {};

    filteredData.forEach(t => {
      const amount = Number(t.amount) || 0;
      const monthKey = t.date.substring(0, 7); // YYYY-MM
      
      if (!trendByMonth[monthKey]) {
        trendByMonth[monthKey] = { month: monthKey, income: 0, expense: 0 };
      }

      if (t.type === "income") {
        totalIncome += amount;
        trendByMonth[monthKey].income += amount;
      } else if (t.type === "expense") {
        totalExpense += amount;
        trendByMonth[monthKey].expense += amount;
        
        if (t.category_id) {
          expenseByCategory[t.category_id] = (expenseByCategory[t.category_id] || 0) + amount;
        }
      }
    });

    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
    
    // Calculate days elapsed in range
    const now = new Date();
    let startDate = new Date();
    if (range === "this_month") startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (range === "last_3_months") startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    else if (range === "this_year") startDate = new Date(now.getFullYear(), 0, 1);
    
    const daysElapsed = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const dailyAvg = totalExpense / daysElapsed;

    // Top Category
    let topCatId = "";
    let topCatAmount = 0;
    Object.entries(expenseByCategory).forEach(([id, amt]) => {
      if (amt > topCatAmount) {
        topCatAmount = amt;
        topCatId = id;
      }
    });
    const topCategory = categories.find(c => c.id === topCatId);

    // Pie Chart Data
    const pieData = Object.entries(expenseByCategory)
      .map(([id, value]) => {
        const cat = categories.find(c => c.id === id);
        return {
          name: cat ? cat.name : "Otros",
          value,
          color: cat ? cat.color : "#666"
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8

    // Bar Chart Data
    const barData = Object.values(trendByMonth).sort((a, b) => a.month.localeCompare(b.month));

    return {
      savingsRate,
      dailyAvg,
      topCategory,
      topCatAmount,
      pieData,
      barData,
      totalIncome,
      totalExpense
    };
  }, [filteredData, categories, range]);

  return (
    <FreemiumGate action="view_analytics">
      <div className="flex flex-col h-full overflow-y-auto pb-20 md:pb-6">
        <Header
          title="Analíticas Avanzadas"
          subtitle="Monitorea tus tendencias y salud financiera"
        />

        <div className="p-4 lg:p-6 space-y-6">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setRange("this_month")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  range === "this_month" ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-white"
                }`}
              >
                Este Mes
              </button>
              <button
                type="button"
                onClick={() => setRange("last_3_months")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  range === "last_3_months" ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-white"
                }`}
              >
                Últimos 3 Meses
              </button>
              <button
                type="button"
                onClick={() => setRange("this_year")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  range === "this_year" ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-white"
                }`}
              >
                Este Año
              </button>
            </div>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="h-32 bg-white/5 rounded-3xl" />
                <div className="h-32 bg-white/5 rounded-3xl" />
                <div className="h-32 bg-white/5 rounded-3xl" />
              </div>
              <div className="h-80 bg-white/5 rounded-3xl" />
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-strong rounded-3xl p-5 border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <TrendingUp className="w-16 h-16 text-income" />
                  </div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Tasa de Ahorro</p>
                  <p className={`text-3xl font-black ${analytics.savingsRate >= 20 ? 'text-income' : analytics.savingsRate > 0 ? 'text-primary' : 'text-red-400'}`}>
                    {analytics.savingsRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ingresos: {formatCurrency(analytics.totalIncome, "ARS")} <br/>
                    Egresos: {formatCurrency(analytics.totalExpense, "ARS")}
                  </p>
                </div>

                <div className="glass-strong rounded-3xl p-5 border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Activity className="w-16 h-16 text-red-400" />
                  </div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Gasto Promedio Diario</p>
                  <p className="text-3xl font-black text-foreground">
                    {formatCurrency(analytics.dailyAvg, "ARS")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Ritmo de gasto del periodo
                  </p>
                </div>

                <div className="glass-strong rounded-3xl p-5 border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <PieChartIcon className="w-16 h-16 text-primary" />
                  </div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Mayor Consumo</p>
                  {analytics.topCategory ? (
                    <>
                      <p className="text-xl font-black truncate" style={{ color: analytics.topCategory.color }}>
                        {analytics.topCategory.name}
                      </p>
                      <p className="text-sm font-bold text-foreground mt-1">
                        {formatCurrency(analytics.topCatAmount, "ARS")}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-2">Sin datos suficientes</p>
                  )}
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Bar Chart - Tendencia */}
                <div className="lg:col-span-2 glass-strong rounded-3xl p-5 md:p-6 border border-white/5">
                  <h3 className="text-sm font-bold text-foreground mb-6 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Tendencia Histórica
                  </h3>
                  <div className="h-72 w-full">
                    {analytics.barData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                          <XAxis dataKey="month" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
                          <Tooltip 
                            cursor={{ fill: '#ffffff10' }}
                            contentStyle={{ backgroundColor: '#121212', borderColor: '#333', borderRadius: '12px' }}
                            itemStyle={{ fontWeight: 'bold' }}
                            formatter={(val: any) => formatCurrency(Number(val) || 0, "ARS")}
                          />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                          <Bar dataKey="income" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="expense" name="Egresos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                        No hay datos en el periodo seleccionado
                      </div>
                    )}
                  </div>
                </div>

                {/* Pie Chart - Categorias */}
                <div className="glass-strong rounded-3xl p-5 md:p-6 border border-white/5 flex flex-col">
                  <h3 className="text-sm font-bold text-foreground mb-6 flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-primary" />
                    Distribución de Gastos
                  </h3>
                  <div className="flex-1 min-h-[250px] relative">
                    {analytics.pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {analytics.pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#121212', borderColor: '#333', borderRadius: '12px' }}
                            itemStyle={{ fontWeight: 'bold' }}
                            formatter={(val: any) => formatCurrency(Number(val) || 0, "ARS")}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                        No hay gastos
                      </div>
                    )}
                    {/* Custom Legend */}
                    {analytics.pieData.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2 justify-center max-h-32 overflow-y-auto custom-scrollbar">
                        {analytics.pieData.map((entry, index) => (
                          <div key={index} className="flex items-center gap-1.5 text-[10px] bg-black/40 px-2 py-1 rounded-lg">
                            <span className="w-2 h-2 rounded-full" style={{ background: entry.color || COLORS[index % COLORS.length] }} />
                            <span className="text-muted-foreground truncate max-w-[80px]">{entry.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </FreemiumGate>
  );
}
