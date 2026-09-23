"use client";

import { useState, useEffect } from "react";
import { Sparkles, Bot } from "lucide-react";
import { AIAssistantModal } from "./AIAssistantModal";

// Helper global para abrir el Asistente IA desde cualquier botón o componente
export function openAIAssistant(prompt?: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("open-ai-assistant", { detail: { prompt } })
    );
  }
}

export function GlobalAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>(undefined);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ prompt?: string }>;
      if (customEvent.detail?.prompt) {
        setInitialPrompt(customEvent.detail.prompt);
      }
      setIsOpen(true);
    };

    window.addEventListener("open-ai-assistant", handleOpen);
    return () => window.removeEventListener("open-ai-assistant", handleOpen);
  }, []);

  if (!mounted) return null;

  return (
    <>
      {/* Botón flotante visible en desktop (en móvil se usa la barra inferior BottomNav) */}
      <div className="hidden lg:block fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => {
            setInitialPrompt(undefined);
            setIsOpen((prev) => !prev);
          }}
          className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-zinc-950 border border-emerald-500/30 text-emerald-400 shadow-[0_8px_30px_rgba(16,185,129,0.2)] hover:shadow-[0_12px_40px_rgba(16,185,129,0.3)] hover:-translate-y-1 active:scale-95 transition-all duration-300 cursor-pointer ring-1 ring-emerald-500/30"
          title="Abrir Asistente Financiero con Inteligencia Artificial"
        >
          {/* Anillo de pulso sutil */}
          <span className="absolute -inset-1 rounded-full bg-emerald-500/20 blur-md opacity-50 group-hover:opacity-100 animate-pulse pointer-events-none" />

          <div className="relative flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-full overflow-hidden shadow-md border border-emerald-500/30 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/ai-dollar-icon.jpg"
                alt="Dólar IA"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            </div>
            <span className="text-xs font-bold tracking-wide hidden sm:inline text-emerald-400">
              Asistente IA
            </span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
        </button>
      </div>

      {/* Ventana flotante interactiva y arrastrable */}
      <AIAssistantModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialPrompt={initialPrompt}
      />
    </>
  );
}
