"use client";

import { useState, useRef } from "react";
import { Send, ImagePlus, X, Camera } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string, imageBase64?: string, imageMimeType?: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string>("image/jpeg");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSend() {
    if ((!text.trim() && !fileBase64) || disabled) return;
    onSend(text.trim() || (fileBase64 ? `Analizá este archivo: ${fileName || "documento"}` : ""), fileBase64 || undefined, fileMimeType || undefined);
    setText("");
    setFilePreview(null);
    setFileBase64(null);
    setFileName(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const mime = file.type || "application/octet-stream";
    setFileMimeType(mime);
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const base64 = result.split(",")[1];
      setFileBase64(base64);
      if (mime.startsWith("image/")) {
        setFilePreview(result);
      } else {
        setFilePreview(null);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function removeFile() {
    setFilePreview(null);
    setFileBase64(null);
    setFileName(null);
  }

  const canSend = (text.trim() || fileBase64) && !disabled;

  return (
    <div className="space-y-2">
      {/* Preview de archivo/imagen seleccionada */}
      {(filePreview || fileName) && (
        <div className="relative w-fit bg-zinc-900 border border-zinc-800 rounded-xl p-2 flex flex-col items-center shadow-md">
          {filePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={filePreview}
              alt="Preview"
              className="h-24 w-auto rounded-lg object-cover mb-1"
            />
          ) : (
            <div className="h-20 w-24 flex items-center justify-center bg-zinc-800 rounded-lg mb-1">
              <span className="text-xs font-bold text-emerald-400 break-words px-2 text-center">
                {fileName?.split('.').pop()?.toUpperCase()}
              </span>
            </div>
          )}
          
          <span className="text-[10px] text-zinc-400 max-w-[100px] truncate">
            {fileName || "Imagen adjunta"}
          </span>
          
          <button
            onClick={removeFile}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-md cursor-pointer transition-colors"
            title="Quitar archivo"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      )}

      <div
        className="flex items-end gap-2 rounded-2xl p-2"
        style={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
        }}
      >
        {/* Botón subir archivo desde galería/docs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf,.xlsx,.csv,.docx"
          className="hidden"
          onChange={handleFileChange}
        />
        {/* Input directo para cámara móvil */}
        <input
          id="camera-ticket-input"
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors mb-0.5 disabled:opacity-40 active:scale-95 cursor-pointer"
            style={{
              background: fileBase64 ? "hsl(var(--primary) / 0.25)" : "hsl(var(--muted))",
              color: fileBase64 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
              border: fileBase64 ? "1px solid hsl(var(--primary) / 0.5)" : "none",
            }}
            title="Adjuntar archivo o imagen"
          >
            <ImagePlus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => document.getElementById("camera-ticket-input")?.click()}
            disabled={disabled}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors mb-0.5 disabled:opacity-40 active:scale-95 cursor-pointer text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
            title="Sacar foto a ticket con la cámara"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={fileBase64 ? "Instrucciones para este archivo..." : 'Escribí algo... Ej: "Gasté $3000 en taxi"'}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent text-base sm:text-sm outline-none resize-none py-2.5 px-2.5 min-h-[42px] max-h-[120px]"
          style={{ color: "hsl(var(--foreground))" }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all mb-0.5 disabled:opacity-40 active:scale-95 cursor-pointer shadow-md"
          style={{
            background: canSend ? "hsl(var(--primary))" : "hsl(var(--muted))",
            color: canSend ? "#0a0f1e" : "hsl(var(--muted-foreground))",
          }}
        >
          <Send className="w-4 h-4 font-bold stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
