"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ChatMessage } from "@/components/ai/ChatMessage";
import { ChatInput } from "@/components/ai/ChatInput";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { Bot, Sparkles, TrendingUp, CreditCard, Target, Lightbulb } from "lucide-react";
import { FreemiumBanner } from "@/components/ui/FreemiumGate";
import { isDemoUser, DEMO_LIMITS } from "@/lib/freemium";
import { DraggableWindow } from "@/components/ui/DraggableWindow";

const SESSION_ID = "main";

const QUICK_ACTIONS = [
  { icon: TrendingUp, label: "Resumen financiero", prompt: "Dame un resumen completo de mi situación financiera actual" },
  { icon: CreditCard, label: "Deudas en cuotas", prompt: "¿Cuánto tengo comprometido en cuotas este mes y los próximos?" },
  { icon: Target, label: "Analizar gastos", prompt: "Analizá mis gastos de los últimos 30 días y detectá patrones" },
  { icon: Lightbulb, label: "Consejos de ahorro", prompt: "Dame 3 consejos personalizados para ahorrar más basándote en mis gastos" },
];

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
}

export function AIAssistantModal({ isOpen, onClose, initialPrompt }: AIAssistantModalProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialPromptSent = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      initialPromptSent.current = false;
      return;
    }
    fetch(`/api/ai-assistant?session_id=${SESSION_ID}&limit=30`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMessages(
            data.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: new Date(m.created_at),
              actions: m.metadata?.actions || [],
            }))
          );
        }
      })
      .finally(() => setHistoryLoaded(true));
  }, [isOpen]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const sendMessage = useCallback(async (text: string, imageBase64?: string, imageMimeType?: string) => {
    if ((!text.trim() && !imageBase64) || loading) return;

    const userMsgCount = messages.filter((m) => m.role === "user").length;
    if (isDemoUser() && userMsgCount >= DEMO_LIMITS.MAX_AI_MESSAGES) {
      return; 
    }

    const userMsg: ChatMessageType = {
      id: crypto.randomUUID(),
      role: "user",
      content: text || (imageBase64 ? "📷 Imagen adjunta" : ""),
      timestamp: new Date(),
      imagePreview: imageBase64 ? `data:${imageMimeType || "image/jpeg"};base64,${imageBase64}` : undefined,
    };

    const loadingMsg: ChatMessageType = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text || "Analizá esta imagen",
          session_id: SESSION_ID,
          image_base64: imageBase64,
          image_mime_type: imageMimeType || "image/jpeg",
        }),
      });
      const data = await res.json();

      setMessages((prev) =>
        prev.map((m) =>
          m.isLoading
            ? {
                id: crypto.randomUUID(),
                role: "assistant" as const,
                content: data.message || data.error || "Error al procesar",
                timestamp: new Date(),
                actions: data.actions || [],
              }
            : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.isLoading
            ? { ...m, isLoading: false, content: "❌ Error de conexión. Verificá tu conexión a internet." }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  }, [loading, messages]);

  useEffect(() => {
    if (isOpen && initialPrompt && historyLoaded && !initialPromptSent.current) {
      initialPromptSent.current = true;
      sendMessage(initialPrompt);
    }
  }, [isOpen, initialPrompt, historyLoaded, sendMessage]);

  const isEmpty = messages.length === 0 && historyLoaded;

  return (
    <DraggableWindow
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md overflow-hidden border border-emerald-400/50 flex-shrink-0 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ai-dollar-icon.jpg" alt="AI Dólar" className="w-full h-full object-cover" />
          </div>
          <span className="font-extrabold tracking-tight">FinanzApp AI Coach</span>
        </div>
      }
      windowId="ai-assistant-modal"
      defaultPosition={{ x: 0, y: 0 }}
      className="w-full sm:w-[580px] h-[85vh] max-h-[720px]"
      footer={
        <div className="w-full">
          <ChatInput
            onSend={sendMessage}
            disabled={loading || (isDemoUser() && messages.filter((m) => m.role === "user").length >= DEMO_LIMITS.MAX_AI_MESSAGES)}
          />
        </div>
      }
    >
      <div className="flex flex-col h-full min-h-[300px]">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="relative mb-4 group cursor-pointer">
              <div className="absolute -inset-2 rounded-3xl bg-emerald-500/25 blur-lg opacity-75 group-hover:opacity-100 transition-opacity animate-pulse" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/ai-dollar-icon.jpg"
                alt="Dólar Asistente IA"
                className="relative w-20 h-20 rounded-2xl object-cover shadow-2xl border-2 border-emerald-400/60 transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <h2 className="text-xl font-bold mb-2 text-foreground">
              ¡Hola! Soy tu FinanzApp AI
            </h2>
            <p className="text-sm max-w-xs mb-8 text-muted-foreground">
              Podés decirme cosas como{" "}
              <em>&quot;Anotá un gasto de $5000 en comida con MP&quot;</em>{" "}
              o{" "}
              <em>&quot;Compré una zapatilla en 3 cuotas sin interés de $30.000&quot;</em>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => sendMessage(action.prompt)}
                  className="flex items-center gap-3 p-3 rounded-xl text-left transition-all card-hover cursor-pointer bg-card border border-white/10"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/15">
                    <action.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-foreground">
                    {action.label}
                  </span>
                  <Sparkles className="w-3 h-3 ml-auto flex-shrink-0 text-primary" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4 max-w-3xl mx-auto w-full pb-20">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isDemoUser() && messages.filter((m) => m.role === "user").length >= DEMO_LIMITS.MAX_AI_MESSAGES && (
              <FreemiumBanner
                action="use_ai_chat"
                context={{ currentCount: messages.filter((m) => m.role === "user").length }}
              />
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </DraggableWindow>
  );
}
