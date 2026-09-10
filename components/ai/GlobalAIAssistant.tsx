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
      {/* Botón flotante siempre visible (FAB) en la esquina inferior derecha */}
      <div className="fixed bottom-20 lg:bottom-6 right-5 z-40">
        <button
          type="button"
          onClick={() => {
            setInitialPrompt(undefined);
            setIsOpen((prev) => !prev);
          }}
          className="group relative flex items-center gap-2.5 px-4 py-3 rounded-2xl gradient-primary text-black font-extrabold shadow-2xl shadow-primary/40 hover:shadow-primary/60 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer border border-white/20"
          title="Abrir Asistente Financiero con Inteligencia Artificial"
        >
          {/* Anillo de pulso sutil */}
          <span className="absolute -inset-0.5 rounded-2xl bg-primary/40 blur-sm opacity-75 group-hover:opacity-100 animate-pulse pointer-events-none" />

          <div className="relative flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-xl overflow-hidden shadow-md border border-emerald-400/50 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/ai-dollar-icon.jpg"
                alt="Dólar IA"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            </div>
            <span className="text-xs font-black tracking-wide hidden sm:inline">
              Asistente IA
            </span>
            <Sparkles className="w-3.5 h-3.5 text-black" />
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
