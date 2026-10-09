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

  const triggerHaptic = (ms = 10) => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Fallback seguro si la plataforma no soporta o bloquea la vibración
      }
    }
  };

  const handleSelectTab = (tab: ModularTab) => {
    triggerHaptic(8);
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

  const handleOpenQuickModal = () => {
    triggerHaptic(12);
    setShowQuickModal(true);
  };

  const LEFT_TABS = [
    {
      id: "finanzas" as ModularTab,
      label: "Finanzas",
      icon: Wallet,
      color: "text-emerald-400",
    },
    {
      id: "trabajo" as ModularTab,
      label: "Trabajo",
      icon: Clock,
      color: "text-blue-400",
    },
  ];

  const RIGHT_TABS = [
    {
      id: "asistente" as ModularTab,
      label: "Asistente",
      icon: Sparkles,
      color: "text-purple-400",
    },
    {
      id: "radar" as ModularTab,
      label: "Radar",
      icon: Radar,
      color: "text-rose-400",
    },
  ];

  const renderTabButton = (tab: typeof LEFT_TABS[0]) => {
    const Icon = tab.icon;
    const isActive = pathname === "/" && activeTab === tab.id;

    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => handleSelectTab(tab.id)}
        className={cn(
          "flex-1 flex flex-col items-center justify-center transition-all duration-150 ease-out active:scale-95 touch-manipulation cursor-pointer relative py-1 px-1.5 min-w-0",
          isActive
            ? "bg-emerald-400/15 text-emerald-400 rounded-full shadow-[0_0_16px_rgba(78,222,163,0.25)] border border-emerald-400/30 font-bold"
            : "text-neutral-400 hover:text-neutral-200"
        )}
      >
        <Icon className="w-5 h-5 stroke-[2.2] shrink-0" />
        <span className="font-mono uppercase tracking-wider text-[9.5px] mt-0.5 truncate max-w-full">
          {tab.label}
        </span>
      </button>
    );
  };

  return (
    <>
      <nav
        aria-label="Navegación Principal"
        className="lg:hidden fixed bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))] left-0 right-0 w-[calc(100%-2rem)] max-w-md mx-auto z-50 bg-neutral-950/80 backdrop-blur-2xl rounded-full border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_20px_rgba(16,185,129,0.06)] ring-1 ring-white/10 px-2 py-1.5 flex items-center justify-between select-none"
      >
        {/* Pestañas Izquierdas */}
        <div className="flex-1 flex items-center justify-around min-w-0">
          {LEFT_TABS.map(renderTabButton)}
        </div>

        {/* Botón Central Flotante de Carga Rápida (3D Spatial Luxury) */}
        <div className="relative -my-3.5 mx-1.5 flex items-center justify-center shrink-0">
          {/* Spatial Emerald Glow Aura */}
          <div
            className="absolute inset-0 rounded-full bg-emerald-500/35 blur-lg -z-10 animate-pulse pointer-events-none"
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={handleOpenQuickModal}
            aria-label="Carga rápida de transacción (gasto o ingreso)"
            title="Nueva Transacción Rápida"
            className={cn(
              "relative flex items-center justify-center",
              "w-12 h-12 rounded-full",
              "bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-300",
              "text-neutral-950",
              "shadow-[0_8px_24px_-4px_rgba(78,222,163,0.7),0_0_16px_rgba(78,222,163,0.4)]",
              "ring-4 ring-[#0b0e13]/90 backdrop-blur-xl",
              "border border-white/50",
              "active:scale-90 hover:scale-105 active:shadow-[0_4px_16px_rgba(78,222,163,0.9)]",
              "transition-all duration-200 cursor-pointer touch-manipulation group select-none"
            )}
          >
            {/* Micro-borde especular superior 3D */}
            <span
              className="absolute inset-x-2 top-0.5 h-3 rounded-t-full bg-gradient-to-b from-white/45 to-transparent pointer-events-none"
              aria-hidden="true"
            />
            <Plus className="w-6 h-6 stroke-[3] text-neutral-950 transition-transform duration-200 group-hover:rotate-90 group-active:scale-90" />
          </button>
        </div>

        {/* Pestañas Derechas */}
        <div className="flex-1 flex items-center justify-around min-w-0">
          {RIGHT_TABS.map(renderTabButton)}
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
