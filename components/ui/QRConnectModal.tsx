"use client";

import { X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface QRConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QRConnectModal({ isOpen, onClose }: QRConnectModalProps) {
  const [copied, setCopied] = useState(false);
  const [syncUrl, setSyncUrl] = useState("https://finanzapp-ultra.vercel.app");
  const [userIdShort, setUserIdShort] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    try {
      let uid = "";
      let email = "";
      const stored = localStorage.getItem("finanzapp_user_profile");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.id) uid = parsed.id;
        if (parsed.email) email = parsed.email;
      }
      if (!uid) {
        const matchId = document.cookie.match(/finance_user_id=([^;]+)/);
        if (matchId && matchId[1]) uid = decodeURIComponent(matchId[1]);
      }
      if (!email) {
        const matchEmail = document.cookie.match(/finance_user_email=([^;]+)/);
        if (matchEmail && matchEmail[1]) email = decodeURIComponent(matchEmail[1]);
      }

      if (uid) {
        setUserIdShort(uid.substring(0, 8));
        const url = `https://finanzapp-ultra.vercel.app/login?sync_uid=${encodeURIComponent(uid)}${email ? `&sync_email=${encodeURIComponent(email)}` : ""}`;
        setSyncUrl(url);
      } else {
        setSyncUrl("https://finanzapp-ultra.vercel.app");
      }
    } catch {
      setSyncUrl("https://finanzapp-ultra.vercel.app");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(syncUrl);
    setCopied(true);
    toast.success("Enlace de sincronización copiado");
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
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10 cursor-pointer"
        >
          <X className="w-5 h-5 text-white" />
        </button>
        
        <div className="p-8 flex flex-col items-center text-center">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white mb-2">Conectar Móvil</h2>
            <p className="text-sm text-neutral-300">
              Escaneá este código con tu celular para sincronizar al instante tu cuenta en tiempo real.
            </p>
            {userIdShort && (
              <span className="inline-block mt-2 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Sincronizando cuenta: {userIdShort}...
              </span>
            )}
          </div>
          
          <div className="bg-white p-4 rounded-2xl shadow-xl mb-6">
            <QRCodeSVG 
              value={syncUrl}
              size={200}
              bgColor={"#ffffff"}
              fgColor={"#000000"}
              level={"Q"}
              includeMargin={false}
            />
          </div>
          
          <div className="w-full">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-black/30 border border-white/10">
              <span className="flex-1 text-xs text-white/80 truncate font-mono">{syncUrl}</span>
              <button 
                onClick={handleCopy}
                className="px-3 py-1.5 text-xs font-bold text-black gradient-primary rounded-lg hover:brightness-110 transition-all cursor-pointer flex-shrink-0"
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
