"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { GlobalAIAssistant } from "@/components/ai/GlobalAIAssistant";
import { useViewMode } from "@/components/providers/ViewModeProvider";
import { SyncEngine } from "@/components/sync/SyncEngine";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { viewMode } = useViewMode();
  const isDesktopMode = viewMode === "desktop";
  const router = useRouter();

  useEffect(() => {
    const hasSession = document.cookie.includes("finance_session=") || document.cookie.includes("finance_demo_session=");
    if (!hasSession) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div
      className={`relative flex min-h-dvh bg-[#090D14] text-neutral-100 ${
        isDesktopMode
          ? "desktop-view-forced min-w-[960px] overflow-x-auto"
          : "w-full max-w-full overflow-x-hidden"
      }`}
    >
      {/* Resplandor ambiental de alta gama (Radial Glow Esmeralda) */}
      <div
        className="w-72 h-72 rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 z-0"
        aria-hidden="true"
      />

      {/* Desktop Sidebar (visible en modo desktop o en pantallas grandes) */}
      <Sidebar forceVisible={isDesktopMode} />

      {/* Main content */}
      <main
        className={`flex-1 flex flex-col min-w-0 relative z-10 ${
          isDesktopMode ? "pb-8" : "pb-24 sm:pb-28 lg:pb-8"
        }`}
      >
        {children}
      </main>

      {/* Mobile Bottom Nav (visible solo en modo móvil) */}
      {!isDesktopMode && <BottomNav />}

      {/* Asistente IA Global (Ventana Flotante + Botón) */}
      <GlobalAIAssistant />
      <SyncEngine />
    </div>
  );
}
