"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { GlobalAIAssistant } from "@/components/ai/GlobalAIAssistant";
import { useViewMode } from "@/components/providers/ViewModeProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { viewMode } = useViewMode();
  const isDesktopMode = viewMode === "desktop";

  return (
    <div
      className={`flex min-h-dvh ${
        isDesktopMode
          ? "desktop-view-forced min-w-[960px] overflow-x-auto"
          : "w-full max-w-full overflow-x-hidden"
      }`}
      style={{ background: "hsl(var(--background))" }}
    >
      {/* Desktop Sidebar (visible en modo desktop o en pantallas grandes) */}
      <Sidebar forceVisible={isDesktopMode} />

      {/* Main content */}
      <main
        className={`flex-1 flex flex-col min-w-0 ${
          isDesktopMode ? "pb-8" : "pb-24 sm:pb-28 lg:pb-8"
        }`}
      >
        {children}
      </main>

      {/* Mobile Bottom Nav (visible solo en modo móvil) */}
      {!isDesktopMode && <BottomNav />}

      {/* Asistente IA Global (Ventana Flotante + Botón) */}
      <GlobalAIAssistant />
    </div>
  );
}
