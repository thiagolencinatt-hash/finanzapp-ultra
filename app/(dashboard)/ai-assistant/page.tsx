"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { ChatMessage } from "@/components/ai/ChatMessage";
import { ChatInput } from "@/components/ai/ChatInput";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { Bot, Sparkles, TrendingUp, CreditCard, Target, Lightbulb } from "lucide-react";

const SESSION_ID = "main";

const QUICK_ACTIONS = [
  { icon: TrendingUp, label: "Ver mi resumen financiero", prompt: "Dame un resumen completo de mi situación financiera actual" },
  { icon: CreditCard, label: "¿Cuánto debo en cuotas?", prompt: "¿Cuánto tengo comprometido en cuotas este mes y los próximos?" },
  { icon: Target, label: "Analizar mis gastos", prompt: "Analizá mis gastos de los últimos 30 días y detectá patrones" },
  { icon: Lightbulb, label: "Consejos de ahorro", prompt: "Dame 3 consejos personalizados para ahorrar más basándote en mis gastos" },
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Cargar historial al inicio
  useEffect(() => {
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
  }, []);

  // Auto-scroll al final
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessageType = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
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
        body: JSON.stringify({ message: text, session_id: SESSION_ID }),
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
  }, [loading]);

  const isEmpty = messages.length === 0 && historyLoaded;

  return (
    <div className="flex flex-col h-dvh lg:h-screen">
      <Header title="Asistente IA" subtitle="Powered by Gemini" />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          /* Empty state — welcome */
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-lg">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: "hsl(var(--foreground))" }}>
              ¡Hola! Soy tu FinanzApp AI
            </h2>
            <p className="text-sm max-w-xs mb-8" style={{ color: "hsl(var(--muted-foreground))" }}>
              Podés decirme cosas como{" "}
              <em>&quot;Anotá un gasto de $5000 en comida con MP&quot;</em>{" "}
              o{" "}
              <em>&quot;Compré una zapatilla en 3 cuotas sin interés de $30.000&quot;</em>
            </p>

            {/* Quick actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => sendMessage(action.prompt)}
                  className="flex items-center gap-3 p-3 rounded-xl text-left transition-all card-hover"
                  style={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "hsl(var(--primary) / 0.15)" }}>
                    <action.icon className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: "hsl(var(--foreground))" }}>
                    {action.label}
                  </span>
                  <Sparkles className="w-3 h-3 ml-auto flex-shrink-0" style={{ color: "hsl(var(--primary))" }} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4 max-w-3xl mx-auto">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-4 pb-safe" style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card) / 0.8)", backdropFilter: "blur(12px)" }}>
        <div className="max-w-3xl mx-auto">
          <ChatInput onSend={sendMessage} disabled={loading} />
        </div>
      </div>
    </div>
  );
}
