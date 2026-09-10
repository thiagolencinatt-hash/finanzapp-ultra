"use client";

import { Bot, User, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
        {isUser ? (
          <User className="w-4 h-4 text-black" />
        ) : (
          <div className="w-full h-full rounded-xl overflow-hidden border border-emerald-400/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ai-dollar-icon.jpg" alt="AI" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      <div className={`flex flex-col max-w-[85%] ${isUser ? "items-end" : "items-start"} gap-1`}>
        {/* Bubble */}
        <div
          className="px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm font-medium"
          style={{
            background: isUser ? "hsl(var(--primary))" : "hsl(var(--card))",
            color: isUser ? "#0a0f1e" : "hsl(var(--foreground))",
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
              {isUser ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2 space-y-1 last:mb-0" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2 space-y-1 last:mb-0" {...props} />,
                    li: ({ node, ...props }) => <li className="" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-bold text-emerald-400" {...props} />,
                    a: ({ node, ...props }) => <a className="text-emerald-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                    h1: ({ node, ...props }) => <h1 className="text-lg font-black mb-2 mt-3 text-emerald-400" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-base font-bold mb-2 mt-2 text-emerald-400" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-sm font-bold mb-1 mt-2 text-emerald-400" {...props} />,
                    table: ({ node, ...props }) => <div className="overflow-x-auto w-full mb-3 mt-1"><table className="w-full text-left border-collapse text-xs sm:text-sm" {...props} /></div>,
                    th: ({ node, ...props }) => <th className="border-b border-emerald-500/30 py-1.5 px-2 font-bold text-emerald-400" {...props} />,
                    td: ({ node, ...props }) => <td className="border-b border-white/10 py-1.5 px-2" {...props} />,
                    code: ({ node, className, children, ...props }) => {
                      const match = /language-(\w+)/.exec(className || '');
                      return !match ? (
                        <code className="bg-black/30 rounded px-1.5 py-0.5 text-emerald-300 text-xs font-mono" {...props}>{children}</code>
                      ) : (
                        <div className="bg-black/50 rounded-lg p-3 overflow-x-auto mb-2 text-xs font-mono text-emerald-200">
                          <code {...props}>{children}</code>
                        </div>
                      )
                    }
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              )}
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
          {format(message.timestamp ? new Date(message.timestamp) : (message.created_at ? new Date(message.created_at) : new Date()), "HH:mm", { locale: es })}
        </span>
      </div>
    </div>
  );
}
