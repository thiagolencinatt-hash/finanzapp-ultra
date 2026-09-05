"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ArrowUpDown, CreditCard, Target, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { QuickExpenseModal } from "./QuickExpenseModal";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [showQuickModal, setShowQuickModal] = useState(false);

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe shadow-2xl"
        style={{
          background: "hsl(var(--card) / 0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid hsl(var(--border) / 0.8)",
        }}
      >
        <div className="flex items-center justify-around px-2 py-2 relative">
          {/* Inicio */}
          <Link
            href="/"
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all duration-200 min-w-[54px]",
              pathname === "/" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Inicio</span>
          </Link>

          {/* Gastos */}
          <Link
            href="/transactions"
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all duration-200 min-w-[54px]",
              pathname.startsWith("/transactions")
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ArrowUpDown className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Gastos</span>
          </Link>

          {/* Floating Central Quick Action Button */}
          <div className="-mt-6 flex flex-col items-center">
            <button
              onClick={() => setShowQuickModal(true)}
              className="w-13 h-13 rounded-2xl gradient-primary flex items-center justify-center text-black shadow-lg shadow-primary/30 active:scale-95 transition-transform cursor-pointer"
              title="Registrar Gasto Rápido"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
            <span className="text-[9px] font-extrabold text-foreground mt-0.5 tracking-tight">
              Nuevo
            </span>
          </div>

          {/* Cuotas */}
          <Link
            href="/installments"
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all duration-200 min-w-[54px]",
              pathname.startsWith("/installments")
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CreditCard className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Cuotas</span>
          </Link>

          {/* Metas */}
          <Link
            href="/goals"
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all duration-200 min-w-[54px]",
              pathname.startsWith("/goals")
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Target className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Metas</span>
          </Link>
        </div>
      </nav>

      {/* Quick Modal */}
      {showQuickModal && (
        <QuickExpenseModal
          isOpen={showQuickModal}
          onClose={() => setShowQuickModal(false)}
          onSuccess={() => {
            router.refresh();
            // Dispatch a custom event so pages can re-fetch summary if needed
            window.dispatchEvent(new Event("finance-refresh"));
          }}
        />
      )}
    </>
  );
}
