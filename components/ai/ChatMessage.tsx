"use client";

import { Bot, User, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isUser ? "mt-0" : ""}`}
        style={{
          background: isUser ? "hsl(var(--primary))" : "hsl(var(--card))",
          border: isUser ? "none" : "1px solid hsl(var(--border))",
        }}
      >
        {isUser
          ? <User className="w-4 h-4 text-white" />
          : <Bot className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
        }
      </div>

      <div className={`flex flex-col max-w-[85%] ${isUser ? "items-end" : "items-start"} gap-1`}>
        {/* Bubble */}
        <div
          className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
          style={{
            background: isUser ? "hsl(var(--primary))" : "hsl(var(--card))",
            color: isUser ? "white" : "hsl(var(--foreground))",
            border: isUser ? "none" : "1px solid hsl(var(--border))",
            borderBottomRightRadius: isUser ? "4px" : "16px",
            borderBottomLeftRadius: isUser ? "16px" : "4px",
          }}
        >
        {message.isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "hsl(var(--primary))" }} />
              <span style={{ color: "hsl(var(--muted-foreground))" }}>Pensando...</span>
            </div>
          ) : (
            <>
              {/* Imagen adjunta (solo en mensajes del usuario) */}
              {message.imagePreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={message.imagePreview}
                  alt="Imagen enviada"
                  className="rounded-xl max-h-48 max-w-full object-cover mb-2 shadow-md"
                />
              )}
              <p className="whitespace-pre-wrap">{message.content}</p>
            </>
          )}
        </div>

        {/* Executed actions chips */}
        {message.actions && message.actions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {message.actions.map((action, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                style={{
                  background: action.status === "success" ? "hsl(var(--income-muted))" : "hsl(var(--expense-muted))",
                  color: action.status === "success" ? "hsl(var(--income))" : "hsl(var(--expense))",
                }}
              >
                {action.status === "success"
                  ? <CheckCircle2 className="w-3 h-3" />
                  : <XCircle className="w-3 h-3" />
                }
                {action.summary}
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] px-1" style={{ color: "hsl(var(--muted-foreground))" }}>
          {format(message.timestamp, "HH:mm", { locale: es })}
        </span>
      </div>
    </div>
  );
}
