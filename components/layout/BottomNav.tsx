"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ArrowUpDown, Bot, Target, Plus, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { QuickExpenseModal } from "./QuickExpenseModal";
import { openAIAssistant } from "../ai/GlobalAIAssistant";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [showQuickModal, setShowQuickModal] = useState(false);

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe bg-neutral-950/80 backdrop-blur-xl border-t border-white/10 shadow-2xl select-none"
      >
        <div className="flex items-center justify-around px-2 h-[68px] relative">
          {/* Inicio */}
          <Link
            href="/"
            className={cn(
              "flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-2xl transition-all duration-200 active:scale-95 touch-manipulation",
              pathname === "/" ? "text-primary font-bold" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[11px] font-semibold tracking-tight">Inicio</span>
          </Link>

          {/* Transacciones */}
          <Link
            href="/transactions"
            className={cn(
              "flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-2xl transition-all duration-200 active:scale-95 touch-manipulation",
              pathname.startsWith("/transactions")
                ? "text-primary font-bold"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <ArrowUpDown className="w-5 h-5" />
            <span className="text-[11px] font-semibold tracking-tight">Cargas</span>
          </Link>

          {/* Floating Central Quick Action Button */}
          <div className="-mt-6 flex flex-col items-center">
            <button
              type="button"
              onClick={() => setShowQuickModal(true)}
              className="w-[52px] h-[52px] rounded-full gradient-primary flex items-center justify-center text-black shadow-[0_8px_25px_rgba(16,185,129,0.35),0_0_15px_rgba(245,203,26,0.25)] active:scale-90 transition-transform cursor-pointer border border-white/20"
              title="Registrar Gasto Rápido"
            >
              <Plus className="w-6 h-6 stroke-[3]" />
            </button>
            <span className="text-[11px] font-extrabold text-zinc-200 mt-1 tracking-tight">
              Nuevo
            </span>
          </div>

          {/* Analíticas */}
          <Link
            href="/analytics"
            className={cn(
              "flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-2xl transition-all duration-200 active:scale-95 touch-manipulation",
              pathname.startsWith("/analytics")
                ? "text-primary font-bold"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <BarChart2 className="w-5 h-5" />
            <span className="text-[11px] font-semibold tracking-tight">Análisis</span>
          </Link>

          {/* IA Chat */}
          <button
            type="button"
            onClick={() => openAIAssistant()}
            className="flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-2xl transition-all duration-200 text-zinc-400 hover:text-zinc-200 active:scale-95 touch-manipulation cursor-pointer"
          >
            <div className="w-5 h-5 rounded-md overflow-hidden border border-emerald-400/40 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ai-dollar-icon.jpg" alt="IA Dólar" className="w-full h-full object-cover" />
            </div>
            <span className="text-[11px] tracking-tight font-bold text-emerald-400">Coach</span>
          </button>
        </div>
      </nav>

      {/* Quick Modal */}
      {showQuickModal && (
        <QuickExpenseModal
          isOpen={showQuickModal}
          onClose={() => setShowQuickModal(false)}
          onSuccess={() => {
            router.refresh();
            window.dispatchEvent(new Event("finance-refresh"));
          }}
        />
      )}
    </>
  );
}
