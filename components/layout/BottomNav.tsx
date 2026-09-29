"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { 
  Wallet, 
  Clock, 
  Sparkles, 
  Radar, 
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { QuickExpenseModal } from "./QuickExpenseModal";

export type ModularTab = "finanzas" | "trabajo" | "asistente" | "radar";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ModularTab>("finanzas");
  const [showQuickModal, setShowQuickModal] = useState(false);

  // Sincronizar pestaña activa de forma segura en cliente sin romper prerender
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const currentParam = params.get("tab") as ModularTab;
      if (currentParam && ["finanzas", "trabajo", "asistente", "radar"].includes(currentParam)) {
        setActiveTab(currentParam);
      }
    }

    const handleTabChange = (e: CustomEvent<ModularTab>) => {
      if (e.detail && ["finanzas", "trabajo", "asistente", "radar"].includes(e.detail)) {
        setActiveTab(e.detail);
      }
    };

    window.addEventListener("finanzapp-tab-change" as any, handleTabChange);
    return () => window.removeEventListener("finanzapp-tab-change" as any, handleTabChange);
  }, [pathname]);

  const handleSelectTab = (tab: ModularTab) => {
    setActiveTab(tab);
    window.dispatchEvent(new CustomEvent("finanzapp-tab-change", { detail: tab }));

    if (pathname === "/") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState(null, "", url.toString());
    } else {
      router.push(`/?tab=${tab}`);
    }
  };

  const TABS = [
    {
      id: "finanzas" as ModularTab,
      label: "Finanzas",
      icon: Wallet,
      color: "text-emerald-400",
      activeBg: "bg-emerald-500/15 border-emerald-500/30",
    },
    {
      id: "trabajo" as ModularTab,
      label: "Trabajo",
      icon: Clock,
      color: "text-blue-400",
      activeBg: "bg-blue-500/15 border-blue-500/30",
    },
    {
      id: "asistente" as ModularTab,
      label: "Asistente",
      icon: Sparkles,
      color: "text-purple-400",
      activeBg: "bg-purple-500/15 border-purple-500/30",
    },
    {
      id: "radar" as ModularTab,
      label: "Radar",
      icon: Radar,
      color: "text-rose-400",
      activeBg: "bg-rose-500/15 border-rose-500/30",
    },
  ];

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe bg-[#090D14]/90 backdrop-blur-2xl border-t border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.6)] select-none"
      >
        <div className="grid grid-cols-4 items-center px-1.5 h-[64px]">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = (pathname === "/" && activeTab === tab.id);

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center h-[52px] py-1 px-1 rounded-2xl transition-all duration-200 active:scale-90 touch-manipulation cursor-pointer relative",
                  isActive
                    ? `${tab.color} font-bold`
                    : "text-neutral-400 hover:text-neutral-200"
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-xl transition-all",
                    isActive ? tab.activeBg + " border" : "bg-transparent"
                  )}
                >
                  <Icon className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[11px] font-semibold tracking-tight mt-0.5">
                  {tab.label}
                </span>

                {/* Micro indicador activo */}
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-current absolute bottom-0.5 shadow-sm" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modal de Carga Rápida */}
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
