"use client";

import { useState, useRef } from "react";
import { Send, ImagePlus, X } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string, imageBase64?: string, imageMimeType?: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("image/jpeg");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSend() {
    if ((!text.trim() && !imageBase64) || disabled) return;
    onSend(text.trim() || (imageBase64 ? "Analizá esta imagen" : ""), imageBase64 || undefined, imageMimeType || undefined);
    setText("");
    setImagePreview(null);
    setImageBase64(null);
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

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const mime = file.type || "image/jpeg";
    setImageMimeType(mime);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      // El resultado es data:image/jpeg;base64,XXXXX — quitamos el prefijo
      const base64 = result.split(",")[1];
      setImageBase64(base64);
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
    // Reset input para permitir seleccionar la misma imagen otra vez
    e.target.value = "";
  }

  function removeImage() {
    setImagePreview(null);
    setImageBase64(null);
  }

  const canSend = (text.trim() || imageBase64) && !disabled;

  return (
    <div className="space-y-2">
      {/* Preview de imagen seleccionada */}
      {imagePreview && (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePreview}
            alt="Imagen seleccionada"
            className="h-24 w-auto rounded-xl border border-white/15 object-cover shadow-md"
          />
          <button
            onClick={removeImage}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-md cursor-pointer transition-colors"
            title="Quitar imagen"
          >
            <X className="w-3 h-3 text-white" />
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
        {/* Botón subir imagen */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors mb-0.5 disabled:opacity-40 active:scale-95 cursor-pointer"
          style={{
            background: imageBase64 ? "hsl(var(--primary) / 0.25)" : "hsl(var(--muted))",
            color: imageBase64 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            border: imageBase64 ? "1px solid hsl(var(--primary) / 0.5)" : "none",
          }}
          title="Adjuntar imagen para analizar"
        >
          <ImagePlus className="w-5 h-5" />
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={imageBase64 ? "Preguntame algo sobre esta imagen..." : 'Escribí algo... Ej: "Gasté $3000 en taxi con MP"'}
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
