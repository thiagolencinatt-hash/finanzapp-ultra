"use client";

import { X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { toast } from "sonner";

interface QRConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QRConnectModal({ isOpen, onClose }: QRConnectModalProps) {
  const [copied, setCopied] = useState(false);
  const appUrl = "https://finanzapp-ultra.vercel.app";

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    toast.success("Enlace copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-sm overflow-hidden rounded-3xl glass-strong shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
        >
          <X className="w-5 h-5 text-white" />
        </button>
        
        <div className="p-8 flex flex-col items-center text-center">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white mb-2">Conectar Móvil</h2>
            <p className="text-sm text-neutral-300">
              Escaneá este código con la cámara de tu celular para acceder a FinanzApp Ultra en cualquier momento.
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-2xl shadow-xl mb-6">
            <QRCodeSVG 
              value={appUrl}
              size={200}
              bgColor={"#ffffff"}
              fgColor={"#000000"}
              level={"Q"}
              includeMargin={false}
            />
          </div>
          
          <div className="w-full">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-black/30 border border-white/10">
              <span className="flex-1 text-sm text-white/80 truncate font-mono">{appUrl}</span>
              <button 
                onClick={handleCopy}
                className="px-4 py-2 text-xs font-bold text-black gradient-primary rounded-lg hover:brightness-110 transition-all"
              >
                {copied ? "¡Copiado!" : "Copiar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
