"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Bot, 
  Send, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Loader2, 
  User, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  RotateCcw,
  Play,
  Square
} from "lucide-react";
import { toast } from "sonner";
import type { ChatMessage } from "@/lib/types";

interface FinancialAuditorChatProps {
  onDataRefresh?: () => void;
}

export function FinancialAuditorChat({ onDataRefresh }: FinancialAuditorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioSummaryLoading, setAudioSummaryLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Quick Chips estilo NotebookLM
  const SUGGESTIONS = [
    "¿Cuánto gasté este mes y cuánto me queda?",
    "¿Qué días tengo horas nocturnas esta semana?",
    "¿Cuándo cobro el sueldo (5to día hábil)?",
    "¿Tengo diferencias en mis horas trabajadas?",
    "¿Cómo puedo ahorrar más esta semana?",
  ];

  // Cargar historial de chat existente
  useEffect(() => {
    fetch("/api/ai-assistant")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setMessages(data);
        } else {
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content:
                "👋 **¡Hola! Soy tu Auditor Financiero y Asistente Laboral con Gemini IA.**\n\nConozco tus gastos, sueldo, valor de hora y turnos laborales. ¿Qué te gustaría consultar hoy?",
            },
          ]);
        }
      })
      .catch(() => {
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: "👋 ¡Hola! ¿En qué te puedo asesorar sobre tus finanzas o turnos laborales hoy?",
          },
        ]);
      });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Enviar mensaje
  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    setInput("");
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo obtener respuesta.");
      }

      const botReply = data.message?.content || data.reply || data.content || "He procesado tu consulta.";
      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        role: "assistant",
        content: botReply,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      onDataRefresh?.();
    } catch (err: any) {
      toast.error(err.message || "Error al conectar con el Asistente IA.");
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "⚠️ Hubo un inconveniente al consultar con Gemini. Por favor intenta nuevamente.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Generar y reproducir Audio Resumen Semanal nativo con SpeechSynthesis
  const handlePlayAudioSummary = async () => {
    if (isPlayingAudio) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
      return;
    }

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Tu navegador no soporta síntesis de voz nativa.");
      return;
    }

    setAudioSummaryLoading(true);
    try {
      // Pedir a Gemini un resumen hablado conciso de 30-45 segundos
      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message:
            "Genera un guión breve de audio en español rioplatense (35 a 45 segundos) resumiendo: 1) Mi saldo o dinero libre actual, 2) Mis gastos recientes, 3) Cuándo es mi próximo turno laboral y si tengo horas nocturnas, 4) Cuándo cobro el sueldo (5to día hábil). Habla directo, claro y motivador. No uses formato markdown, ni asteriscos ni viñetas, solo texto fluido para ser leído en voz alta.",
        }),
      });

      const data = await res.json();
      let script = data.message?.content || data.reply || "";
      // Limpiar asteriscos y markdown
      script = script.replace(/[*_#`]/g, "").trim();

      if (!script) {
        script = "Hola, aquí tienes tu resumen semanal. Tus cuentas y turnos están sincronizados en FinanzApp. Que tengas una excelente jornada productiva.";
      }

      const utterance = new SpeechSynthesisUtterance(script);
      utterance.lang = "es-AR";
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      // Buscar voz en español si está disponible
      const voices = window.speechSynthesis.getVoices();
      const esVoice = voices.find((v) => v.lang.startsWith("es") || v.name.includes("Spanish") || v.name.includes("Sabina"));
      if (esVoice) utterance.voice = esVoice;

      utterance.onstart = () => {
        setIsPlayingAudio(true);
        setAudioSummaryLoading(false);
        toast.info("🎙️ Reproduciendo Audio Resumen Semanal...");
      };

      utterance.onend = () => {
        setIsPlayingAudio(false);
      };

      utterance.onerror = () => {
        setIsPlayingAudio(false);
        setAudioSummaryLoading(false);
      };

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch (err: any) {
      toast.error("No se pudo generar el audio resumen.");
      setAudioSummaryLoading(false);
      setIsPlayingAudio(false);
    }
  };

  return (
    <div className="relative rounded-3xl p-5 sm:p-7 bg-gradient-to-b from-neutral-900/80 to-neutral-950/80 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.08)] overflow-hidden flex flex-col h-[75dvh] sm:h-[680px]">
      {/* Glow sutil */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* Encabezado con Botón de Audio Resumen */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 stroke-[2.4]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-extrabold text-white truncate flex items-center gap-2">
              Auditor IA NotebookLM
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Gemini Flash
              </span>
            </h3>
            <p className="text-xs text-neutral-400 truncate">
              RAG conectado a tus gastos, turnos y recibo de haberes
            </p>
          </div>
        </div>

        {/* Botón Táctil: Audio Resumen Semanal */}
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handlePlayAudioSummary}
            disabled={audioSummaryLoading}
            className={`w-full sm:w-auto min-h-[48px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 shadow-md ${
              isPlayingAudio
                ? "bg-amber-500 text-black shadow-amber-500/30 animate-pulse"
                : "bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/20"
            }`}
          >
            {audioSummaryLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generando audio...</span>
              </>
            ) : isPlayingAudio ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span>Detener Audio Resumen</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                <span>🎙️ Escuchar Resumen Semanal</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Historial de Mensajes Desplazable */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 py-1">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? "bg-neutral-800 text-white border border-white/10"
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? "bg-emerald-500 text-black font-semibold rounded-tr-sm shadow-md shadow-emerald-500/10"
                    : "bg-neutral-900/90 text-neutral-200 border border-white/10 rounded-tl-sm shadow-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2.5 text-neutral-400 text-xs p-3 rounded-2xl bg-neutral-900/60 border border-white/5 w-fit">
            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
            <span>Consultando tus datos con Gemini IA...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chips Rápidos Sugeridos estilo NotebookLM */}
      <div className="pt-3 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar mask-fade-edges">
        {SUGGESTIONS.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(s)}
            className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] font-semibold text-neutral-300 hover:text-white transition-all whitespace-nowrap active:scale-95 shrink-0 cursor-pointer"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Campo de Entrada de Texto con Botón Ergonómico */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="pt-2 flex flex-col sm:flex-row gap-2.5 sm:gap-3 w-full"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregunta sobre tus gastos, turnos de trabajo, o recibo..."
          className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-neutral-900 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors shadow-inner"
        />

        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="w-full sm:w-auto min-h-[48px] px-5 py-2.5 rounded-xl bg-emerald-500 disabled:opacity-40 text-black font-extrabold text-xs uppercase tracking-wider hover:bg-emerald-400 transition-all cursor-pointer active:scale-95 shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4 stroke-[2.5]" />
          <span>Preguntar</span>
        </button>
      </form>
    </div>
  );
}
