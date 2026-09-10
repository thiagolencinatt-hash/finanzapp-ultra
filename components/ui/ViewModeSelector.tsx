"use client";

import { useViewMode } from "@/components/providers/ViewModeProvider";
import { Smartphone, Monitor } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ViewModeSelectorProps {
  className?: string;
  compact?: boolean;
}

export function ViewModeSelector({ className, compact = false }: ViewModeSelectorProps) {
  const { viewMode, setViewMode } = useViewMode();

  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center p-1 rounded-xl bg-card/80 border border-white/10 shadow-sm",
          className
        )}
      >
        <button
          type="button"
          onClick={() => setViewMode("mobile")}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
            viewMode === "mobile"
              ? "bg-primary text-black shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          title="Ver versión optimizada para celulares"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Móvil</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode("desktop")}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
            viewMode === "desktop"
              ? "bg-primary text-black shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          title="Ver versión completa de computadora"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">PC</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between p-3 rounded-2xl bg-card/60 border border-white/10 gap-2.5",
        className
      )}
    >
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
        <span>Diseño de pantalla:</span>
      </div>

      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/5 w-full sm:w-auto">
        <button
          type="button"
          onClick={() => setViewMode("mobile")}
          className={cn(
            "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer",
            viewMode === "mobile"
              ? "gradient-primary text-black shadow-md"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>📱 Modo Celular</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode("desktop")}
          className={cn(
            "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer",
            viewMode === "desktop"
              ? "gradient-primary text-black shadow-md"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>💻 Modo Computadora</span>
        </button>
      </div>
    </div>
  );
}
