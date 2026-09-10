"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils/currency";
import { Sparkles } from "lucide-react";

interface CategoryData {
  category_name: string;
  total: number;
  count: number;
}

interface SpendingChartProps {
  categories: CategoryData[];
}

const COLORS = [
  "#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#3B82F6", "#F97316", "#14B8A6", "#84CC16",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        className="glass-strong rounded-xl px-4 py-3 shadow-xl"
        style={{ border: "1px solid hsl(var(--border))" }}
      >
        <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
          {data.category_name}
        </p>
        <p className="text-lg font-bold mt-0.5 text-primary">
          {formatCurrency(data.total)}
        </p>
        <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
          {data.count} transacciones
        </p>
      </div>
    );
  }
  return null;
};

export function SpendingChart({ categories }: SpendingChartProps) {
  const total = categories.reduce((sum, c) => sum + c.total, 0);

  if (categories.length === 0 || total === 0) {
    return (
      <div
        className="rounded-3xl p-6 h-64 flex flex-col items-center justify-center text-center glass shadow-lg"
        style={{ border: "1px solid hsl(var(--border) / 0.5)" }}
      >
        <div className="w-12 h-12 rounded-2xl bg-income/15 text-income flex items-center justify-center mb-3">
          <Sparkles className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-foreground">
          ¡Sin gastos registrados este mes! 🎉
        </p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Tenés el 100% de tus ingresos disponibles. Los gastos se graficarán automáticamente solo cuando decidas registrarlos.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 glass shadow-lg"
      style={{ border: "1px solid hsl(var(--border) / 0.5)" }}
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-sm sm:text-base font-bold" style={{ color: "hsl(var(--foreground))" }}>
          Gastos por categoría
        </h2>
        <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-white/5 text-muted-foreground">
          últimos 30 días
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center">
        <div className="w-full sm:w-48 h-44 sm:h-48 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categories}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
                dataKey="total"
                nameKey="category_name"
              >
                {categories.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Leyenda */}
        <div className="flex-1 space-y-2 w-full">
          {categories.map((cat, i) => (
            <div key={cat.category_name} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>
                    {cat.category_name}
                  </span>
                  <span className="text-xs font-bold flex-shrink-0" style={{ color: COLORS[i % COLORS.length] }}>
                    {formatCurrency(cat.total, "ARS", true)}
                  </span>
                </div>
                <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${total > 0 ? (cat.total / total) * 100 : 0}%`,
                      background: COLORS[i % COLORS.length],
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
