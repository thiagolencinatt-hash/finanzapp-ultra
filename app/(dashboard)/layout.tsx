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
      className={`relative flex min-h-dvh bg-[#0b0e13] text-[#e0e2ea] selection:bg-[#10b981] selection:text-[#00422b] ${
        isDesktopMode
          ? "desktop-view-forced min-w-[960px] overflow-x-auto"
          : "w-full max-w-full overflow-x-hidden"
      }`}
    >
      {/* Spatial Void Ambient Lighting Meshes (Google Stitch 3D Spatial Luxury) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[340px] h-[340px] bg-[#4edea3]/10 rounded-full blur-[110px]" />
        <div className="absolute top-[420px] -right-20 w-[280px] h-[280px] bg-[#3131c0]/20 rounded-full blur-[120px]" />
        <div className="absolute top-[800px] -left-24 w-[300px] h-[300px] bg-[#10b981]/10 rounded-full blur-[130px]" />
      </div>

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
